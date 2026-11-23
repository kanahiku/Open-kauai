/**
 * Content for the Plan with AI page (/plan/). All copy and the time, budget and interest choices
 * come from the `planPage` document; regions come from the `region` documents. Nothing is written here
 * except the weekday names, which are calendar facts.
 */
import { getSanityClient } from '~/lib/sanity/client';
import { PLAN_PAGE_QUERY, REGIONS_QUERY } from '~/lib/sanity/queries';
import { WEEKDAYS, type Weekday } from '~/lib/hours';

export interface PlanTimeOption {
  _key: string;
  label: string;
  startTime: string;
  hours: number;
  stops: number;
}

export interface PlanBudgetOption {
  _key: string;
  label: string;
  maxLevel?: number | null;
}

export interface PlanInterest {
  _key: string;
  label: string;
  categoryIds: string[];
}

export interface PlanCopy {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  regionLabel?: string;
  anyRegionLabel?: string;
  dayLabel?: string;
  todaySuffix?: string;
  timeLabel?: string;
  budgetLabel?: string;
  interestsLabel?: string;
  askLabel?: string;
  askPlaceholder?: string;
  submitLabel?: string;
  buildingLabel?: string;
  invalidMessage?: string;
  errorMessage?: string;
  limitMessage?: string;
  timeOptions?: PlanTimeOption[] | null;
  budgetOptions?: PlanBudgetOption[] | null;
  interests?: PlanInterest[] | null;
  resultTitleTemplate?: string;
  resultAllRegionTitleTemplate?: string;
  resultNote?: string;
  stopLabelTemplate?: string;
  minutesTemplate?: string;
  hoursTemplate?: string;
  whyLabel?: string;
  viewListingLabel?: string;
  directionsLabel?: string;
  distanceTemplate?: string;
  openAtTimeLabel?: string;
  byBookingLabel?: string;
  unconfirmedLabel?: string;
  summaryLabel?: string;
  basicNote?: string;
  emptyTitle?: string;
  emptyBody?: string;
  travelBufferMinutes?: number | null;
  howTitle?: string;
  howPoints?: string[] | null;
}

export interface PlanRegion {
  slug: string;
  title: string;
  areaIds: string[];
}

interface RawRegion {
  title?: string;
  slug?: string;
  areas?: ({ _id: string } | null)[] | null;
}

const DAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const dayName = (day: Weekday) => DAY_NAMES[day];

/** Monday to Sunday, in the order they are listed in the form. */
export const dayOptions = () => WEEKDAYS.map((value) => ({ value, label: DAY_NAMES[value] }));

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'string' && (WEEKDAYS as string[]).includes(value);
}

async function fetchCopy(): Promise<PlanCopy> {
  const copy = await getSanityClient().fetch<PlanCopy | null>(PLAN_PAGE_QUERY);
  if (!copy?.title) {
    throw new Error(
      'The "planPage" document is missing or has no title. Create and publish it in the Studio, or run `npm run seed:plan`.'
    );
  }
  if (!copy.timeOptions?.length || !copy.budgetOptions?.length) {
    throw new Error('The "planPage" document needs at least one time option and one budget option.');
  }
  return copy;
}

async function fetchRegions(): Promise<PlanRegion[]> {
  const raw = await getSanityClient().fetch<RawRegion[]>(REGIONS_QUERY);
  return raw
    .filter((region): region is RawRegion & { title: string; slug: string } => Boolean(region.title && region.slug))
    .map((region) => ({
      slug: region.slug,
      title: region.title,
      areaIds: (region.areas ?? []).flatMap((area) => (area?._id ? [area._id] : [])),
    }))
    .filter((region) => region.areaIds.length > 0);
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

/** Cached briefly per server instance, so a burst of requests does not repeat the same fetch. */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (import.meta.env.DEV) return load();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at <= TTL_MS) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: now, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}

export const loadPlanCopy = () => cached('copy', fetchCopy);
export const loadPlanRegions = () => cached('regions', fetchRegions);
