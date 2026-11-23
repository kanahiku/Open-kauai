/**
 * Content for the region pages: /region/ (all regions) and /region/<slug>/ (one region with its
 * towns, a map of its listings and a shelf per section). Copy comes from the `regionPage` document,
 * regions and their towns from `region` documents, listings from `business` documents.
 */
import { getSanityClient } from '~/lib/sanity/client';
import {
  REGIONS_QUERY,
  REGION_BUSINESSES_QUERY,
  REGION_PAGE_QUERY,
  SECTION_KEYS,
  type SectionKey,
} from '~/lib/sanity/queries';
import { toCard, type ListingCardData, type MapPin, type RawBusiness, type ShelfData } from '~/lib/home';
import { fillTemplate } from '~/lib/business-page';
import { MAP_FRAME, projectToFrame } from '~/lib/map';
import { SECTION_ICONS } from '~/lib/sections';

export interface RegionCopy {
  indexSeoTitle?: string;
  indexSeoDescription?: string;
  indexEyebrow?: string;
  indexTitle?: string;
  indexLede?: string;
  placesTemplate?: string;
  breadcrumbLabel?: string;
  seoTitleTemplate?: string;
  seoDescriptionTemplate?: string;
  eyebrow?: string;
  townsTitle?: string;
  mapTitle?: string;
  mapLinkLabel?: string;
  seeAllLabel?: string;
  shelfTitleTemplate?: string;
  otherRegionsTitle?: string;
  emptyTitle?: string;
  emptyBody?: string;
}

interface RawRegion {
  _id: string;
  title?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  areas?: ({ _id: string; title?: string; slug?: string; count?: number } | null)[];
}

interface RawRegionBusiness extends RawBusiness {
  featured?: boolean | null;
  areaSlug?: string | null;
  section?: string | null;
}

export interface RegionSummary {
  title: string;
  href: string;
  tagline?: string;
  places: number;
  towns: string[];
}

export interface RegionIndexContent {
  copy: RegionCopy;
  seo: { title: string; description?: string };
  regions: RegionSummary[];
}

export interface RegionPageContent {
  copy: RegionCopy;
  seo: { title: string; description?: string };
  title: string;
  tagline?: string;
  description?: string;
  places: number;
  towns: { title: string; slug: string; count: number }[];
  /** Pins on the island map and a label per town. */
  map: {
    width: number;
    height: number;
    pins: MapPin[];
    labels: { text: string; x: number; y: number }[];
    /** Zoom so the region's listings fill the map: scale, and where its middle sits (0 to 1). */
    view: { scale: number; cx: number; cy: number };
  };
  shelves: ShelfData[];
  others: { title: string; href: string }[];
}

function missingCopy(): Error {
  return new Error(
    'The "regionPage" document is missing. Create and publish it in the Studio, or run `npm run seed:pages`.'
  );
}

const usable = (region: RawRegion): region is RawRegion & { title: string; slug: string } =>
  Boolean(region.title && region.slug);

function summarize(region: RawRegion & { title: string; slug: string }): RegionSummary {
  const areas = (region.areas ?? []).filter((a): a is NonNullable<typeof a> => Boolean(a?.title));
  return {
    title: region.title,
    href: `/region/${region.slug}/`,
    tagline: region.tagline,
    places: areas.reduce((sum, area) => sum + (area.count ?? 0), 0),
    towns: areas.map((area) => area.title!),
  };
}

export function buildRegionIndex(copy: RegionCopy, regions: RawRegion[]): RegionIndexContent {
  return {
    copy,
    seo: { title: copy.indexSeoTitle ?? copy.indexTitle ?? '', description: copy.indexSeoDescription },
    regions: regions.filter(usable).map(summarize),
  };
}

export function buildRegionPage(
  copy: RegionCopy,
  regions: RawRegion[],
  slug: string,
  businesses: RawRegionBusiness[],
  sectionNames: Partial<Record<SectionKey, string>>,
  now: Date
): RegionPageContent | undefined {
  const usableRegions = regions.filter(usable);
  const region = usableRegions.find((candidate) => candidate.slug === slug);
  if (!region) return undefined;

  const areas = (region.areas ?? []).filter((a): a is NonNullable<typeof a> => Boolean(a?.title && a.slug));
  const summary = summarize(region);

  // Map: one pin per listing with coordinates, one label per town at the middle of its pins.
  const { width, height } = MAP_FRAME;
  const pins: MapPin[] = [];
  const centers = new Map<string, { x: number; y: number; n: number }>();
  for (const business of businesses) {
    if (!Number.isFinite(business.lat) || !Number.isFinite(business.lng)) continue;
    const { x, y } = projectToFrame(business.lat!, business.lng!);
    pins.push({ x: x - 9, y: y - 9, size: 18, selected: false });
    const key = business.areaSlug ?? '';
    const center = centers.get(key) ?? { x: 0, y: 0, n: 0 };
    centers.set(key, { x: center.x + x, y: center.y + y, n: center.n + 1 });
  }
  const labels = areas
    .map((area) => {
      const center = centers.get(area.slug!);
      return center ? { text: area.title!, x: center.x / center.n, y: center.y / center.n } : undefined;
    })
    .filter((label): label is { text: string; x: number; y: number } => label !== undefined);

  // Zoom to the listings, keeping some room around them. Never zoom out past the whole island.
  let view = { scale: 1, cx: 0.5, cy: 0.5 };
  if (pins.length > 0) {
    const xs = pins.map((p) => p.x + p.size / 2);
    const ys = pins.map((p) => p.y + p.size / 2);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const boxW = Math.max(maxX - minX, 60) * 1.5;
    const boxH = Math.max(maxY - minY, 40) * 1.7;
    const scale = Math.min(3.2, Math.max(1, Math.min(width / boxW, height / boxH)));
    const half = { x: width / scale / 2, y: height / scale / 2 };
    const clampCenter = (value: number, halfSize: number, total: number) =>
      Math.min(total - halfSize, Math.max(halfSize, value));
    view = {
      scale,
      cx: clampCenter((minX + maxX) / 2, half.x, width) / width,
      cy: clampCenter((minY + maxY) / 2, half.y, height) / height,
    };
  }

  // Shelves: up to four per section, featured and open first.
  const shelves: ShelfData[] = [];
  for (const section of SECTION_KEYS) {
    const picked = businesses
      .filter((business) => business.section === section)
      .map((business) => ({ business, card: toCard(business, now) }))
      .filter((entry): entry is { business: RawRegionBusiness; card: ListingCardData } => entry.card !== undefined)
      .sort(
        (a, b) =>
          Number(Boolean(b.business.featured)) - Number(Boolean(a.business.featured)) ||
          Number(b.card.open) - Number(a.card.open) ||
          a.card.name.localeCompare(b.card.name)
      )
      .slice(0, 4);
    if (picked.length === 0) continue;
    const sectionName = sectionNames[section] ?? section;
    shelves.push({
      id: section,
      eyebrow: '',
      title: copy.shelfTitleTemplate
        ? fillTemplate(copy.shelfTitleTemplate, { section: sectionName, region: region.title })
        : sectionName,
      icon: SECTION_ICONS[section].shelf,
      seeAllHref: `/${section}/?area=${areas.map((area) => area.slug).join(',')}`,
      items: picked.map((entry) => entry.card),
    });
  }

  const description = region.description?.trim();
  return {
    copy,
    seo: {
      title: copy.seoTitleTemplate ? fillTemplate(copy.seoTitleTemplate, { name: region.title }) : region.title,
      description:
        description ??
        (copy.seoDescriptionTemplate ? fillTemplate(copy.seoDescriptionTemplate, { name: region.title }) : undefined),
    },
    title: region.title,
    tagline: region.tagline,
    description,
    places: summary.places,
    towns: areas.map((area) => ({ title: area.title!, slug: area.slug!, count: area.count ?? 0 })),
    map: { width, height, pins, labels, view },
    shelves,
    others: usableRegions
      .filter((other) => other.slug !== slug)
      .map((other) => ({ title: other.title, href: `/region/${other.slug}/` })),
  };
}

export async function loadRegionIndex(): Promise<RegionIndexContent> {
  const client = getSanityClient();
  const [copy, regions] = await Promise.all([
    client.fetch<RegionCopy | null>(REGION_PAGE_QUERY),
    client.fetch<RawRegion[]>(REGIONS_QUERY),
  ]);
  if (!copy?.indexTitle) throw missingCopy();
  return buildRegionIndex(copy, regions);
}

export async function loadRegionPage(slug: string, now: Date = new Date()): Promise<RegionPageContent | undefined> {
  const client = getSanityClient();
  const [copy, regions, sections] = await Promise.all([
    client.fetch<RegionCopy | null>(REGION_PAGE_QUERY),
    client.fetch<RawRegion[]>(REGIONS_QUERY),
    client.fetch<{ section: SectionKey; breadcrumbLabel?: string; title?: string }[]>(
      `*[_type == "sectionPage"]{ section, breadcrumbLabel, title }`
    ),
  ]);
  if (!copy) throw missingCopy();

  const region = regions.find((candidate) => candidate.slug === slug);
  if (!region) return undefined;
  const areaIds = (region.areas ?? []).map((area) => area?._id).filter((id): id is string => Boolean(id));
  const businesses = areaIds.length
    ? await client.fetch<RawRegionBusiness[]>(REGION_BUSINESSES_QUERY, { areaIds })
    : [];

  const sectionNames = Object.fromEntries(
    sections.map((entry) => [entry.section, entry.breadcrumbLabel ?? entry.title ?? entry.section])
  ) as Partial<Record<SectionKey, string>>;
  return buildRegionPage(copy, regions, slug, businesses, sectionNames, now);
}
