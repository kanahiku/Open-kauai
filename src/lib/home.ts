/**
 * Home page content, read from Sanity: the `homePage` document plus live listings.
 * Nothing here is hard-coded copy. Missing optional fields simply hide their block.
 */
import type { ImageMetadata } from 'astro';
import { getSanityClient } from '~/lib/sanity/client';
import { resolveContentImage, type SanityImageFields } from '~/lib/sanity/image';
import { HOME_PAGE_QUERY, SECTION_KEYS, SECTION_LISTINGS_QUERY, type SectionKey } from '~/lib/sanity/queries';
import { getListingStatus, type HoursKind, type OpeningWindow } from '~/lib/hours';
import { SECTION_ICONS } from '~/lib/sections';
import { MAP_FRAME, projectToFrame } from '~/lib/map';

// ---------- Sanity shapes ----------
export interface RawBusiness {
  _id: string;
  name?: string | null;
  slug?: string | null;
  kind?: string | null;
  ownership?: 'local' | 'franchise' | null;
  priceLevel?: string | null;
  knownFor?: string | null;
  photo?: SanityImageFields | null;
  openingHours?: OpeningWindow[] | null;
  hoursConfirmedAt?: string | null;
  hoursKind?: HoursKind | null;
  temporarilyClosed?: boolean | null;
  reopeningDate?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface RawSection {
  section: SectionKey;
  tabLabel?: string;
  tabOrder?: number;
  tileTitle?: string;
  tileImage?: SanityImageFields | null;
  countNoun?: string;
  comingSoonLabel?: string;
  shelfEyebrow?: string;
  shelfTitle?: string;
}

interface RawHomePage {
  seoTitle?: string;
  seoDescription?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroLede?: string;
  heroImage?: SanityImageFields | null;
  searchPlaceholder?: string;
  searchLocationLabel?: string;
  searchButtonLabel?: string;
  heroActiveSection?: SectionKey;
  startTitle?: string;
  seeAllLabel?: string;
  sections?: RawSection[];
  madeHereEyebrow?: string;
  madeHereTitle?: string;
  madeHereBody?: string;
  madeHereCta?: { label?: string; href?: string };
  madeHereBusinesses?: (RawBusiness | null)[];
  madeHereSelected?: RawBusiness | null;
  madeHerePins?: ({ _id: string; lat?: number | null; lng?: number | null } | null)[];
}

type RawListings = Record<SectionKey, { count: number; shelf: RawBusiness[] }>;

// ---------- Output shapes ----------
export interface ListingCardData {
  name: string;
  href: string;
  /** Sanity CDN URL, or empty when the business has no photo. */
  photo: string;
  open: boolean;
  statusLabel: string;
  /** Unset when unknown: no ownership tag is shown. */
  ownership?: 'local' | 'franchise';
  meta: string;
  price: string;
  knownFor: string;
}

export interface ShelfData {
  id: string;
  eyebrow: string;
  title: string;
  icon: ImageMetadata;
  seeAllHref: string;
  items: ListingCardData[];
}

export interface HomeTab {
  label: string;
  href: string;
  icon: ImageMetadata;
  active: boolean;
}

export interface HomeTile {
  title: string;
  count: string;
  href: string;
  image: string;
}

export interface MapPin {
  /** Top-left corner in the map frame (px). */
  x: number;
  y: number;
  size: 18 | 30;
  selected: boolean;
}

export interface MadeHereData {
  eyebrow?: string;
  title?: string;
  body?: string;
  cta?: { label: string; href: string };
  rows: { name: string; href: string; photo: string; line: string }[];
  pins: MapPin[];
  popover?: {
    name: string;
    href: string;
    meta: string;
    photo: string;
    statusLabel: string;
    open: boolean;
    x: number;
    y: number;
    width: number;
  };
  label?: { text: string; x: number; y: number };
}

export interface HomeContent {
  seo: { title?: string; description?: string };
  hero: {
    eyebrow?: string;
    title: string;
    lede?: string;
    image: string;
    searchPlaceholder?: string;
    searchLocationLabel?: string;
    searchButtonLabel?: string;
    tabs: HomeTab[];
  };
  startTitle?: string;
  seeAllLabel?: string;
  tiles: HomeTile[];
  shelves: ShelfData[];
  madeHere?: MadeHereData;
}

// ---------- mapping ----------
const imageUrl = (image?: SanityImageFields | null) => resolveContentImage(image)?.src ?? '';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function toCard(business: RawBusiness, now: Date): ListingCardData | undefined {
  if (!business.name || !business.slug) return undefined;
  const status = getListingStatus(business.openingHours, business.hoursConfirmedAt, now, {
    temporarilyClosed: business.temporarilyClosed,
    reopeningDate: business.reopeningDate,
    hoursKind: business.hoursKind,
  });
  return {
    name: business.name,
    href: `/business/${business.slug}/`,
    photo: imageUrl(business.photo),
    open: status.open,
    statusLabel: status.label,
    ownership: business.ownership === 'local' || business.ownership === 'franchise' ? business.ownership : undefined,
    meta: [business.area, business.kind].filter(Boolean).join(' · '),
    price: business.priceLevel ?? '',
    knownFor: business.knownFor ?? '',
  };
}

const POPOVER = { width: 300, height: 96, gap: 10, margin: 8 } as const;

const SHELF_SIZE = 4;

/**
 * The first `limit` cards, taking ones with a photo not yet used before any repeat, so a shelf never
 * shows the same picture twice while the directory has other photos to offer.
 */
function pickVaried(cards: ListingCardData[], limit: number): ListingCardData[] {
  const seen = new Set<string>();
  const fresh: ListingCardData[] = [];
  const repeats: ListingCardData[] = [];
  for (const card of cards) {
    if (card.photo && !seen.has(card.photo)) {
      seen.add(card.photo);
      fresh.push(card);
    } else {
      repeats.push(card);
    }
  }
  return [...fresh, ...repeats].slice(0, limit);
}

function buildMadeHere(page: RawHomePage, now: Date): MadeHereData | undefined {
  const rows = (page.madeHereBusinesses ?? [])
    .filter((b): b is RawBusiness => Boolean(b?.name && b.slug))
    .map((b) => ({
      name: b.name!,
      href: `/business/${b.slug}/`,
      photo: imageUrl(b.photo),
      line: b.knownFor ? `known for ${b.knownFor}` : (b.area ?? ''),
    }));

  const selected = page.madeHereSelected;
  const selectedCard = selected ? toCard(selected, now) : undefined;
  const hasSelectedPoint = Number.isFinite(selected?.lat) && Number.isFinite(selected?.lng);

  const { width, height } = MAP_FRAME;
  const pins: MapPin[] = [];
  for (const pin of page.madeHerePins ?? []) {
    if (!pin || pin._id === selected?._id || !Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
    const { x, y } = projectToFrame(pin.lat!, pin.lng!);
    pins.push({ x: x - 9, y: y - 9, size: 18, selected: false });
  }

  let popover: MadeHereData['popover'];
  let label: MadeHereData['label'];
  if (selected && selectedCard && hasSelectedPoint) {
    const center = projectToFrame(selected.lat!, selected.lng!);
    pins.push({ x: center.x - 15, y: center.y - 15, size: 30, selected: true });

    const left = clamp(center.x - POPOVER.width / 2, POPOVER.margin, width - POPOVER.width - POPOVER.margin);
    let top = center.y + 15 + POPOVER.gap;
    const below = top + POPOVER.height <= height - POPOVER.margin;
    if (!below) top = center.y - 15 - POPOVER.gap - POPOVER.height;

    popover = {
      name: selectedCard.name,
      href: selectedCard.href,
      meta: selectedCard.meta,
      photo: selectedCard.photo,
      statusLabel: selectedCard.statusLabel,
      open: selectedCard.open,
      x: left,
      y: top,
      width: POPOVER.width,
    };
    if (below && selected.area)
      label = { text: selected.area, x: Math.max(4, center.x - 24), y: Math.max(4, center.y - 15 - 22) };
  }

  if (rows.length === 0 && pins.length === 0) return undefined;

  const cta =
    page.madeHereCta?.label && page.madeHereCta.href
      ? { label: page.madeHereCta.label, href: page.madeHereCta.href }
      : undefined;
  return {
    eyebrow: page.madeHereEyebrow,
    title: page.madeHereTitle,
    body: page.madeHereBody,
    cta,
    rows,
    pins,
    popover,
    label,
  };
}

/** Pure mapping from Sanity data to home content. */
export function buildHomeContent(page: RawHomePage, listings: RawListings, now: Date = new Date()): HomeContent {
  const sections = (page.sections ?? []).filter((s) => SECTION_KEYS.includes(s.section));

  const tabs: HomeTab[] = sections
    .map((s, index) => ({ s, index }))
    .sort((a, b) => (a.s.tabOrder ?? 99) - (b.s.tabOrder ?? 99) || a.index - b.index)
    .map(({ s }) => ({
      label: s.tabLabel ?? s.tileTitle ?? s.section,
      href: `/${s.section}/`,
      icon: SECTION_ICONS[s.section].tab,
      active: s.section === page.heroActiveSection,
    }));

  const tiles: HomeTile[] = sections.map((s) => {
    const count = listings[s.section]?.count ?? 0;
    return {
      title: s.tileTitle ?? s.tabLabel ?? s.section,
      count: count > 0 ? [count, s.countNoun].filter(Boolean).join(' ') : (s.comingSoonLabel ?? ''),
      href: `/${s.section}/`,
      image: imageUrl(s.tileImage),
    };
  });

  const shelves: ShelfData[] = [];
  for (const s of sections) {
    const items = pickVaried(
      (listings[s.section]?.shelf ?? [])
        .map((business) => toCard(business, now))
        .filter((card): card is ListingCardData => card !== undefined),
      SHELF_SIZE
    );
    if (items.length === 0) continue;
    shelves.push({
      id: s.section,
      eyebrow: s.shelfEyebrow ?? '',
      title: s.shelfTitle ?? s.tileTitle ?? s.section,
      icon: SECTION_ICONS[s.section].shelf,
      seeAllHref: `/${s.section}/`,
      items,
    });
  }

  return {
    seo: { title: page.seoTitle, description: page.seoDescription },
    hero: {
      eyebrow: page.heroEyebrow,
      title: page.heroTitle ?? '',
      lede: page.heroLede,
      image: imageUrl(page.heroImage),
      searchPlaceholder: page.searchPlaceholder,
      searchLocationLabel: page.searchLocationLabel,
      searchButtonLabel: page.searchButtonLabel,
      tabs,
    },
    startTitle: page.startTitle,
    seeAllLabel: page.seeAllLabel,
    tiles,
    shelves,
    madeHere: buildMadeHere(page, now),
  };
}

export async function loadHomeContent(now: Date = new Date()): Promise<HomeContent> {
  const client = getSanityClient();
  const [page, listings] = await Promise.all([
    client.fetch<RawHomePage | null>(HOME_PAGE_QUERY),
    client.fetch<RawListings>(SECTION_LISTINGS_QUERY),
  ]);
  if (!page) {
    throw new Error(
      'The "homePage" document is missing. Create and publish it in the Studio, or run `npm run seed:site`.'
    );
  }
  return buildHomeContent(page, listings, now);
}
