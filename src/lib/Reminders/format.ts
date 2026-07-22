/** Date-time formatting for reminders (self-contained; no cross-app imports). */

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** 12-hour clock, e.g. "2:30 PM". */
export function clockTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

/** `<input type="datetime-local">` value for a timestamp. */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local value to epoch ms, or null if blank/invalid. */
export function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Friendly fire label, e.g. "Today · 2:30 PM" or "Mon, 21 Sep 2026 · 2:30 PM". */
export function fireLabel(ts: number, now: number): string {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY_MS);
  const time = clockTime(ts);
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Tomorrow · ${time}`;
  if (diff === -1) return `Yesterday · ${time}`;
  const d = new Date(ts);
  const withYear = d.getFullYear() !== new Date(now).getFullYear();
  const date = `${WEEKDAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
  return `${date} · ${time}`;
}

/** Short relative countdown, e.g. "in 2h 5m", "in 3 days", "overdue". */
export function timeUntil(ts: number, now: number): string {
  const ms = ts - now;
  if (ms <= 0) return "overdue";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  const days = Math.round(hrs / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/** Round a timestamp up to the next quarter-hour — a sensible default fire time. */
export function nextQuarterHour(now: number): number {
  const step = 15 * 60_000;
  return Math.ceil((now + 1) / step) * step;
}
