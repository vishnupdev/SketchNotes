/**
 * Date helpers for the Todos calendar views. All ranges are half-open
 * `[start, end)` in epoch-ms and every "start of …" collapses to local
 * midnight, so a task's `due` (always a start-of-day value) can be compared
 * with plain `>=`/`<` against a period range. Weeks start on Monday.
 */

import type { ViewMode } from "./types";

export const DAY_MS = 86_400_000;

const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Local midnight for the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local midnight on the Monday of the week containing `ts`. */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts));
  const mondayIdx = (d.getDay() + 6) % 7; // Mon → 0 … Sun → 6
  d.setDate(d.getDate() - mondayIdx);
  return d.getTime();
}

/** Local midnight on the first day of the month containing `ts`. */
export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/** Local midnight on Jan 1 of the year containing `ts`. */
export function startOfYear(ts: number): number {
  return new Date(new Date(ts).getFullYear(), 0, 1).getTime();
}

/** Half-open range covering the whole period that `anchor` falls in. */
export function periodRange(view: ViewMode, anchor: number): { start: number; end: number } {
  switch (view) {
    case "day": {
      const start = startOfDay(anchor);
      return { start, end: start + DAY_MS };
    }
    case "week": {
      const start = startOfWeek(anchor);
      return { start, end: start + 7 * DAY_MS };
    }
    case "month": {
      const d = new Date(anchor);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return { start, end };
    }
    case "year": {
      const y = new Date(anchor).getFullYear();
      return { start: new Date(y, 0, 1).getTime(), end: new Date(y + 1, 0, 1).getTime() };
    }
  }
}

/** Move the anchor forward (`+1`) or back (`-1`) by one period of `view`. */
export function shiftPeriod(view: ViewMode, anchor: number, dir: 1 | -1): number {
  const d = new Date(anchor);
  switch (view) {
    case "day":
      return startOfDay(anchor + dir * DAY_MS);
    case "week":
      return startOfWeek(anchor) + dir * 7 * DAY_MS;
    case "month":
      return new Date(d.getFullYear(), d.getMonth() + dir, 1).getTime();
    case "year":
      return new Date(d.getFullYear() + dir, 0, 1).getTime();
  }
}

export const isSameDay = (a: number, b: number): boolean => startOfDay(a) === startOfDay(b);

/** The seven Monday-based day-starts of the week containing `ts`. */
export function weekDays(ts: number): number[] {
  const start = startOfWeek(ts);
  return Array.from({ length: 7 }, (_, i) => start + i * DAY_MS);
}

/**
 * The 6×7 grid of day-starts for a month calendar, padded with leading/trailing
 * days from the adjacent months so every row is full.
 */
export function monthGrid(ts: number): number[] {
  const first = startOfMonth(ts);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => gridStart + i * DAY_MS);
}

/** The twelve month-starts of the year containing `ts`. */
export function yearMonths(ts: number): number[] {
  const y = new Date(ts).getFullYear();
  return Array.from({ length: 12 }, (_, m) => new Date(y, m, 1).getTime());
}

export const isToday = (ts: number, now: number): boolean => isSameDay(ts, now);

/** e.g. "Wed" */
export const weekdayShort = (ts: number): string => WEEKDAY_SHORT[new Date(ts).getDay()];
/** e.g. "Wednesday" */
export const weekdayLong = (ts: number): string => WEEKDAY_LONG[new Date(ts).getDay()];
/** e.g. "Jul" */
export const monthShort = (ts: number): string => MONTH_SHORT[new Date(ts).getMonth()];
/** e.g. "July" */
export const monthLong = (ts: number): string => MONTH_LONG[new Date(ts).getMonth()];

/** Day-of-month number, e.g. 22. */
export const dayNum = (ts: number): number => new Date(ts).getDate();

/** Short calendar label, e.g. "Wed, Jul 22". */
export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** Full calendar date, e.g. "21 September 2026". */
export function longDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * A friendly, relative-aware label for a due date given "now":
 * "Today", "Tomorrow", "Yesterday", else a short date (with year if not this year).
 */
export function dueLabel(ts: number, now: number): string {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = new Date(ts);
  const base = `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

/** Heading for the currently-framed period, e.g. "July 2026" or "Jul 21 – 27, 2026". */
export function periodLabel(view: ViewMode, anchor: number, now: number): string {
  switch (view) {
    case "day": {
      const d = new Date(startOfDay(anchor));
      const rel = dueLabel(anchor, now);
      const full = `${WEEKDAY_LONG[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
      return rel === "Today" || rel === "Tomorrow" || rel === "Yesterday" ? `${rel} · ${full}` : full;
    }
    case "week": {
      const start = new Date(startOfWeek(anchor));
      const end = new Date(startOfWeek(anchor) + 6 * DAY_MS);
      const sameMonth = start.getMonth() === end.getMonth();
      const left = `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}`;
      const right = sameMonth
        ? `${end.getDate()}`
        : `${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
      return `${left} – ${right}, ${end.getFullYear()}`;
    }
    case "month": {
      const d = new Date(anchor);
      return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
    }
    case "year":
      return `${new Date(anchor).getFullYear()}`;
  }
}
