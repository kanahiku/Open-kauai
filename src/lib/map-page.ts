/**
 * Map page content: the `mapPage` document plus every listed business with coordinates.
 * Positions and open/closed status are worked out here, so the browser only filters, pans and draws.
 */
import { getSanityClient } from '~/lib/sanity/client';
import { resolveContentImage, type SanityImageFields } from '~/lib/sanity/image';
import { MAP_BUSINESSES_QUERY, MAP_PAGE_QUERY } from '~/lib/sanity/queries';
import { getListingStatus, type HoursKind, type OpeningWindow } from '~/lib/hours';
import { MAP_VIEW_FRAME, projectToFrame } from '~/lib/map';

export interface MapPageCopy {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow?: string;
  countNoun?: string;
  title: string;
  listToggleLabel?: string;
  mapToggleLabel?: string;
  listToggleHref?: string;
  openNowLabel?: string;
  typeLabel?: string;
  areaLabel?: string;
  priceLabel?: string;
  locallyOwnedLabel?: string;
  localFranchiseLabel?: string;
  anyLabel?: string;
  resultsTemplate?: string;
  emptyTitle?: string;
  emptyBody?: string;
  viewListingLabel?: string;
  knownForPrefix?: string;
  listButtonLabel?: string;
  mapButtonLabel?: string;
  loadingLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  regionLabels?: { text: string; lat: number; lng: number }[];
}

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
  lat: number;
  lng: number;
  section?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryTitle?: string | null;
  categoryOrder?: number | null;
  areaId?: string | null;
  areaSlug?: string | null;
  areaTitle?: string | null;
}

/** One place on the map. Short keys keep the JSON that ships to the browser small. */
export interface MapItem {
  id: string;
  name: string;
  href: string;
  /** Category id. */
  c: string;
  /** Area id, or empty. */
  a: string;
  /** Price level, or empty. */
  p: string;
  knownFor: string;
  meta: string;
  open: boolean;
  status: string;
  ownership: 'local' | 'franchise' | '';
  /** Sanity image URL without a size, or empty. */
  photo: string;
  /** Position in the map frame. */
  x: number;
  y: number;
}

export interface FilterOption {
  id: string;
  slug: string;
  label: string;
}

export interface MapPageContent {
  copy: MapPageCopy;
  items: MapItem[];
  types: FilterOption[];
  areas: FilterOption[];
  prices: FilterOption[];
  hasLocallyOwned: boolean;
  regions: { text: string; x: number; y: number }[];
}

const SECTION_ORDER = ['dining', 'stay', 'activities', 'more'];
const sectionRank = (section?: string | null) => {
  const index = SECTION_ORDER.indexOf(section ?? 'more');
  return index === -1 ? SECTION_ORDER.length : index;
};

export function buildMapPage(copy: MapPageCopy, businesses: RawBusiness[], now: Date = new Date()): MapPageContent {
  const types = new Map<string, FilterOption & { rank: number; order: number }>();
  const areas = new Map<string, FilterOption>();
  const prices = new Set<string>();
  const items: MapItem[] = [];

  for (const business of businesses) {
    if (!business.name || !business.slug) continue;

    const status = getListingStatus(business.openingHours, business.hoursConfirmedAt, now, {
      temporarilyClosed: business.temporarilyClosed,
      reopeningDate: business.reopeningDate,
      hoursKind: business.hoursKind,
    });
    const { x, y } = projectToFrame(business.lat, business.lng, MAP_VIEW_FRAME);
    const price = business.priceLevel ?? '';

    if (business.categoryId && business.categoryTitle) {
      types.set(business.categoryId, {
        id: business.categoryId,
        slug: business.categorySlug ?? '',
        label: business.categoryTitle,
        rank: sectionRank(business.section),
        order: business.categoryOrder ?? 99,
      });
    }
    if (business.areaId && business.areaTitle) {
      areas.set(business.areaId, { id: business.areaId, slug: business.areaSlug ?? '', label: business.areaTitle });
    }
    if (price) prices.add(price);

    items.push({
      id: business._id,
      name: business.name,
      href: `/business/${business.slug}/`,
      c: business.categoryId ?? '',
      a: business.areaId ?? '',
      p: price,
      knownFor: business.knownFor ?? '',
      meta: [business.areaTitle, business.kind ?? business.categoryTitle, price].filter(Boolean).join(' · '),
      open: status.open,
      status: status.label,
      ownership: business.ownership === 'local' || business.ownership === 'franchise' ? business.ownership : '',
      photo: resolveContentImage(business.photo)?.src ?? '',
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  }

  const regions = (copy.regionLabels ?? []).map((label) => {
    const { x, y } = projectToFrame(label.lat, label.lng, MAP_VIEW_FRAME, false);
    return { text: label.text, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  return {
    copy,
    items,
    types: [...types.values()]
      .sort((a, b) => a.rank - b.rank || a.order - b.order || a.label.localeCompare(b.label))
      .map(({ id, slug, label }) => ({ id, slug, label })),
    areas: [...areas.values()].sort((a, b) => a.label.localeCompare(b.label)),
    prices: [...prices]
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .map((value) => ({ id: value, slug: value, label: value })),
    hasLocallyOwned: items.some((item) => item.ownership === 'local'),
    regions,
  };
}

/** The page copy only (small and quick), so the page can start streaming before the listings arrive. */
export async function loadMapCopy(): Promise<MapPageCopy> {
  const copy = await getSanityClient().fetch<MapPageCopy | null>(MAP_PAGE_QUERY);
  if (!copy?.title) {
    throw new Error(
      'The "mapPage" document is missing or has no title. Create and publish it in the Studio, or run `npm run seed:map`.'
    );
  }
  return copy;
}

/** Every listed business with a place on the map (the slow part). */
export function loadMapBusinesses(): Promise<RawBusiness[]> {
  return getSanityClient().fetch<RawBusiness[]>(MAP_BUSINESSES_QUERY);
}

export async function loadMapPage(now: Date = new Date()): Promise<MapPageContent> {
  const [copy, businesses] = await Promise.all([loadMapCopy(), loadMapBusinesses()]);
  return buildMapPage(copy, businesses, now);
}
