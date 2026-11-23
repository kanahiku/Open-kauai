/**
 * Conservative parser for free-text business hours.
 *
 * Accepts only text with exactly ONE clear time range and a clear day spec, and returns
 * `[{ days, opens, closes }]` (24h "HH:mm"). Anything ambiguous (several ranges, no days,
 * only one meridiem that cannot be inferred, overnight, kitchen/office/tour hours, ...)
 * returns `null`, so the raw text stays in `hoursNote` and no invented hours are shown.
 */
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_TOKEN = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*/g;
const DISQUALIFIERS =
  /front desk|office|reception|check[- ]?in|check[- ]?out|breakfast|brunch|lunch|dinner|happy hour|kitchen|tour|class|close|except|seasonal|by appointment|appointment only|varies|call for/;
const TIME_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*(?:-|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?/g;

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\b(thru|through)\b/g, '-')
    .replace(/a\.\s*m\.?/g, 'am')
    .replace(/p\.\s*m\.?/g, 'pm')
    .replace(/\s+/g, ' ')
    .trim();
}

const meridiem = (value) => (value ? (value.startsWith('p') ? 'pm' : 'am') : undefined);

function to24(hour, minute, mer) {
  let h = hour % 12;
  if (mer === 'pm') h += 12;
  return h * 60 + minute;
}

function fmt(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function parseDays(text) {
  if (/\b(daily|every ?day|7 days|seven days|all week|7 days a week)\b/.test(text)) return [...DAYS];
  if (/\bm\s*-\s*f\b/.test(text)) return DAYS.slice(0, 5);

  const range = text.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*-\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*/);
  if (range) {
    const start = DAYS.indexOf(range[1]);
    const end = DAYS.indexOf(range[2]);
    const days = [];
    for (let i = start; ; i = (i + 1) % 7) {
      days.push(DAYS[i]);
      if (i === end) break;
      if (days.length > 7) return null;
    }
    return days;
  }

  const found = [...new Set([...text.matchAll(DAY_TOKEN)].map((m) => m[1]))];
  return found.length > 0 ? DAYS.filter((d) => found.includes(d)) : null;
}

export function parseHours(raw) {
  if (!raw || !raw.trim()) return null;
  const text = normalize(raw);
  if (DISQUALIFIERS.test(text)) return null;
  // Single-letter day abbreviations (other than "m-f") are ambiguous: "t-sat", "th-sun", ...
  if (/\b[mtwfs]{1,2}\s*-\s*(mon|tue|wed|thu|fri|sat|sun)/.test(text.replace(/\bm\s*-\s*f\b/, ''))) return null;

  const ranges = [...text.matchAll(TIME_RANGE)];
  if (ranges.length !== 1) return null;

  const [, h1, m1, mer1, h2, m2, mer2] = ranges[0];
  const startHour = Number(h1);
  const endHour = Number(h2);
  if (startHour < 1 || startHour > 12 || endHour < 1 || endHour > 12) return null;

  const endMer = meridiem(mer2);
  if (!endMer) return null;
  const end = to24(endHour, Number(m2 ?? 0), endMer);

  let start;
  const startMer = meridiem(mer1);
  if (startMer) {
    start = to24(startHour, Number(m1 ?? 0), startMer);
  } else {
    start = to24(startHour, Number(m1 ?? 0), endMer);
    if (start >= end) start = to24(startHour, Number(m1 ?? 0), endMer === 'pm' ? 'am' : 'pm');
  }
  if (!(start < end)) return null;

  const days = parseDays(text);
  if (!days || days.length === 0) return null;

  return [{ days, opens: fmt(start), closes: fmt(end) }];
}
