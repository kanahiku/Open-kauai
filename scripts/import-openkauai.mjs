/**
 * Import scraped Open Kauaʻi listings into Sanity.
 *
 *   npm run scrape                       fetch .cache/openkauai/{map,search}.json
 *   npm run import:listings -- --dry-run summarize, write nothing
 *   npm run import:listings              write categories, areas and businesses
 *
 * Idempotent. Documents have stable IDs (business-<source id>), and re-running only updates
 * the fields that come from the source. Fields an editor sets in the Studio (photo, kind,
 * ownership, price level, known-for, description, featured, slug) are never overwritten.
 */
import fs from 'node:fs';
import { getWriteClient } from './lib/sanity-target.mjs';
import { parseHours } from './lib/parse-hours.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const SOURCE_URL = 'https://www.openkauai.org/search';
const CACHE = '.cache/openkauai';

// ---------- helpers ----------
const fold = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʻ'’`‘]/g, '')
    .toLowerCase()
    .trim();

const slugify = (text) =>
  fold(text)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const clean = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** Drop undefined and empty strings so we never write blank fields. */
function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  );
}

// ---------- canonical towns (display names carry the ʻokina and kahakō) ----------
const TOWNS = [
  ['lihue', 'Līhuʻe'],
  ['kapaia', 'Līhuʻe'],
  ['koloa', 'Kōloa'],
  ['poipu', 'Poʻipū'],
  ['kapaa', 'Kapaʻa'],
  ['hanalei', 'Hanalei'],
  ['princeville', 'Princeville'],
  ['kilauea', 'Kīlauea'],
  ['hanapepe', 'Hanapēpē'],
  ['kalaheo', 'Kalāheo'],
  ['eleele', 'ʻEleʻele'],
  ['port allen', 'ʻEleʻele'],
  ['kekaha', 'Kekaha'],
  ['waimea', 'Waimea'],
  ['lawai', 'Lāwaʻi'],
  ['kaumakani', 'Kaumakani'],
  ['wailua', 'Wailua'],
  ['wainiha', 'Wainiha'],
  ['puhi', 'Puhi'],
  ['anahola', 'Anahola'],
];
const ISLANDWIDE = 'Islandwide / Online';

function townFrom(text) {
  const key = fold(text);
  let best;
  for (const [needle, display] of TOWNS) {
    const index = key.search(new RegExp(`\\b${needle}\\b`));
    if (index !== -1 && (!best || index < best.index)) best = { index, display };
  }
  return best?.display;
}

function resolveArea(search, map) {
  return (
    townFrom(search.town ?? '') ??
    townFrom(map?.matchedAddress ?? '') ??
    (search.area === ISLANDWIDE || fold(search.town ?? '').includes('islandwide') ? ISLANDWIDE : undefined)
  );
}

// ---------- categories ----------
const SECTION_BY_CATEGORY = {
  Accommodations: 'stay',
  'Dining & Food': 'dining',
  'Activities & Tours': 'activities',
  'Golf Course': 'activities',
};

// ---------- dates ----------
function toIsoDate(text) {
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const pad = (n) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function toUrl(text) {
  const value = clean(text);
  if (!value) return undefined;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.hostname.includes('.') ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// ---------- load ----------
const read = (name) => JSON.parse(fs.readFileSync(`${CACHE}/${name}.json`, 'utf8'));
const search = read('search').listings;
const mapById = new Map(read('map').businesses.map((b) => [b.id, b]));
const scrapedAt = new Date().toISOString();

// ---------- build documents ----------
const categories = new Map();
const areas = new Map();
const usedSlugs = new Set();
const businesses = [];
let parsedHours = 0;

[...new Set(search.map((l) => l.category).filter(Boolean))].sort().forEach((title, index) => {
  categories.set(title, {
    _id: `category-${slugify(title)}`,
    _type: 'category',
    title,
    slug: { _type: 'slug', current: slugify(title) },
    section: SECTION_BY_CATEGORY[title] ?? 'more',
    order: index + 1,
  });
});

for (const listing of search) {
  const geo = mapById.get(listing.id);
  const name = clean(listing.name);
  const category = categories.get(listing.category);
  if (!name || !category) continue;

  const areaTitle = resolveArea(listing, geo);
  if (areaTitle && !areas.has(areaTitle)) {
    areas.set(areaTitle, {
      _id: `area-${slugify(areaTitle)}`,
      _type: 'area',
      title: areaTitle,
      slug: { _type: 'slug', current: slugify(areaTitle) },
    });
  }

  let slug = slugify(name);
  if (usedSlugs.has(slug)) slug = `${slug}-${slugify(areaTitle ?? listing.id)}`;
  if (usedSlugs.has(slug)) slug = `${slug}-${slugify(listing.id)}`;
  usedSlugs.add(slug);

  const rawHours = clean(listing.hours) && !/GMT[-+]\d{4}/.test(listing.hours) ? listing.hours.trim() : '';
  const openingHours = parseHours(rawHours)?.map((w, i) => ({ _type: 'openingHours', _key: `h${i}`, ...w }));
  if (openingHours) parsedHours++;

  const closed = listing.status === 'Temporarily Closed' || listing.status === 'Reopening Soon';
  const hasLocation = Number.isFinite(geo?.latitude) && Number.isFinite(geo?.longitude);

  const id = `business-${slugify(listing.id)}`;
  businesses.push({
    create: {
      _id: id,
      _type: 'business',
      slug: { _type: 'slug', current: slug },
      listed: true,
      claimed: false,
      featured: false,
    },
    set: compact({
      name,
      category: { _type: 'reference', _ref: category._id },
      area: areaTitle ? { _type: 'reference', _ref: `area-${slugify(areaTitle)}` } : undefined,
      address: clean(listing.address) || clean(geo?.matchedAddress),
      location: hasLocation ? { _type: 'geopoint', lat: geo.latitude, lng: geo.longitude } : undefined,
      phone: clean(listing.phone),
      website: toUrl(listing.website),
      facebook: clean(listing.facebook),
      instagram: clean(listing.instagram),
      openingHours,
      hoursNote: rawHours,
      hoursConfirmedAt: toIsoDate(listing.lastVerified),
      temporarilyClosed: closed,
      reopeningDate: closed ? toIsoDate(listing.reopeningDate) : undefined,
      statusNote: clean(listing.statusNote),
      sourceId: listing.id,
      sourceUrl: SOURCE_URL,
      scrapedAt,
    }),
  });
}

// Feature the most complete, currently-operating listings per section (4 each, editable later).
const sectionOf = (doc) => [...categories.values()].find((c) => c._id === doc.set.category._ref)?.section;
const completeness = (doc) =>
  (doc.set.website ? 2 : 0) +
  (doc.set.phone ? 2 : 0) +
  (doc.set.openingHours ? 3 : 0) +
  (doc.set.address ? 1 : 0) +
  (doc.set.area ? 1 : 0) +
  (doc.set.location ? 1 : 0);
for (const section of ['activities', 'dining', 'stay']) {
  businesses
    .filter((doc) => sectionOf(doc) === section && !doc.set.temporarilyClosed && doc.set.area && doc.set.location)
    .sort((a, b) => completeness(b) - completeness(a) || a.set.name.localeCompare(b.set.name))
    .slice(0, 4)
    .forEach((doc) => (doc.create.featured = true));
}

// ---------- report ----------
const bySection = {};
for (const doc of businesses) bySection[sectionOf(doc)] = (bySection[sectionOf(doc)] ?? 0) + 1;
console.log(
  `Categories: ${categories.size}`,
  Object.fromEntries([...categories.values()].map((c) => [c.title, c.section]))
);
console.log(`Areas: ${areas.size}`, [...areas.keys()].join(', '));
console.log(`Businesses: ${businesses.length}`, bySection);
console.log(
  `With area: ${businesses.filter((d) => d.set.area).length}, location: ${businesses.filter((d) => d.set.location).length}, website: ${businesses.filter((d) => d.set.website).length}, phone: ${businesses.filter((d) => d.set.phone).length}, structured hours: ${parsedHours}, temporarily closed: ${businesses.filter((d) => d.set.temporarilyClosed).length}`
);
console.log(
  'Featured:',
  businesses.filter((d) => d.create.featured).map((d) => `${sectionOf(d)}: ${d.set.name}`)
);

if (DRY_RUN) {
  console.log('\nDry run: nothing written.');
  process.exit(0);
}

// ---------- write ----------
const client = getWriteClient();
const reference = [...categories.values(), ...areas.values()];

let transaction = client.transaction();
for (const doc of reference) transaction.createIfNotExists(doc);
await transaction.commit();
console.log(`Wrote ${reference.length} categories and areas.`);

const BATCH = 50;
for (let i = 0; i < businesses.length; i += BATCH) {
  transaction = client.transaction();
  for (const { create, set } of businesses.slice(i, i + BATCH)) {
    transaction.createIfNotExists(create);
    transaction.patch(create._id, (patch) => patch.set(set));
  }
  await transaction.commit();
  console.log(`Wrote businesses ${i + 1}-${Math.min(i + BATCH, businesses.length)}`);
}
console.log('Done.');
