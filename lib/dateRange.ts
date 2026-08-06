/**
 * All reporting day boundaries live here.
 *
 * Reports are read by a single workshop in Bangladesh, so a "day" means a
 * Dhaka calendar day — not a UTC day and not the server's local day. Asia/Dhaka
 * is UTC+6 year-round with no daylight saving, so a fixed offset is exact and
 * keeps these functions deterministic no matter what TZ the test runner or the
 * production host is set to.
 *
 * MongoDB aggregations that group by day MUST pass `timezone: REPORT_TIMEZONE`
 * to $dateToString so their day keys line up with dayKey() here.
 */

export const REPORT_TIMEZONE = "Asia/Dhaka";

const OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar day in Dhaka, formatted "YYYY-MM-DD". */
export type DayKey = string;

export type DateRange = { fromDay: DayKey; toDay: DayKey };

export type RangePreset =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisYear";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
];

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The Dhaka calendar day that a given instant falls on. */
export function dayKey(date: Date): DayKey {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The first instant of a Dhaka day, as a UTC Date. */
export function startOfDayUtc(day: DayKey): Date {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - OFFSET_MS);
}

/** The last instant of a Dhaka day, as a UTC Date. Inclusive. */
export function endOfDayUtc(day: DayKey): Date {
  return new Date(startOfDayUtc(day).getTime() + DAY_MS - 1);
}

/** True only for a well-formed day key that names a real calendar date. */
export function isValidDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Rejects overflow like "2026-02-31", which Date silently rolls forward.
  return parsed.toISOString().slice(0, 10) === value;
}

function shiftDay(day: DayKey, deltaDays: number): DayKey {
  const shifted = new Date(Date.parse(`${day}T00:00:00.000Z`) + deltaDays * DAY_MS);
  return shifted.toISOString().slice(0, 10);
}

export function resolvePreset(preset: RangePreset, now: Date = new Date()): DateRange {
  const today = dayKey(now);

  // No `default` branch: the switch covers every RangePreset member, so
  // TypeScript proves exhaustiveness and a future preset becomes a compile error.
  switch (preset) {
    case "today":
      return { fromDay: today, toDay: today };
    case "last7":
      return { fromDay: shiftDay(today, -6), toDay: today };
    case "last30":
      return { fromDay: shiftDay(today, -29), toDay: today };
    case "thisMonth":
      return { fromDay: `${today.slice(0, 7)}-01`, toDay: today };
    case "lastMonth": {
      const lastDayOfPrevMonth = shiftDay(`${today.slice(0, 7)}-01`, -1);
      return {
        fromDay: `${lastDayOfPrevMonth.slice(0, 7)}-01`,
        toDay: lastDayOfPrevMonth,
      };
    }
    case "thisYear":
      return { fromDay: `${today.slice(0, 4)}-01-01`, toDay: today };
  }
}

/**
 * Turns raw query-string values into a range. Anything malformed, partial, or
 * duplicated (Next gives string[] for repeated params) falls back to the
 * 30-day default rather than throwing, so a hand-edited URL can't break the page.
 */
export function parseDateRange(from: unknown, to: unknown, now: Date = new Date()): DateRange {
  if (!isValidDayKey(from) || !isValidDayKey(to)) {
    return resolvePreset("last30", now);
  }
  return from <= to ? { fromDay: from, toDay: to } : { fromDay: to, toDay: from };
}

/** Every day from fromDay to toDay, both inclusive. */
export function eachDayInRange(range: DateRange): DayKey[] {
  const days: DayKey[] = [];
  let cursor = range.fromDay;
  while (cursor <= range.toDay) {
    days.push(cursor);
    cursor = shiftDay(cursor, 1);
  }
  return days;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDay(day: DayKey): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatRangeLabel(range: DateRange): string {
  if (range.fromDay === range.toDay) return formatDay(range.fromDay);
  return `${formatDay(range.fromDay)} — ${formatDay(range.toDay)}`;
}
