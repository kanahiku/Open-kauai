/**
 * Content for a browse page (/activities/, /dining/, /stay/): copy from the `sectionPage` document
 * plus every listed business in the section. Filter options (types, regions) are derived from
 * the listings, so a filter only appears when there is something to filter by.
 */
import { getSanityClient } from '~/lib/sanity/client';
import { SECTION_BUSINESSES_QUERY, SECTION_KEYS, SECTION_PAGE_QUERY, type SectionKey } from '~/lib/sanity/queries';
import { toCard, type ListingCardData, type RawBusiness } from '~/lib/home';

export function isSectionKey(value: string | undefined): value is SectionKey {
  return SECTION_KEYS.includes(value as SectionKey);
}

export interface SectionCopy {
  section: SectionKey;
  seoTitle?: string;
  seoDescription?: string;
  breadcrumbLabel?: string;
  title: string;
  allTypesLabel?: string;
  listLabel?: string;
  mapLabel?: string;
  countTemplate?: string;
  sortLabel?: string;
  sortOpenFirstLabel?: string;
  sortNameLabel?: string;
  filtersTitle?: string;
  clearAllLabel?: string;
  openNowLabel?: string;
  locallyOwnedLabel?: string;
  areaTitle?: string;
  priceTitle?: string;
  showMoreLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
  offeringsTitle?: string;
  primaryActionLabel?: string;
}

interface RawSectionBusiness extends RawBusiness {
  areaId?: string | null;
  areaSlug?: string | null;
  regionSlug?: string | null;
  regionTitle?: string | null;
  regionOrder?: number | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryTitle?: string | null;
  categoryOrder?: number | null;
}

export interface SectionItem {
  id: string;
  card: ListingCardData;
  /** Category slug. */
  type: string;
  /** Region slug (North Shore, East Side, ...), or empty. */
  area: string;
  owned: boolean;
  open: boolean;
  /** Position when sorted open first, then by name. */
  rankOpen: number;
  /** Position when sorted by name. */
  rankName: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface SectionPageContent {
  copy: SectionCopy;
  items: SectionItem[];
  types: FilterOption[];
  /** Regions, as in the design's Area filter. */
  areas: FilterOption[];
  hasOwned: boolean;
  /** Where the Map toggle goes. */
  mapHref: string;
}

function tally(entries: { value: string; label: string }[]): FilterOption[] {
  const map = new Map<string, FilterOption>();
  for (const { value, label } of entries) {
    const existing = map.get(value);
    if (existing) existing.count += 1;
    else map.set(value, { value, label, count: 1 });
  }
  return [...map.values()];
}

export function buildSectionPage(copy: SectionCopy, businesses: RawSectionBusiness[], now: Date): SectionPageContent {
  const cards = businesses
    .map((business) => ({ business, card: toCard(business, now) }))
    .filter((entry): entry is { business: RawSectionBusiness; card: ListingCardData } => entry.card !== undefined);

  // Open first, then A to Z. The query already orders by name.
  const openFirst = [...cards].sort((a, b) => Number(b.card.open) - Number(a.card.open));
  const rankOpen = new Map(openFirst.map((entry, index) => [entry.business._id, index]));
  const rankName = new Map(cards.map((entry, index) => [entry.business._id, index]));

  const items: SectionItem[] = openFirst.map(({ business, card }) => ({
    id: business._id,
    card,
    type: business.categorySlug ?? '',
    area: business.regionSlug ?? '',
    owned: business.ownership === 'local',
    open: card.open,
    rankOpen: rankOpen.get(business._id) ?? 0,
    rankName: rankName.get(business._id) ?? 0,
  }));

  const typeOrder = new Map<string, number>();
  for (const { business } of cards) {
    if (business.categorySlug) typeOrder.set(business.categorySlug, business.categoryOrder ?? 99);
  }
  const types = tally(
    cards
      .filter(({ business }) => business.categorySlug && business.categoryTitle)
      .map(({ business }) => ({ value: business.categorySlug!, label: business.categoryTitle! }))
  ).sort((a, b) => (typeOrder.get(a.value) ?? 99) - (typeOrder.get(b.value) ?? 99) || a.label.localeCompare(b.label));

  const regionOrder = new Map<string, number>();
  for (const { business } of cards) {
    if (business.regionSlug) regionOrder.set(business.regionSlug, business.regionOrder ?? 99);
  }
  const areas = tally(
    cards
      .filter(({ business }) => business.regionSlug && business.regionTitle)
      .map(({ business }) => ({ value: business.regionSlug!, label: business.regionTitle! }))
  ).sort(
    (a, b) => (regionOrder.get(a.value) ?? 99) - (regionOrder.get(b.value) ?? 99) || a.label.localeCompare(b.label)
  );

  return {
    copy,
    items,
    types,
    areas,
    hasOwned: items.some((item) => item.owned),
    mapHref: types.length === 1 ? `/map/?category=${encodeURIComponent(types[0].value)}` : '/map/',
  };
}

export async function loadSectionPage(section: SectionKey, now: Date = new Date()): Promise<SectionPageContent> {
  const client = getSanityClient();
  const [copy, businesses] = await Promise.all([
    client.fetch<SectionCopy | null>(SECTION_PAGE_QUERY, { id: `sectionPage-${section}` }),
    client.fetch<RawSectionBusiness[]>(SECTION_BUSINESSES_QUERY, { section }),
  ]);
  if (!copy?.title) {
    throw new Error(
      `The "sectionPage-${section}" document is missing or has no title. Create and publish it in the Studio, or run \`npm run seed:directory\`.`
    );
  }
  return buildSectionPage(copy, businesses, now);
}
