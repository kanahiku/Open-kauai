/**
 * Fills listings with the richer, checked data from a `businesses.json` file
 * (kind, price, known-for, about, mentions, offerings, good-to-know, structured hours,
 * status, address, phone, website, booking link, ownership) and adds the listings
 * that are not in Sanity yet.
 *
 *   node scripts/enrich-businesses.mjs --file /path/to/businesses.json --dry-run
 *   node scripts/enrich-businesses.mjs --file /path/to/businesses.json
 *
 * Rules:
 * - Only touches project i1q8kcrm (see scripts/lib/sanity-target.mjs).
 * - Editorial fields (kind, price, known-for, description, mentions, offerings,
 *   good-to-know, ownership, booking link) are only filled when empty, so edits made in
 *   Studio are kept. Use --force to overwrite them.
 * - Factual fields (address, phone, website, hours, status) always take the file's value.
 * - Listings are matched by their source id (falling back to slug), so renamed or
 *   re-slugged listings are updated, not duplicated. Names and slugs are left alone.
 * - The area is set from the file's town (creating the area if needed), and areas are
 *   placed in the region the file puts them in.
 * - Existing map coordinates are kept (the file's are approximate). New listings use the
 *   file's coordinates until someone pins them properly.
 * - Ownership is only set when the file says "Locally owned".
 * - A reopening date in the past is kept as-is: the site then shows "Hours need
 *   confirmation" instead of claiming the place is open or closed.
 */
import fs from 'node:fs';
import { getWriteClient } from './lib/sanity-target.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const fileIndex = args.indexOf('--file');
const file = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
if (!file || !fs.existsSync(file)) {
  console.error('Pass --file /path/to/businesses.json');
  process.exit(1);
}

const client = getWriteClient();
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const items = Array.isArray(raw) ? raw : (raw.businesses ?? []);

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_WORDS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const PROPER_START = /^(Hanalei|Kauai|Kauaʻi|Nāpali|Hawaiʻi|Hawaiian|Japanese|French)/;

const fold = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʻ'’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const clean = (s) => (typeof s === 'string' ? s.trim() : '');
const empty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** "Coffee roasted on Kauaʻi." -> "coffee roasted on Kauaʻi" (the page adds the full stop back). */
function knownForText(text) {
  let t = clean(text).replace(/[.]+$/, '');
  if (t && !PROPER_START.test(t)) t = t.charAt(0).toLowerCase() + t.slice(1);
  return t.slice(0, 90);
}

const toTime = (t) => (/^\d{2}:\d{2}$/.test(t) ? t : null);

/** Weekly windows from the file -> Sanity openingHours (days grouped by identical window). */
function buildOpeningHours(week, warnings, slug) {
  const groups = new Map();
  for (const day of DAYS) {
    for (const [opens, closes] of week?.[day] ?? []) {
      if (!toTime(opens) || !toTime(closes) || closes <= opens) {
        warnings.push(`${slug}: skipped window ${day} ${opens}-${closes}`);
        continue;
      }
      const key = `${opens}|${closes}`;
      groups.set(key, [...(groups.get(key) ?? []), day]);
    }
  }
  return [...groups.entries()].map(([key, days], index) => {
    const [opens, closes] = key.split('|');
    return { _key: `h${index}`, _type: 'openingHours', days, opens, closes };
  });
}

function describeBooking(hours) {
  const parts = ['By booking.'];
  if (clean(hours.note)) parts.push(clean(hours.note));
  else {
    const days = DAYS.filter((d) => (hours.week?.[d] ?? []).length > 0);
    if (days.length) parts.push(`Usually ${days.map((d) => DAY_WORDS[d]).join(' and ')}.`);
  }
  return parts.join(' ');
}

const keyed = (list) => list.map((entry, index) => ({ ...entry, _key: `k${index}` }));

/** Fields shared by updates and new documents. */
function build(item, existing, warnings) {
  const set = {};
  const unset = [];
  const editorial = (field, value) => {
    if (empty(value)) return;
    if (force || empty(existing?.[field])) set[field] = value;
  };

  editorial('kind', clean(item.type).slice(0, 40));
  editorial('priceLevel', ['$', '$$', '$$$'].includes(item.price) ? item.price : undefined);
  editorial('knownFor', knownForText(item.known_for));
  editorial('description', clean(item.about));
  editorial('mentions', (item.people_mention ?? []).map(clean).filter(Boolean));
  editorial(
    'offerings',
    keyed(
      (item.offers ?? [])
        .filter((o) => clean(o.name))
        .map((o) => ({ _type: 'offering', title: clean(o.name), ...(clean(o.note) ? { note: clean(o.note) } : {}) }))
    )
  );
  editorial(
    'goodToKnow',
    keyed(
      (item.good_to_know ?? [])
        .map(clean)
        .filter(Boolean)
        .map((title) => ({ _type: 'fact', title }))
    )
  );
  if (item.ownership?.label === 'Locally owned') editorial('ownership', 'local');
  editorial('bookingUrl', clean(item.contact?.booking_url));

  // Facts: the file is newer than the first scrape.
  if (clean(item.address)) set.address = clean(item.address);
  if (clean(item.contact?.phone)) set.phone = clean(item.contact.phone);
  if (clean(item.contact?.website)) set.website = clean(item.contact.website);

  const hours = item.hours ?? { kind: 'unknown' };
  if (hours.kind === 'fixed') {
    const windows = buildOpeningHours(hours.week, warnings, item.slug);
    if (windows.length) set.openingHours = windows;
    if (clean(hours.note)) set.hoursNote = clean(hours.note);
    else if (windows.length) unset.push('hoursNote');
  } else if (hours.kind === 'by_booking') {
    unset.push('openingHours');
    set.hoursNote = describeBooking(hours);
    set.hoursKind = 'byBooking';
  } else if (hours.kind === 'unknown' || hours.kind === 'closed') {
    if (clean(hours.note)) set.hoursNote = clean(hours.note);
  }
  // Stays have no opening hours; the file's note, if any, is kept as the hours note.
  if (hours.kind === 'stay') {
    set.hoursKind = 'none';
    if (clean(hours.note)) set.hoursNote = clean(hours.note);
  }

  const status = item.status ?? {};
  const closedCodes = ['temporarily_closed', 'reopening_soon'];
  set.temporarilyClosed = closedCodes.includes(status.code);
  if (status.reopening_date && closedCodes.includes(status.code)) set.reopeningDate = status.reopening_date;
  else unset.push('reopeningDate');
  if (clean(status.note)) set.statusNote = clean(status.note);

  if (empty(existing?.hoursConfirmedAt)) set.hoursConfirmedAt = status.last_checked ?? item.data_checked;

  return { set, unset };
}

const existingDocs = await client.fetch(`*[_type == "business"]{
  _id, sourceId, "slug": slug.current, "areaRef": area._ref, kind, priceLevel, knownFor, description, mentions, offerings, goodToKnow,
  ownership, bookingUrl, hoursConfirmedAt, temporarilyClosed
}`);
const bySourceId = new Map(existingDocs.filter((doc) => doc.sourceId).map((doc) => [doc.sourceId, doc]));
const bySlug = new Map(existingDocs.map((doc) => [doc.slug, doc]));
const findExisting = (item) => bySourceId.get(item.id) ?? bySlug.get(item.slug);

const areas = await client.fetch(`*[_type == "area"]{_id, title}`);
const areaByFold = new Map(areas.map((a) => [fold(a.title), a]));
const regions = await client.fetch(`*[_type == "region"]{_id, title, "areaRefs": areas[]._ref}`);
const regionByTitle = new Map(regions.map((r) => [r.title, r]));
const categories = await client.fetch(
  `*[_type == "category"]{_id, title, section, "count": count(*[_type == "business" && references(^._id)])}`
);

function categoryFor(section) {
  const candidates = categories.filter((c) => c.section === section).sort((a, b) => b.count - a.count);
  return candidates[0];
}

const warnings = [];
const updates = [];
const creations = [];
const newAreas = new Map();
const areaChanges = [];

for (const item of items) {
  const existing = findExisting(item);
  const { set, unset } = build(item, existing, warnings);

  let area = areaByFold.get(fold(item.town));
  if (!area) {
    const id = `area-${fold(item.town)}`;
    area = { _id: id, title: item.town };
    areaByFold.set(fold(item.town), area);
    newAreas.set(id, { _id: id, _type: 'area', title: item.town, slug: { _type: 'slug', current: fold(item.town) } });
  }
  if (existing) {
    if (existing.areaRef !== area._id) {
      set.area = { _type: 'reference', _ref: area._id };
      areaChanges.push(`${item.slug}: ${existing.areaRef} -> ${area._id}`);
    }
    updates.push({ id: existing._id, slug: existing.slug, set, unset, was: existing });
    continue;
  }
  const category = categoryFor(item.category);
  if (!category) {
    warnings.push(`${item.slug}: no category for section "${item.category}"`);
    continue;
  }
  const doc = {
    _id: `business-${item.id.toLowerCase()}`,
    _type: 'business',
    name: item.name,
    slug: { _type: 'slug', current: item.slug },
    category: { _type: 'reference', _ref: category._id },
    area: { _type: 'reference', _ref: area._id },
    listed: true,
    claimed: false,
    featured: false,
    sourceId: item.id,
    sourceUrl: 'https://www.openkauai.org/search',
    ...set,
  };
  if (item.map?.lat != null && item.map?.lng != null) {
    doc.location = { _type: 'geopoint', lat: item.map.lat, lng: item.map.lng };
  }
  creations.push({ doc, category: category.title, area: area.title });
}

// Regions: each town's area belongs to the region the file puts it in.
const regionPatches = new Map(regions.map((r) => [r._id, new Set(r.areaRefs ?? [])]));
const moves = [];
for (const item of items) {
  const area = areaByFold.get(fold(item.town));
  const target = regionByTitle.get(item.region);
  if (!area || !target) continue;
  for (const [regionId, refs] of regionPatches) {
    if (regionId !== target._id && refs.has(area._id)) {
      refs.delete(area._id);
      moves.push(`${area.title}: ${regions.find((r) => r._id === regionId).title} -> ${item.region}`);
    }
  }
  const refs = regionPatches.get(target._id);
  if (!refs.has(area._id)) {
    refs.add(area._id);
    if (!moves.some((m) => m.startsWith(`${area.title}:`))) moves.push(`${area.title}: added to ${item.region}`);
  }
}

console.log(`Items in file: ${items.length}`);
console.log(`Update ${updates.length} existing listings, create ${creations.length} new ones`);
console.log(
  'New listings:',
  creations.map((c) => `${c.doc.slug.current} [${c.category} / ${c.area}]`)
);
console.log('Area changes:', areaChanges);
console.log(
  'New areas:',
  [...newAreas.values()].map((a) => a.title)
);
console.log('Region changes:', moves);
const closedNow = updates.filter((u) => u.set.temporarilyClosed).map((u) => u.slug);
console.log('Marked temporarily closed / reopening:', closedNow);
const flipped = updates
  .filter((u) => Boolean(u.was.temporarilyClosed) !== u.set.temporarilyClosed)
  .map((u) => `${u.slug}: ${Boolean(u.was.temporarilyClosed)} -> ${u.set.temporarilyClosed}`);
console.log('Closed flag changes:', flipped);
console.log(
  'Ownership set to local:',
  updates.filter((u) => u.set.ownership).length + creations.filter((c) => c.doc.ownership).length
);
console.log(
  'Structured hours written:',
  updates.filter((u) => u.set.openingHours).length + creations.filter((c) => c.doc.openingHours).length
);
if (warnings.length) console.log('Warnings:', warnings);

if (dryRun) {
  console.log('\nDry run: nothing written.');
  process.exit(0);
}

let tx = client.transaction();
for (const area of newAreas.values()) tx = tx.createIfNotExists(area);
for (const { doc } of creations) tx = tx.createIfNotExists(doc);
for (const { id, set, unset } of updates) {
  let patch = client.patch(id).set(set);
  if (unset.length) patch = patch.unset(unset.filter((field) => !(field in set)));
  tx = tx.patch(patch);
}
for (const region of regions) {
  const refs = [...regionPatches.get(region._id)];
  const before = region.areaRefs ?? [];
  if (refs.length === before.length && refs.every((r) => before.includes(r))) continue;
  tx = tx.patch(
    client
      .patch(region._id)
      .set({ areas: refs.map((ref) => ({ _key: ref.replace(/^area-/, ''), _type: 'reference', _ref: ref })) })
  );
}
const result = await tx.commit();
console.log(`Committed ${result.results.length} operations.`);
