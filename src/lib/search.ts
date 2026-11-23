/**
 * Search over listings and towns. Matching ignores case, accents and the ʻokina, so "kapaa" finds
 * "Kapaʻa" and "poipu" finds "Poʻipū". Every word typed must match the start of a word in the
 * listing's name, kind, town, category or "known for" line. Name matches rank first.
 */
import { getSanityClient } from '~/lib/sanity/client';
import { SEARCH_INDEX_QUERY, SEARCH_PAGE_QUERY } from '~/lib/sanity/queries';
import { toCard, type ListingCardData, type RawBusiness } from '~/lib/home';
import { fillTemplate } from '~/lib/business-page';

export interface SearchCopy {
  seoTitle?: string;
  title?: string;
  placeholder?: string;
  buttonLabel?: string;
  clearLabel?: string;
  resultsTemplate?: string;
  placesTitle?: string;
  businessesTitle?: string;
  placeCountTemplate?: string;
  showAllLabel?: string;
  promptTitle?: string;
  promptBody?: string;
  emptyTitle?: string;
  emptyBody?: string;
}

interface IndexBusiness extends RawBusiness {
  categoryTitle?: string | null;
  section?: string | null;
}

interface IndexPlace {
  slug?: string | null;
  title?: string | null;
  region?: string | null;
  count?: number | null;
}

export interface SearchIndex {
  businesses: IndexBusiness[];
  places: IndexPlace[];
}

export interface PlaceResult {
  title: string;
  slug: string;
  region: string;
  count: number;
  href: string;
}

export interface BusinessResult {
  business: IndexBusiness;
  card: ListingCardData;
}

export interface SearchResults {
  query: string;
  places: PlaceResult[];
  businesses: BusinessResult[];
  total: number;
}

/** Lower case, no accents, no ʻokina or apostrophes. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʻʼ'’`‘]/g, '')
    .toLowerCase();
}

const tokens = (value: string) =>
  fold(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function queryWords(query: string): string[] {
  return tokens(query.slice(0, 80)).slice(0, 6);
}

/** Score one field against the words: every word must match the start of one of the field's words. */
function scoreField(fieldTokens: string[], words: string[]): number | undefined {
  let total = 0;
  for (const word of words) {
    const index = fieldTokens.findIndex((token) => token.startsWith(word));
    if (index === -1) return undefined;
    total += index === 0 ? 2 : 1;
  }
  return total;
}

export function search(index: SearchIndex, query: string, now: Date, limit = 48): SearchResults {
  const words = queryWords(query);
  if (words.length === 0) return { query, places: [], businesses: [], total: 0 };

  const scored: { business: IndexBusiness; score: number }[] = [];
  for (const business of index.businesses) {
    if (!business.name) continue;
    const fields = {
      name: tokens(business.name),
      kind: tokens(business.kind ?? ''),
      area: tokens(business.area ?? ''),
      category: tokens(business.categoryTitle ?? ''),
      knownFor: tokens(business.knownFor ?? ''),
    };
    // A word may match in a different field from the others ("kayak hanalei").
    let score = 0;
    let matchedAll = true;
    let inName = 0;
    for (const word of words) {
      const best = Math.max(
        (scoreField(fields.name, [word]) ?? 0) * 6,
        (scoreField(fields.kind, [word]) ?? 0) * 3,
        (scoreField(fields.area, [word]) ?? 0) * 2,
        (scoreField(fields.category, [word]) ?? 0) * 2,
        scoreField(fields.knownFor, [word]) ?? 0
      );
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
      if (scoreField(fields.name, [word])) inName += 1;
    }
    if (!matchedAll) continue;
    if (inName === words.length) score += 10;
    scored.push({ business, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.business.name ?? '').localeCompare(b.business.name ?? ''));

  const businesses = scored
    .map(({ business }) => ({ business, card: toCard(business, now) }))
    .filter((entry): entry is BusinessResult => entry.card !== undefined);

  const places: PlaceResult[] = index.places
    .filter((place): place is IndexPlace & { title: string; slug: string } => Boolean(place.title && place.slug))
    .filter((place) => (place.count ?? 0) > 0 && scoreField(tokens(place.title), words) !== undefined)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map((place) => ({
      title: place.title,
      slug: place.slug,
      region: place.region ?? '',
      count: place.count ?? 0,
      href: `/map/?area=${encodeURIComponent(place.slug)}`,
    }));

  return { query, places, businesses: businesses.slice(0, limit), total: businesses.length };
}

/** "North Shore · 42 places" from the copy, or just the region when there is no template. */
export function placeLine(place: PlaceResult, copy: SearchCopy): string {
  const count = copy.placeCountTemplate ? fillTemplate(copy.placeCountTemplate, { count: String(place.count) }) : '';
  return [place.region, count].filter(Boolean).join(' · ');
}

/** "Kayak · Hanalei" style line for a result row. */
export function businessLine(business: IndexBusiness): string {
  return [business.kind || business.categoryTitle, business.area].filter(Boolean).join(' · ');
}

// ---------- loading ----------
const TTL_MS = 60_000;
let cached: { at: number; value: Promise<SearchIndex> } | undefined;

/** The index is small (hundreds of listings), so it is cached briefly per server instance. */
export function getSearchIndex(): Promise<SearchIndex> {
  const fetchIndex = () => getSanityClient().fetch<SearchIndex>(SEARCH_INDEX_QUERY);
  if (import.meta.env.DEV) return fetchIndex();
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    const value = fetchIndex();
    cached = { at: now, value };
    value.catch(() => {
      if (cached?.value === value) cached = undefined;
    });
  }
  return cached.value;
}

export async function loadSearchCopy(): Promise<SearchCopy> {
  const copy = await getSanityClient().fetch<SearchCopy | null>(SEARCH_PAGE_QUERY);
  if (!copy?.title) {
    throw new Error(
      'The "searchPage" document is missing or has no title. Create and publish it in the Studio, or run `npm run seed:pages`.'
    );
  }
  return copy;
}
