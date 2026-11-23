/**
 * Content for the About, Owners and For businesses pages. All copy comes from Sanity documents;
 * these loaders only fetch it and shape what the templates need.
 */
import { getSanityClient } from '~/lib/sanity/client';
import {
  ABOUT_PAGE_QUERY,
  AREAS_QUERY,
  FOR_BUSINESSES_QUERY,
  OWNERS_PAGE_QUERY,
  OWNER_STORIES_QUERY,
  PREFILL_BUSINESS_QUERY,
} from '~/lib/sanity/queries';
import { resolveContentImage, type SanityImageFields } from '~/lib/sanity/image';
import { fillTemplate } from '~/lib/business-page';

const imageUrl = (image?: SanityImageFields | null, width?: number, height?: number) =>
  resolveContentImage(image, width ? { width, height } : undefined)?.src ?? '';

function missing(id: string, seed = 'seed:pages'): Error {
  return new Error(
    `The "${id}" document is missing or has no title. Create and publish it in the Studio, or run \`npm run ${seed}\`.`
  );
}

/** Split text into paragraphs on blank lines. */
export function paragraphs(value?: string | null): string[] {
  return (value ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** A URL-safe anchor for a heading, e.g. "How ownership is labeled" -> "how-ownership-is-labeled". */
export function anchorFor(title: string, index: number): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʻ'’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `section-${index + 1}`;
}

// ---------- About ----------
export type LabelTone = 'local' | 'franchise' | 'plain';

export interface AboutSection {
  id: string;
  title: string;
  paragraphs: string[];
  labels: { label: string; tone: LabelTone; description: string }[];
  note: string;
}

export interface AboutPageContent {
  seo: { title: string; description?: string };
  eyebrow?: string;
  title: string;
  lede?: string;
  tocTitle?: string;
  sections: AboutSection[];
}

interface RawAbout {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  tocTitle?: string;
  sections?: {
    _key: string;
    title?: string;
    body?: string;
    note?: string;
    labels?: { _key: string; label?: string; tone?: string; description?: string }[];
  }[];
}

export function buildAboutPage(raw: RawAbout): AboutPageContent {
  const used = new Set<string>();
  const sections: AboutSection[] = (raw.sections ?? [])
    .filter((section) => section.title)
    .map((section, index) => {
      let id = anchorFor(section.title!, index);
      while (used.has(id)) id = `${id}-${index + 1}`;
      used.add(id);
      return {
        id,
        title: section.title!,
        paragraphs: paragraphs(section.body),
        labels: (section.labels ?? [])
          .filter((label) => label.label)
          .map((label) => ({
            label: label.label!,
            tone: label.tone === 'local' || label.tone === 'franchise' ? label.tone : 'plain',
            description: label.description ?? '',
          })),
        note: section.note ?? '',
      };
    });
  return {
    seo: { title: raw.seoTitle ?? raw.title ?? '', description: raw.seoDescription },
    eyebrow: raw.eyebrow,
    title: raw.title ?? '',
    lede: raw.lede,
    tocTitle: raw.tocTitle,
    sections,
  };
}

export async function loadAboutPage(): Promise<AboutPageContent> {
  const raw = await getSanityClient().fetch<RawAbout | null>(ABOUT_PAGE_QUERY);
  if (!raw?.title) throw missing('aboutPage');
  return buildAboutPage(raw);
}

// ---------- Owners ----------
interface RawOwners {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  viewListingLabel?: string;
  sinceTemplate?: string;
  emptyTitle?: string;
  emptyBody?: string;
}

interface RawStory {
  _id: string;
  quote?: string;
  ownerName?: string;
  businessLine?: string;
  since?: number;
  photo?: SanityImageFields | null;
  business?: { name?: string; slug?: string; area?: string; listed?: boolean } | null;
}

export interface OwnerStoryCard {
  id: string;
  quote: string;
  ownerName: string;
  line: string;
  photo: string;
  href: string;
}

export interface OwnersPageContent {
  seo: { title: string; description?: string };
  eyebrow?: string;
  title: string;
  lede?: string;
  viewListingLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
  stories: OwnerStoryCard[];
}

export function buildOwnersPage(raw: RawOwners, stories: RawStory[]): OwnersPageContent {
  const cards: OwnerStoryCard[] = stories
    .filter((story) => story.quote && story.ownerName)
    .map((story) => {
      const business = story.business && story.business.listed !== false ? story.business : undefined;
      const place = business ? [business.name, business.area].filter(Boolean).join(', ') : (story.businessLine ?? '');
      const since =
        story.since && raw.sinceTemplate ? fillTemplate(raw.sinceTemplate, { year: String(story.since) }) : '';
      return {
        id: story._id,
        quote: story.quote!,
        ownerName: story.ownerName!,
        line: [place, since].filter(Boolean).join(' · '),
        photo: imageUrl(story.photo, 640, 320),
        href: business?.slug ? `/business/${business.slug}/` : '',
      };
    });
  return {
    seo: { title: raw.seoTitle ?? raw.title ?? '', description: raw.seoDescription },
    eyebrow: raw.eyebrow,
    title: raw.title ?? '',
    lede: raw.lede,
    viewListingLabel: raw.viewListingLabel,
    emptyTitle: raw.emptyTitle,
    emptyBody: raw.emptyBody,
    stories: cards,
  };
}

export async function loadOwnersPage(): Promise<OwnersPageContent> {
  const client = getSanityClient();
  const [raw, stories] = await Promise.all([
    client.fetch<RawOwners | null>(OWNERS_PAGE_QUERY),
    client.fetch<RawStory[]>(OWNER_STORIES_QUERY),
  ]);
  if (!raw?.title) throw missing('ownersPage');
  return buildOwnersPage(raw, stories);
}

// ---------- For businesses ----------
interface RawForBusinesses {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  heroImages?: (SanityImageFields | null)[];
  heroCaption?: string;
  formTitle?: string;
  businessNameLabel?: string;
  townLabel?: string;
  townPlaceholder?: string;
  roleLabel?: string;
  roles?: string[];
  emailLabel?: string;
  ownershipLabel?: string;
  ownershipPlaceholder?: string;
  confirmText?: string;
  submitLabel?: string;
  sendingLabel?: string;
  successTitle?: string;
  successBody?: string;
  errorMessage?: string;
  invalidMessage?: string;
  nextTitle?: string;
  nextSteps?: string[];
}

export interface ForBusinessesContent {
  seo: { title: string; description?: string };
  eyebrow?: string;
  title: string;
  lede?: string;
  heroImages: string[];
  heroCaption?: string;
  form: Omit<
    RawForBusinesses,
    | 'seoTitle'
    | 'seoDescription'
    | 'eyebrow'
    | 'title'
    | 'lede'
    | 'heroImages'
    | 'heroCaption'
    | 'nextTitle'
    | 'nextSteps'
  > & { towns: string[]; roles: string[]; prefill: { name: string; town: string } };
  nextTitle?: string;
  nextSteps: string[];
}

export async function loadForBusinessesPage(prefillSlug?: string | null): Promise<ForBusinessesContent> {
  const client = getSanityClient();
  const [raw, areas, prefill] = await Promise.all([
    client.fetch<RawForBusinesses | null>(FOR_BUSINESSES_QUERY),
    client.fetch<{ title: string }[]>(AREAS_QUERY),
    prefillSlug
      ? client.fetch<{ name?: string; town?: string } | null>(PREFILL_BUSINESS_QUERY, { slug: prefillSlug })
      : Promise.resolve(null),
  ]);
  if (!raw?.title) throw missing('forBusinessesPage');

  const {
    seoTitle,
    seoDescription,
    eyebrow,
    title,
    lede,
    heroImages,
    heroCaption,
    nextTitle,
    nextSteps,
    roles,
    ...form
  } = raw;

  return {
    seo: { title: seoTitle ?? title, description: seoDescription },
    eyebrow,
    title,
    lede,
    heroImages: (heroImages ?? []).map((image) => imageUrl(image, 720, 560)).filter(Boolean),
    heroCaption,
    form: {
      ...form,
      roles: roles ?? [],
      towns: areas.map((area) => area.title),
      prefill: { name: prefill?.name ?? '', town: prefill?.town ?? '' },
    },
    nextTitle,
    nextSteps: nextSteps ?? [],
  };
}
