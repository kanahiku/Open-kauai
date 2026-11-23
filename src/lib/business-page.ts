/**
 * Content for one business page (/business/<slug>/): the `businessPage` copy, the matching
 * `sectionPage` copy for the breadcrumb and labels, the listing itself, and nearby listings.
 * Anything the listing does not have (photos, tags, offerings, ...) is simply left out.
 */
import { getSanityClient } from '~/lib/sanity/client';
import { resolveContentImage, type SanityImageFields } from '~/lib/sanity/image';
import {
  BUSINESS_DETAIL_QUERY,
  BUSINESS_PAGE_QUERY,
  NEARBY_QUERY,
  SECTION_PAGE_QUERY,
  SECTION_KEYS,
  type SectionKey,
} from '~/lib/sanity/queries';
import { getListingStatus, getTodayHours, type HoursKind, type OpeningWindow } from '~/lib/hours';
import { toCard, type ListingCardData, type RawBusiness } from '~/lib/home';
import { MAP_FRAME, projectToFrame } from '~/lib/map';
import type { SectionCopy } from '~/lib/section-page';

export interface BusinessCopy {
  seoTitleTemplate?: string;
  seoDescriptionTemplate?: string;
  knownForCaption?: string;
  mentionTitle?: string;
  aboutTitle?: string;
  goodToKnowTitle?: string;
  openHeading?: string;
  closedHeading?: string;
  confirmHeading?: string;
  todayTemplate?: string;
  hoursNoteTitle?: string;
  callLabel?: string;
  websiteLabel?: string;
  directionsLabel?: string;
  nearbyTitle?: string;
  nearbyFallbackTitle?: string;
}

interface RawBusinessDetail {
  _id: string;
  name?: string | null;
  slug?: string | null;
  kind?: string | null;
  ownership?: 'local' | 'franchise' | null;
  priceLevel?: string | null;
  knownFor?: string | null;
  description?: string | null;
  photo?: SanityImageFields | null;
  gallery?: (SanityImageFields | null)[] | null;
  mentions?: (string | null)[] | null;
  offerings?: ({ title?: string | null; note?: string | null } | null)[] | null;
  goodToKnow?: ({ title?: string | null; note?: string | null } | null)[] | null;
  bookingUrl?: string | null;
  openingHours?: OpeningWindow[] | null;
  hoursNote?: string | null;
  hoursConfirmedAt?: string | null;
  hoursKind?: HoursKind | null;
  temporarilyClosed?: boolean | null;
  reopeningDate?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  lat?: number | null;
  lng?: number | null;
  section?: string | null;
  categoryTitle?: string | null;
  area?: string | null;
}

export interface Fact {
  title: string;
  note: string;
}

export interface BusinessPageContent {
  copy: BusinessCopy;
  /** Present only for the three main sections. */
  section?: { key: SectionKey; href: string; copy: SectionCopy };
  name: string;
  slug: string;
  area: string;
  meta: string;
  ownership?: 'local' | 'franchise';
  knownFor: string;
  description: string;
  mentions: string[];
  offerings: Fact[];
  goodToKnow: Fact[];
  photos: { src: string; alt: string }[];
  status: { open: boolean; label: string; needsConfirmation: boolean; noSchedule?: boolean };
  /** Heading for the hours card, from the copy. */
  hoursHeading: string;
  todayHours: string;
  hoursNote: string;
  actions: {
    bookingUrl?: string;
    phone?: { label: string; href: string };
    website?: string;
    directions?: string;
  };
  miniMap?: { x: number; y: number; width: number; height: number };
  address: string;
  nearby: ListingCardData[];
  nearbyTitle: string;
  seo: { title: string; description: string; image?: string };
  schema: Record<string, unknown>;
}

// ---------- small helpers ----------
const clean = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

/** Only http(s) links are used for buttons. Anything else is dropped. */
export function safeUrl(value?: string | null): string | undefined {
  const text = clean(value);
  if (!text) return undefined;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** "8087427588" -> "(808) 742-7588". Other formats are shown as written. */
export function formatPhone(value?: string | null): { label: string; href: string } | undefined {
  const text = clean(value);
  const digits = text.replace(/\D/g, '');
  if (digits.length < 7) return undefined;
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  const label =
    national.length === 10 ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}` : text;
  return { label, href: `tel:${text.startsWith('+') ? '+' : ''}${digits}` };
}

/** Fill {tokens}, then tidy separators left behind by an empty token. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
    .replace(/\s+([·,–-])\s*$/u, '')
    .replace(/^\s*[·,–-]\s+/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** The "Known for" line reads as a sentence: capital letter is added in CSS, the full stop here. */
function asSentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

const SCHEMA_DAYS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function excerpt(text: string, max = 158): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

const toFacts = (list?: ({ title?: string | null; note?: string | null } | null)[] | null): Fact[] =>
  (list ?? [])
    .filter((entry): entry is { title: string; note?: string | null } => Boolean(entry?.title?.trim()))
    .map((entry) => ({ title: entry.title.trim(), note: clean(entry.note) }));

// ---------- builder ----------
export function buildBusinessPage(input: {
  business: RawBusinessDetail;
  copy: BusinessCopy;
  sectionCopy?: SectionCopy | null;
  nearby: (RawBusiness & { lat?: number | null; lng?: number | null })[];
  origin: string;
  now: Date;
}): BusinessPageContent {
  const { business, copy, sectionCopy, nearby, origin, now } = input;
  const name = clean(business.name);
  const slug = clean(business.slug);
  const area = clean(business.area);

  const key = SECTION_KEYS.find((candidate) => candidate === business.section);
  const section = key && sectionCopy ? { key, href: `/${key}/`, copy: sectionCopy } : undefined;

  const status = getListingStatus(business.openingHours, business.hoursConfirmedAt, now, {
    temporarilyClosed: business.temporarilyClosed,
    reopeningDate: business.reopeningDate,
    hoursKind: business.hoursKind,
  });
  const hoursHeading = status.noSchedule
    ? ''
    : status.needsConfirmation
      ? (copy.confirmHeading ?? '')
      : status.open
        ? (copy.openHeading ?? '')
        : (copy.closedHeading ?? '');
  const todayText =
    status.needsConfirmation || status.noSchedule ? undefined : getTodayHours(business.openingHours, now);
  const todayHours = todayText && copy.todayTemplate ? copy.todayTemplate.replace('{hours}', todayText) : '';

  const photos = [business.photo, ...(business.gallery ?? [])]
    .map((image, index) =>
      resolveContentImage(image, index === 0 ? { width: 1200, height: 888 } : { width: 600, height: 444 })
    )
    .filter((image): image is { src: string; alt: string } => Boolean(image?.src));

  const hasPoint = Number.isFinite(business.lat) && Number.isFinite(business.lng);
  const address = clean(business.address);
  const directions = hasPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`
    : address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${name} ${address}`)}`
      : undefined;

  const miniMap = hasPoint
    ? { ...projectToFrame(business.lat!, business.lng!, MAP_FRAME), width: MAP_FRAME.width, height: MAP_FRAME.height }
    : undefined;

  const phone = formatPhone(business.phone);
  const website = safeUrl(business.website);
  const bookingUrl = safeUrl(business.bookingUrl);

  // Nearest first.
  const nearbyCards = nearby
    .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng))
    .map((entry) => ({
      entry,
      distance: hasPoint ? (entry.lat! - business.lat!) ** 2 + (entry.lng! - business.lng!) ** 2 : 0,
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ entry }) => toCard(entry, now))
    .filter((card): card is ListingCardData => card !== undefined)
    .slice(0, 3);

  const meta = [area, clean(business.kind) || clean(business.categoryTitle), clean(business.priceLevel)]
    .filter(Boolean)
    .join(' · ');

  const description = clean(business.description);
  const seoTitle = copy.seoTitleTemplate ? fillTemplate(copy.seoTitleTemplate, { name, area }) : name;
  const seoDescription = description
    ? excerpt(description)
    : copy.seoDescriptionTemplate
      ? fillTemplate(copy.seoDescriptionTemplate, { name, area })
      : '';

  const url = `${origin}/business/${slug}/`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name,
    url,
    ...(seoDescription ? { description: seoDescription } : {}),
    ...(photos[0] ? { image: photos.map((photo) => photo.src) } : {}),
    ...(phone ? { telephone: phone.href.replace('tel:', '') } : {}),
    ...(address
      ? { address: { '@type': 'PostalAddress', streetAddress: address, addressRegion: 'HI', addressCountry: 'US' } }
      : {}),
    ...(hasPoint ? { geo: { '@type': 'GeoCoordinates', latitude: business.lat, longitude: business.lng } } : {}),
    ...(website ? { sameAs: [website] } : {}),
    ...(business.priceLevel ? { priceRange: business.priceLevel } : {}),
  };
  const specs = (business.openingHours ?? [])
    .filter((window) => window.opens && window.closes && window.days?.length)
    .map((window) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: window.days!.map((day) => SCHEMA_DAYS[day]).filter(Boolean),
      opens: window.opens,
      closes: window.closes,
    }));
  if (specs.length > 0) schema.openingHoursSpecification = specs;

  return {
    copy,
    section,
    name,
    slug,
    area,
    meta,
    ownership: business.ownership === 'local' || business.ownership === 'franchise' ? business.ownership : undefined,
    knownFor: business.knownFor?.trim() ? asSentence(business.knownFor.trim()) : '',
    description,
    mentions: (business.mentions ?? []).map(clean).filter(Boolean),
    offerings: toFacts(business.offerings),
    goodToKnow: toFacts(business.goodToKnow),
    photos,
    status,
    hoursHeading,
    todayHours,
    hoursNote: clean(business.hoursNote),
    actions: { bookingUrl, phone, website, directions },
    miniMap,
    address,
    nearby: nearbyCards,
    nearbyTitle: area
      ? fillTemplate(copy.nearbyTitle ?? '', { area }) || (copy.nearbyFallbackTitle ?? '')
      : (copy.nearbyFallbackTitle ?? ''),
    seo: { title: seoTitle, description: seoDescription, image: photos[0]?.src },
    schema,
  };
}

/** Returns undefined when there is no listed business with this slug. */
export async function loadBusinessPage(
  slug: string,
  origin: string,
  now: Date = new Date()
): Promise<BusinessPageContent | undefined> {
  const client = getSanityClient();
  const business = await client.fetch<RawBusinessDetail | null>(BUSINESS_DETAIL_QUERY, { slug });
  if (!business?.name || !business.slug) return undefined;

  const hasPoint = Number.isFinite(business.lat) && Number.isFinite(business.lng);
  const fetchNearby = (span: number) =>
    client.fetch<(RawBusiness & { lat?: number | null; lng?: number | null })[]>(NEARBY_QUERY, {
      id: business._id,
      lat: business.lat,
      lng: business.lng,
      span,
    });
  const [copy, sectionCopy, nearby] = await Promise.all([
    client.fetch<BusinessCopy | null>(BUSINESS_PAGE_QUERY),
    business.section && SECTION_KEYS.includes(business.section as SectionKey)
      ? client.fetch<SectionCopy | null>(SECTION_PAGE_QUERY, { id: `sectionPage-${business.section}` })
      : Promise.resolve(null),
    // About 6 km around the listing. In sparse areas, fall back to the whole island.
    hasPoint ? fetchNearby(0.06).then((near) => (near.length >= 3 ? near : fetchNearby(0.5))) : Promise.resolve([]),
  ]);
  if (!copy) {
    throw new Error(
      'The "businessPage" document is missing. Create and publish it in the Studio, or run `npm run seed:directory`.'
    );
  }
  return buildBusinessPage({ business, copy, sectionCopy, nearby, origin, now });
}
