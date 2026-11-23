/**
 * Turns the free-text hours scraped from openkauai.org ("Monday-Friday 11am-9pm") into
 * structured weekly hours, and sets the kind of hours for places to stay and by-booking listings.
 *
 *   node scripts/parse-hours.mjs --dry-run     (prints what would change, writes nothing)
 *   node scripts/parse-hours.mjs
 *
 * Only clear text is converted. Anything ambiguous (no days, times with no am/pm on either
 * side, extra words such as "breakfast" or "front desk") is left alone and printed for review.
 *
 * - Only touches project i1q8kcrm (see scripts/lib/sanity-target.mjs).
 * - Listings that already have structured hours are never changed.
 * - The original free text stays in `hoursNote`.
 * - A listing with no confirmation date gets the date it was scraped, since the text was
 *   published by the business on openkauai.org at that time.
 * - Listings in the stay section get "No opening hours"; notes that start with "By booking"
 *   get "By booking". Existing choices are kept.
 */
import { getWriteClient } from './lib/sanity-target.mjs';

const dryRun = process.argv.includes('--dry-run');
const client = getWriteClient();

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_WORDS = {
  monday: 'mon',
  mon: 'mon',
  tuesday: 'tue',
  tues: 'tue',
  tue: 'tue',
  wednesday: 'wed',
  wed: 'wed',
  thursday: 'thu',
  thurs: 'thu',
  thur: 'thu',
  thu: 'thu',
  friday: 'fri',
  fri: 'fri',
  saturday: 'sat',
  sat: 'sat',
  sunday: 'sun',
  sun: 'sun',
};
const FILLER = new Set([
  'modified',
  'hours',
  'open',
  'from',
  'until',
  'to',
  'and',
  'at',
  'the',
  'thru',
  'through',
  'am',
  'pm',
  'is',
  'are',
]);

/** Lower-case text with dashes unified and spacing tidied. */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\u2012-\u2015\u2212]/g, '-')
    .replace(/[’']/g, '')
    .replace(/\bthru\b|\bthrough\b/g, '-')
    .replace(/\buntil\b/g, '-')
    .replace(/\bto\b/g, '-')
    .replace(/\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\./g, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const dayAlt = Object.keys(DAY_WORDS)
  .sort((a, b) => b.length - a.length)
  .join('|');
const DAY_SPEC = new RegExp(`\\b(?:m-f|m-sat|(?:${dayAlt})(?:\\s*(?:-|/|,|&|and)\\s*(?:${dayAlt}))*)\\b`, 'g');
const TIME = String.raw`(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\b`;
const TIME_RANGE = new RegExp(`${TIME}\\s*-\\s*${TIME}`, 'g');

function expandDays(spec) {
  if (spec === 'm-f') return DAYS.slice(0, 5);
  if (spec === 'm-sat') return DAYS.slice(0, 6);
  const parts = spec.split(/\s*(-|\/|,|&|and)\s*/).filter(Boolean);
  const seps = parts.filter((_, i) => i % 2 === 1);
  const names = parts.filter((_, i) => i % 2 === 0).map((w) => DAY_WORDS[w]);
  if (names.some((d) => !d)) return null;
  if (names.length === 2 && seps[0] === '-') {
    const out = [];
    let i = DAYS.indexOf(names[0]);
    for (let n = 0; n < 7; n++, i = (i + 1) % 7) {
      out.push(DAYS[i]);
      if (DAYS[i] === names[1]) return out;
    }
    return null;
  }
  return names;
}

function to24(hour, minute, meridiem) {
  let h = Number(hour);
  const m = Number(minute ?? 0);
  if (h < 1 || h > 12 || m > 59) return null;
  const pm = meridiem?.startsWith('p');
  if (pm && h < 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * "11am-9pm" -> { range: [opens, closes], inferred }, or null when it cannot be read.
 * When one side has no am/pm it follows the other side. When neither does ("10-6"), a shop-hours
 * guess is made (opening 6-11 is am, 12-5 is pm, closing is pm) and marked `inferred`.
 */
function parseRange(match) {
  const [, h1, m1, mer1, h2, m2, mer2] = match;
  const norm = (m) => (m?.startsWith('p') ? 'pm' : m ? 'am' : undefined);
  let a = norm(mer1);
  let b = norm(mer2);
  const twelve = (h) => Number(h) % 12;
  let inferred = false;

  // "6:30-6:30" and the like are typos: do not guess.
  if (Number(h1) === Number(h2) && Number(m1 ?? 0) === Number(m2 ?? 0) && norm(mer1) === norm(mer2)) return null;

  if (!a && !b) {
    const start = Number(h1);
    const end = Number(h2);
    if (start >= 6 && start <= 11) a = 'am';
    else if (start === 12 || (start >= 1 && start <= 5)) a = 'pm';
    else return null;
    // 8-11 or 7-10:30 could be a morning window: do not guess.
    if (a === 'am' && end >= 10 && end <= 11 && end > start) return null;
    b = 'pm';
    inferred = true;
  } else if (!a) {
    a = twelve(h1) <= twelve(h2) ? b : b === 'am' ? 'pm' : 'am';
  } else if (!b) {
    b =
      twelve(h2) > twelve(h1) || (twelve(h2) === twelve(h1) && Number(m2 ?? 0) > Number(m1 ?? 0))
        ? a
        : a === 'am'
          ? 'pm'
          : 'am';
  }
  const opens = to24(h1, m1, a);
  const closes = to24(h2, m2, b);
  if (opens == null || closes == null || closes <= opens) return null;
  const hours = (closes - opens) / 60;
  if (hours < 1 || hours > 16) return null;
  if (inferred && (opens < 6 * 60 || closes > 23 * 60)) return null;
  return { range: [opens, closes], inferred };
}

const clock = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Returns { windows } or { reason }. Day specs and time ranges are read in order; the first
 * token decides whether days come before times or after.
 */
export function parseHours(raw) {
  const text = normalize(raw);
  if (!text) return { reason: 'empty' };

  // Tokens in reading order.
  const tokens = [];
  for (const m of text.matchAll(DAY_SPEC))
    tokens.push({ type: 'days', index: m.index, end: m.index + m[0].length, value: m[0] });
  for (const m of text.matchAll(TIME_RANGE))
    tokens.push({ type: 'time', index: m.index, end: m.index + m[0].length, value: m });
  for (const m of text.matchAll(/\bclosed\b/g))
    tokens.push({ type: 'closed', index: m.index, end: m.index + m[0].length });
  tokens.sort((a, b) => a.index - b.index);
  // Drop day tokens swallowed by a longer match (none expected) and time tokens inside others.
  if (tokens.length === 0) return { reason: 'no days or times' };

  // Anything else in the text must be filler.
  let rest = text;
  for (const t of [...tokens].sort((a, b) => b.index - a.index))
    rest = rest.slice(0, t.index) + ' ' + rest.slice(t.end);
  const extra = rest.split(/[^a-z]+/).filter((w) => w && !FILLER.has(w));
  if (extra.length > 0) return { reason: `extra words: ${extra.slice(0, 4).join(' ')}` };

  if (!tokens.some((t) => t.type === 'days')) return { reason: 'no days given' };
  if (!tokens.some((t) => t.type === 'time')) return { reason: 'no times given' };

  const daysFirst = tokens[0].type === 'days';
  const groups = []; // { days, ranges: [] , closed }
  if (daysFirst) {
    for (const t of tokens) {
      if (t.type === 'days') {
        const days = expandDays(t.value);
        if (!days) return { reason: 'unreadable days' };
        groups.push({ days, ranges: [], closed: false });
      } else if (groups.length === 0) return { reason: 'times before days' };
      else if (t.type === 'time') groups[groups.length - 1].ranges.push(t.value);
      else groups[groups.length - 1].closed = true;
    }
  } else {
    let pending = [];
    for (const t of tokens) {
      if (t.type === 'time') pending.push(t.value);
      else if (t.type === 'days') {
        const days = expandDays(t.value);
        if (!days || pending.length === 0) return { reason: 'unreadable days/times' };
        groups.push({ days, ranges: pending, closed: false });
        pending = [];
      } else return { reason: '"closed" in time-first text' };
    }
    if (pending.length) return { reason: 'times without days' };
  }

  const byWindow = new Map();
  const seen = new Set();
  let inferred = false;
  for (const g of groups) {
    for (const day of g.days) {
      if (seen.has(day)) return { reason: 'a day is listed twice' };
      seen.add(day);
    }
    if (g.closed && g.ranges.length === 0) continue;
    if (g.closed) return { reason: 'closed and open on same days' };
    for (const range of g.ranges) {
      const parsed = parseRange(range);
      if (!parsed) return { reason: 'times without am/pm or not readable' };
      if (parsed.inferred) inferred = true;
      const key = `${parsed.range[0]}|${parsed.range[1]}`;
      byWindow.set(key, [...(byWindow.get(key) ?? []), ...g.days]);
    }
  }
  if (byWindow.size === 0) return { reason: 'no open times' };
  const windows = [...byWindow.entries()].map(([key, days], i) => {
    const [opens, closes] = key.split('|').map(Number);
    return {
      _key: `h${i}`,
      _type: 'openingHours',
      days: DAYS.filter((d) => days.includes(d)),
      opens: clock(opens),
      closes: clock(closes),
    };
  });
  return { windows, inferred };
}

if (process.argv[1]?.endsWith('parse-hours.mjs')) {
  const docs = await client.fetch(`*[_type == "business"]{
    _id, name, hoursNote, hoursKind, hoursConfirmedAt, scrapedAt,
    "hasHours": coalesce(count(openingHours), 0) > 0,
    "section": category->section
  }`);

  const parsed = [];
  const unclear = [];
  const kinds = [];

  for (const doc of docs) {
    const note = (doc.hoursNote ?? '').trim();
    let kind = doc.hoursKind;
    if (!kind && doc.section === 'stay') kind = 'none';
    else if (!kind && /^by booking/i.test(note)) kind = 'byBooking';
    if (kind && kind !== doc.hoursKind) kinds.push({ id: doc._id, name: doc.name, kind });

    if (doc.hasHours || !note || kind === 'none' || kind === 'byBooking') continue;
    const result = parseHours(note);
    if (result.windows) {
      const set = { openingHours: result.windows };
      if (!doc.hoursConfirmedAt) set.hoursConfirmedAt = (doc.scrapedAt ?? new Date().toISOString()).slice(0, 10);
      parsed.push({ id: doc._id, name: doc.name, note, set, inferred: result.inferred });
    } else {
      unclear.push({ name: doc.name, note, reason: result.reason });
    }
  }

  console.log(
    `Kinds to set: ${kinds.length} (${kinds.filter((k) => k.kind === 'none').length} no hours, ${kinds.filter((k) => k.kind === 'byBooking').length} by booking)`
  );
  console.log(`\nParsed ${parsed.length}:`);
  for (const p of parsed) {
    const summary = p.set.openingHours.map((w) => `${w.days.join(',')} ${w.opens}-${w.closes}`).join(' | ');
    console.log(
      `- ${p.name}\n    text: ${p.note.replace(/\n/g, ' / ')}\n    ->   ${summary}${p.inferred ? '  (am/pm inferred)' : ''}${p.set.hoursConfirmedAt ? `  [confirmed ${p.set.hoursConfirmedAt}]` : ''}`
    );
  }
  console.log(`\nLeft for review ${unclear.length}:`);
  for (const u of unclear) console.log(`- ${u.name} (${u.reason}): ${u.note.replace(/\n/g, ' / ').slice(0, 110)}`);

  if (dryRun) {
    console.log('\nDry run: nothing written.');
    process.exit(0);
  }

  let tx = client.transaction();
  for (const k of kinds) tx = tx.patch(client.patch(k.id).set({ hoursKind: k.kind }));
  for (const p of parsed) tx = tx.patch(client.patch(p.id).set(p.set));
  const result = await tx.commit();
  console.log(`\nCommitted ${result.results.length} operations.`);
}
