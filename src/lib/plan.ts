/**
 * Builds a day plan. Every stop is a real, listed business read from Sanity. The AI (see
 * `plan-ai.ts`) picks and orders them; this file filters the businesses the AI may choose from,
 * checks what comes back, and sets the times itself from each business's opening hours. When the
 * AI is not set up or does not answer, the day is built from the same list without it.
 */
import { getSanityClient } from '~/lib/sanity/client';
import { PLAN_BUSINESSES_QUERY } from '~/lib/sanity/queries';
import { resolveContentImage } from '~/lib/sanity/image';
import type { RawBusiness } from '~/lib/home';
import { fillTemplate } from '~/lib/business-page';
import {
  formatTime,
  hasWeeklyHours,
  hawaiiToday,
  isConfirmedRecently,
  toMinutes,
  windowsOnDay,
  type Weekday,
} from '~/lib/hours';
import { aiConfigured, askAi, type AiCandidate } from '~/lib/plan-ai';
import { dayName, isWeekday, type PlanCopy, type PlanRegion } from '~/lib/plan-page';
import type { ListingLabels } from '~/lib/site';

export const ALL_REGIONS = 'all';

const MIN_VISIT = 30;
const MAX_WAIT = 90;
const DEFAULT_BUFFER = 30;
const SHORTLIST = 36;
const LAST_MINUTE_OF_PLAN = 23 * 60 + 30;

export interface PlanRequest {
  region: string;
  day: Weekday;
  time: string;
  budget: string;
  interests: string[];
  note: string;
}

export interface PlanStop {
  time: string;
  label: string;
  name: string;
  href: string;
  photo: string;
  meta: string;
  price: string;
  ownership?: 'local' | 'franchise';
  ownershipLabel: string;
  why: string;
  statusLabel: string;
  open: boolean;
  directionsUrl: string;
  distance: string;
}

export interface PlanResult {
  mode: 'ai' | 'basic';
  title: string;
  note: string;
  summary: string;
  basicNote: string;
  stops: PlanStop[];
}

interface RawPlanBusiness extends RawBusiness {
  featured?: boolean | null;
  section?: string | null;
  categoryId?: string | null;
  categoryTitle?: string | null;
}

type HoursMode = 'windows' | 'flexible' | 'unknown';

interface Candidate {
  id: string;
  name: string;
  slug: string;
  kind: string;
  area: string;
  categoryTitle: string;
  section: string;
  price: string;
  ownership?: 'local' | 'franchise';
  knownFor: string;
  photo: string;
  lat: number;
  lng: number;
  mode: HoursMode;
  windows: { opens: number; closes: number }[];
  confirmed: boolean;
  booking: boolean;
  score: number;
}

interface Pick {
  candidate: Candidate;
  minutes: number;
  type: string;
  why: string;
}

interface Scheduled extends Pick {
  start: number;
}

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** "the loco moco" -> "The loco moco". Listings write "known for" as a lower-case phrase. */
const sentence = (value: string): string => (value ? value.charAt(0).toLocaleUpperCase('en-US') + value.slice(1) : '');

// ---------- request ----------

/** Check the request against what the page offers. Returns undefined when anything is off. */
export function parseRequest(body: unknown, copy: PlanCopy, regions: PlanRegion[]): PlanRequest | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const data = body as Record<string, unknown>;

  const region = clean(data.region, 60);
  const regionOk =
    regions.some((item) => item.slug === region) || (region === ALL_REGIONS && Boolean(copy.anyRegionLabel));
  const day = data.day;
  const time = clean(data.time, 60);
  const budget = clean(data.budget, 60);
  if (!regionOk || !isWeekday(day)) return undefined;
  if (!(copy.timeOptions ?? []).some((option) => option._key === time)) return undefined;
  if (!(copy.budgetOptions ?? []).some((option) => option._key === budget)) return undefined;

  const known = new Set((copy.interests ?? []).map((interest) => interest._key));
  const interests = Array.isArray(data.interests)
    ? [...new Set(data.interests.map((value) => clean(value, 60)).filter((key) => known.has(key)))].slice(0, 8)
    : [];

  return { region, day, time, budget, interests, note: clean(data.note, 300) };
}

// ---------- candidates ----------

async function loadCandidates(
  request: PlanRequest,
  copy: PlanCopy,
  regions: PlanRegion[],
  now: Date
): Promise<Candidate[]> {
  const everywhere = request.region === ALL_REGIONS;
  const areaIds = regions.find((region) => region.slug === request.region)?.areaIds ?? [];
  const raw = await getSanityClient().fetch<RawPlanBusiness[]>(PLAN_BUSINESSES_QUERY, { all: everywhere, areaIds });

  const chosen = (copy.interests ?? []).filter((interest) => request.interests.includes(interest._key));
  const wanted = new Set(chosen.flatMap((interest) => interest.categoryIds ?? []));
  const maxLevel = (copy.budgetOptions ?? []).find((option) => option._key === request.budget)?.maxLevel ?? undefined;
  const today = hawaiiToday(now);

  const candidates: Candidate[] = [];
  for (const business of raw) {
    if (!business.name || !business.slug || !Number.isFinite(business.lat) || !Number.isFinite(business.lng)) continue;

    // With no interest chosen, a day is built from places to eat and things to do.
    const inScope =
      wanted.size > 0
        ? wanted.has(business.categoryId ?? '')
        : business.section === 'dining' || business.section === 'activities';
    if (!inScope) continue;

    const level = business.priceLevel?.length ?? 0;
    if (maxLevel && level > maxLevel) continue;

    if (business.temporarilyClosed && (!business.reopeningDate || business.reopeningDate > today)) continue;

    const noSchedule = business.hoursKind === 'byBooking' || business.hoursKind === 'none';
    const windows = windowsOnDay(business.openingHours, request.day);
    let mode: HoursMode;
    if (noSchedule) mode = 'flexible';
    else if (!hasWeeklyHours(business.openingHours)) mode = 'unknown';
    else if (windows.length === 0) continue;
    else mode = 'windows';

    const confirmed = mode === 'windows' && isConfirmedRecently(business.hoursConfirmedAt, now);
    const ownership =
      business.ownership === 'local' || business.ownership === 'franchise' ? business.ownership : undefined;
    const interestMatch = wanted.has(business.categoryId ?? '');
    const photo = resolveContentImage(business.photo, { width: 640, height: 640 })?.src ?? '';

    candidates.push({
      id: business._id,
      name: business.name,
      slug: business.slug,
      kind: clean(business.kind, 60),
      area: clean(business.area, 60),
      categoryTitle: clean(business.categoryTitle, 60),
      section: business.section ?? '',
      price: clean(business.priceLevel, 8),
      ownership,
      knownFor: clean(business.knownFor, 200),
      photo,
      lat: business.lat as number,
      lng: business.lng as number,
      mode,
      windows: mode === 'windows' ? windows : [],
      confirmed,
      booking: business.hoursKind === 'byBooking',
      // A little noise keeps two identical requests from always returning the same day.
      score:
        (ownership === 'local' ? 3 : 0) +
        (confirmed ? 2 : mode === 'flexible' ? 1 : 0) +
        (business.featured ? 1 : 0) +
        (interestMatch ? 2 : 0) +
        (photo ? 1 : 0) +
        (business.knownFor ? 1 : 0) +
        Math.random() * 1.5,
    });
  }
  return candidates;
}

/** The best few per section, taken in turns, so the AI sees a mix of places to eat and things to do. */
function shortlist(candidates: Candidate[], limit: number): Candidate[] {
  const groups = new Map<string, Candidate[]>();
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    const group = groups.get(candidate.section) ?? [];
    group.push(candidate);
    groups.set(candidate.section, group);
  }
  const lists = [...groups.values()];
  const result: Candidate[] = [];
  for (let index = 0; result.length < limit && lists.some((list) => index < list.length); index++) {
    for (const list of lists) {
      if (index < list.length && result.length < limit) result.push(list[index]);
    }
  }
  return result;
}

function hoursForAi(candidate: Candidate): string {
  if (candidate.mode === 'windows') {
    const text = candidate.windows
      .map((window) => `${formatTime(window.opens)} to ${formatTime(window.closes)}`)
      .join(', ');
    return candidate.confirmed ? text : `${text} (not recently confirmed)`;
  }
  if (candidate.mode === 'flexible') return candidate.booking ? 'by booking' : 'flexible';
  return 'unknown';
}

const toAiCandidate = (candidate: Candidate): AiCandidate => ({
  id: candidate.id,
  name: candidate.name,
  type: candidate.kind || candidate.categoryTitle,
  section: candidate.section,
  area: candidate.area,
  price: candidate.price,
  locallyOwned: candidate.ownership === 'local',
  knownFor: candidate.knownFor,
  hours: hoursForAi(candidate),
});

// ---------- scheduling ----------

/**
 * Put the stops in order on the clock. A stop that is closed when the visitor would arrive waits for
 * opening (up to `MAX_WAIT` minutes), is cut short at closing time, and is dropped if it cannot fit.
 */
function schedule(picks: Pick[], startMin: number, endMin: number, buffer: number): Scheduled[] {
  const result: Scheduled[] = [];
  let cursor = startMin;
  for (const pick of picks) {
    const { candidate } = pick;
    let start = cursor;
    let minutes = pick.minutes;

    if (candidate.mode === 'windows') {
      const window = candidate.windows.find((item) => Math.max(cursor, item.opens) + MIN_VISIT <= item.closes);
      if (!window) continue;
      start = Math.max(cursor, window.opens);
      if (start - cursor > MAX_WAIT) continue;
      minutes = Math.min(minutes, window.closes - start);
    }

    minutes = Math.min(minutes, endMin - start);
    if (minutes < MIN_VISIT) continue;

    result.push({ ...pick, start, minutes });
    cursor = start + minutes + buffer;
  }
  return result;
}

// ---------- without the AI ----------

function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Best-scoring places, alternating food and activities, each one close to the last. */
function basicPicks(candidates: Candidate[], maxStops: number, startMin: number): Pick[] {
  const order = startMin < 11 * 60 ? ['dining', 'activities'] : ['activities', 'dining'];
  const used = new Set<string>();
  const picks: Pick[] = [];
  let previous: Candidate | undefined;

  for (let index = 0; index < maxStops; index++) {
    const section = order[index % order.length];
    let pool = candidates.filter((item) => !used.has(item.id) && item.section === section);
    if (pool.length === 0) pool = candidates.filter((item) => !used.has(item.id));
    if (pool.length === 0) break;
    const top = [...pool].sort((a, b) => b.score - a.score).slice(0, 6);
    const next = previous ? top.sort((a, b) => miles(previous!, a) - miles(previous!, b))[0] : top[0];
    used.add(next.id);
    previous = next;
    picks.push({
      candidate: next,
      minutes: section === 'dining' ? 60 : 90,
      type: next.kind || next.categoryTitle,
      why: sentence(next.knownFor || next.kind),
    });
  }
  return picks;
}

// ---------- result ----------

function durationLabel(minutes: number, copy: PlanCopy): string {
  if (minutes < 60) return fillTemplate(copy.minutesTemplate ?? '', { count: String(minutes) });
  return fillTemplate(copy.hoursTemplate ?? '', { count: String(Math.round(minutes / 30) / 2) });
}

function describeStatus(scheduled: Scheduled, copy: PlanCopy): { label: string; open: boolean } {
  const { candidate } = scheduled;
  if (candidate.mode === 'windows' && candidate.confirmed) return { label: copy.openAtTimeLabel ?? '', open: true };
  if (candidate.mode === 'flexible')
    return { label: candidate.booking ? (copy.byBookingLabel ?? '') : '', open: false };
  return { label: copy.unconfirmedLabel ?? '', open: false };
}

function toStops(scheduled: Scheduled[], copy: PlanCopy, labels: ListingLabels): PlanStop[] {
  return scheduled.map((item, index) => {
    const { candidate } = item;
    const previous = scheduled[index - 1]?.candidate;
    const status = describeStatus(item, copy);
    const away = previous && copy.distanceTemplate ? miles(previous, candidate) : undefined;
    return {
      time: formatTime(item.start),
      label: fillTemplate(copy.stopLabelTemplate ?? '', {
        n: String(index + 1),
        type: item.type,
        duration: durationLabel(item.minutes, copy),
      }),
      name: candidate.name,
      href: `/business/${candidate.slug}/`,
      photo: candidate.photo,
      meta: [candidate.area, candidate.kind].filter(Boolean).join(' · '),
      price: candidate.price,
      ownership: candidate.ownership,
      ownershipLabel:
        (candidate.ownership === 'local' ? labels.ownedLabel : candidate.ownership ? labels.franchiseLabel : '') ?? '',
      why: item.why,
      statusLabel: status.label,
      open: status.open,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${candidate.lat},${candidate.lng}`,
      distance: away !== undefined ? fillTemplate(copy.distanceTemplate ?? '', { miles: away.toFixed(1) }) : '',
    };
  });
}

/** Build the day for a checked request. */
export async function buildPlan(
  request: PlanRequest,
  copy: PlanCopy,
  regions: PlanRegion[],
  labels: ListingLabels,
  now: Date = new Date()
): Promise<PlanResult> {
  const option = (copy.timeOptions ?? []).find((item) => item._key === request.time);
  const startMin = toMinutes(option?.startTime) ?? 9 * 60;
  const endMin = Math.min(startMin + Math.round((option?.hours ?? 8) * 60), LAST_MINUTE_OF_PLAN);
  const maxStops = Math.max(1, option?.stops ?? 4);
  const buffer = copy.travelBufferMinutes ?? DEFAULT_BUFFER;
  const region = regions.find((item) => item.slug === request.region);
  const day = dayName(request.day);

  const title =
    request.region === ALL_REGIONS
      ? fillTemplate(copy.resultAllRegionTitleTemplate ?? '', { day })
      : fillTemplate(copy.resultTitleTemplate ?? '', { region: region?.title ?? '', day });
  const base = { title, note: copy.resultNote ?? '' };

  const candidates = await loadCandidates(request, copy, regions, now);
  if (candidates.length === 0) return { ...base, mode: 'basic', summary: '', basicNote: '', stops: [] };

  if (aiConfigured()) {
    const pool = shortlist(candidates, SHORTLIST);
    const byId = new Map(pool.map((candidate) => [candidate.id, candidate]));
    const budget = (copy.budgetOptions ?? []).find((item) => item._key === request.budget)?.label ?? '';
    const interests = (copy.interests ?? [])
      .filter((interest) => request.interests.includes(interest._key))
      .map((interest) => interest.label);

    const reply = await askAi({
      day,
      region: region?.title ?? 'all of Kauaʻi',
      startsAt: formatTime(startMin),
      endsBy: formatTime(endMin),
      maxStops,
      budget,
      interests,
      note: request.note,
      candidates: pool.map(toAiCandidate),
    });

    if (reply) {
      const picks: Pick[] = [];
      for (const stop of reply.stops) {
        const candidate = byId.get(stop.id);
        if (!candidate) continue; // Not one of the businesses we offered: ignore it.
        picks.push({
          candidate,
          minutes: Math.round(stop.minutes / 5) * 5,
          type: stop.type || candidate.kind || candidate.categoryTitle,
          why: stop.why || sentence(candidate.knownFor),
        });
      }
      const scheduled = schedule(picks, startMin, endMin, buffer);
      if (scheduled.length > 0) {
        return { ...base, mode: 'ai', summary: reply.summary, basicNote: '', stops: toStops(scheduled, copy, labels) };
      }
    }
  }

  const scheduled = schedule(basicPicks(candidates, maxStops, startMin), startMin, endMin, buffer);
  return {
    ...base,
    mode: 'basic',
    summary: '',
    basicNote: copy.basicNote ?? '',
    stops: toStops(scheduled, copy, labels),
  };
}
