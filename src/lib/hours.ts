/**
 * Open/closed status for a listing, computed from its weekly opening windows.
 *
 * - Times are read in Hawaiʻi time (Pacific/Honolulu, no daylight saving).
 * - Hours not confirmed in the last 90 days, or with no windows at all, show
 *   "Hours need confirmation" instead of a status.
 * - Overnight windows (closes earlier than opens) are not supported yet.
 */

export const HOURS_TIME_ZONE = 'Pacific/Honolulu';
export const HOURS_CONFIRM_WINDOW_DAYS = 90;

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export interface OpeningWindow {
  days?: string[] | null;
  /** 24-hour "HH:mm" */
  opens?: string | null;
  /** 24-hour "HH:mm" */
  closes?: string | null;
}

/** `fixed` = weekly opening hours (default). `byBooking` and `none` have no weekly schedule. */
export type HoursKind = 'fixed' | 'byBooking' | 'none';

export interface StatusOptions {
  /** Overrides the hours: the listing is closed until `reopeningDate` ("YYYY-MM-DD"). */
  temporarilyClosed?: boolean | null;
  reopeningDate?: string | null;
  hoursKind?: HoursKind | null;
}

export interface ListingStatus {
  open: boolean;
  /** Empty when there is nothing to show (for example places to stay). */
  label: string;
  needsConfirmation: boolean;
  /** True for by-booking listings and places with no opening hours. */
  noSchedule?: boolean;
}

const TIME_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "16:30" -> 990. Returns undefined for anything that is not a valid 24h time. */
export function toMinutes(time: string | null | undefined): number | undefined {
  const match = time?.match(TIME_24H);
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 990 -> "4:30 pm", 480 -> "8 am", 0 -> "12 am", 720 -> "12 pm". */
export function formatTime(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Current weekday and minutes since midnight in Hawaiʻi time. */
export function hawaiiNow(now: Date): { weekday: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HOURS_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = value('weekday').slice(0, 3).toLowerCase() as Weekday;
  return { weekday, minutes: Number(value('hour')) * 60 + Number(value('minute')) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today's date in Hawaiʻi as "YYYY-MM-DD". */
export function hawaiiToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOURS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** "2026-12-01" -> "Dec 1". */
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${MONTHS[month - 1] ?? ''} ${day}`.trim();
}

export function isConfirmedRecently(confirmedAt: string | null | undefined, now: Date): boolean {
  if (!confirmedAt) return false;
  const confirmed = Date.parse(confirmedAt);
  if (Number.isNaN(confirmed)) return false;
  const windowMs = HOURS_CONFIRM_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - confirmed <= windowMs;
}

interface ValidWindow {
  days: Weekday[];
  opens: number;
  closes: number;
  opensText: string;
  closesText: string;
}

function validWindows(windows: OpeningWindow[] | null | undefined): ValidWindow[] {
  const result: ValidWindow[] = [];
  for (const window of windows ?? []) {
    const opens = toMinutes(window.opens);
    const closes = toMinutes(window.closes);
    if (opens === undefined || closes === undefined || closes <= opens) continue;
    const days = (window.days ?? []).filter((day): day is Weekday => WEEKDAYS.includes(day as Weekday));
    if (days.length === 0) continue;
    result.push({ days, opens, closes, opensText: window.opens!, closesText: window.closes! });
  }
  return result.sort((a, b) => a.opens - b.opens);
}

/** Usable opening windows for one weekday, in minutes since midnight, earliest first. */
export function windowsOnDay(
  windows: OpeningWindow[] | null | undefined,
  weekday: Weekday
): { opens: number; closes: number }[] {
  return validWindows(windows)
    .filter((window) => window.days.includes(weekday))
    .map(({ opens, closes }) => ({ opens, closes }));
}

/** True when the listing has at least one usable weekly window on some day. */
export function hasWeeklyHours(windows: OpeningWindow[] | null | undefined): boolean {
  return validWindows(windows).length > 0;
}

/**
 * Today's opening windows in Hawaiʻi time as readable text, e.g. "8 am to 4 pm" or
 * "8 am to 12 pm and 1 pm to 5 pm". Undefined when no usable window falls on today.
 */
export function getTodayHours(windows: OpeningWindow[] | null | undefined, now: Date = new Date()): string | undefined {
  const { weekday } = hawaiiNow(now);
  const todays = validWindows(windows).filter((window) => window.days.includes(weekday));
  if (todays.length === 0) return undefined;
  return todays.map((window) => `${formatTime(window.opens)} to ${formatTime(window.closes)}`).join(' and ');
}

export function getListingStatus(
  windows: OpeningWindow[] | null | undefined,
  confirmedAt: string | null | undefined,
  now: Date = new Date(),
  options: StatusOptions = {}
): ListingStatus {
  const needsConfirmation: ListingStatus = {
    open: false,
    label: 'Hours need confirmation',
    needsConfirmation: true,
  };

  const confirmedRecently = isConfirmedRecently(confirmedAt, now);

  // Listings without a weekly schedule: a current closure still shows, otherwise a plain tag.
  if (options.hoursKind === 'byBooking' || options.hoursKind === 'none') {
    const closedNow =
      options.temporarilyClosed &&
      confirmedRecently &&
      (!options.reopeningDate || options.reopeningDate > hawaiiToday(now));
    if (!closedNow) {
      return {
        open: false,
        label: options.hoursKind === 'byBooking' ? 'By booking' : '',
        needsConfirmation: false,
        noSchedule: true,
      };
    }
  }

  if (!confirmedRecently) return needsConfirmation;

  if (options.temporarilyClosed) {
    if (!options.reopeningDate) return { open: false, label: 'Temporarily closed', needsConfirmation: false };
    // A reopening date in the past means the closure note is out of date.
    if (options.reopeningDate <= hawaiiToday(now)) return needsConfirmation;
    return {
      open: false,
      label: `Closed · reopens ${formatMonthDay(options.reopeningDate)}`,
      needsConfirmation: false,
    };
  }

  const usable = validWindows(windows);
  if (usable.length === 0) return needsConfirmation;

  const { weekday, minutes } = hawaiiNow(now);
  const todays = usable.filter((window) => window.days.includes(weekday));

  const current = todays.find((window) => minutes >= window.opens && minutes < window.closes);
  if (current) {
    return { open: true, label: `Open · until ${formatTime(current.closes)}`, needsConfirmation: false };
  }

  const later = todays.find((window) => window.opens > minutes);
  if (later) {
    return { open: false, label: `Closed · opens ${formatTime(later.opens)}`, needsConfirmation: false };
  }

  // Closed for the rest of today: find the next day with a window.
  const startIndex = WEEKDAYS.indexOf(weekday);
  for (let offset = 1; offset <= 7; offset++) {
    const day = WEEKDAYS[(startIndex + offset) % 7];
    const next = usable.find((window) => window.days.includes(day));
    if (next) {
      const label =
        offset === 1
          ? `Closed · opens tomorrow ${formatTime(next.opens)}`
          : `Closed · opens ${DAY_NAMES[day]} ${formatTime(next.opens)}`;
      return { open: false, label, needsConfirmation: false };
    }
  }

  return { open: false, label: 'Closed', needsConfirmation: false };
}
