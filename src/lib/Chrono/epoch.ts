/**
 * Timestamp reading and writing: whatever you paste in, every form back out.
 *
 * The hard part is not the formatting, it is deciding what a bare number *is*.
 * `1700000000` and `1700000000000` are the same instant written in different
 * units, and getting it backwards puts you in 1970 or in the year 55000. The rule
 * used here is digit count, which is unambiguous for every timestamp anyone will
 * realistically paste — see {@link parseTimestamp}.
 */

export interface Instant {
  /** Milliseconds since the Unix epoch. */
  ms: number;
  /** How the input was read, so the UI can say so and be corrected if wrong. */
  readAs: string;
}

/** Digit-count thresholds. Ten digits is seconds until the year 2286. */
const SECONDS_DIGITS = 11;
const MILLIS_DIGITS = 14;
const MICROS_DIGITS = 17;

/**
 * Read a pasted value as an instant.
 *
 * A bare integer is read by its length: up to 10 digits is seconds, up to 13 is
 * milliseconds, up to 16 is microseconds, beyond that nanoseconds. Those ranges
 * do not overlap for any timestamp between 1970 and the year 2286, which covers
 * everything that turns up in a log file.
 *
 * Anything not a bare integer is handed to `Date`, which takes ISO 8601, RFC 2822
 * and the loose formats browsers accept. `Date` also happily parses "1" as a
 * year, which is why the integer case is checked first.
 */
export function parseTimestamp(raw: string): Instant | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^-?\d+$/.test(trimmed)) {
    const digits = trimmed.replace("-", "").length;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;

    if (digits < SECONDS_DIGITS) return { ms: n * 1000, readAs: "seconds since 1970" };
    if (digits < MILLIS_DIGITS) return { ms: n, readAs: "milliseconds since 1970" };
    if (digits < MICROS_DIGITS) return { ms: Math.round(n / 1000), readAs: "microseconds since 1970" };
    return { ms: Math.round(n / 1e6), readAs: "nanoseconds since 1970" };
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return { ms: parsed, readAs: "a date string" };
}

export interface RenderedInstant {
  label: string;
  value: string;
  /** Longer note shown under the value where the format needs explaining. */
  note?: string;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** The local-time ISO form, which `toISOString` cannot produce (it is always UTC). */
export function localIso(d: Date): string {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** ISO week number (ISO 8601: weeks start Monday, week 1 holds the first Thursday). */
export function isoWeek(d: Date): number {
  // Shift to the Thursday of this week, then count weeks from the year's first.
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

/** Every representation of one instant, in the order they are most often wanted. */
export function renderInstant(ms: number, timeZone?: string): RenderedInstant[] {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return [];

  const rows: RenderedInstant[] = [
    { label: "Local time", value: d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" }) },
    { label: "ISO 8601 (local)", value: localIso(d) },
    { label: "ISO 8601 (UTC)", value: d.toISOString() },
    { label: "Unix seconds", value: String(Math.floor(ms / 1000)) },
    { label: "Unix milliseconds", value: String(ms) },
    { label: "RFC 2822", value: d.toUTCString() },
    {
      label: "Day of year / ISO week",
      value: `${dayOfYear(d)} / W${pad(isoWeek(d))}`,
      note: `${d.toLocaleDateString(undefined, { weekday: "long" })}, quarter ${Math.floor(d.getMonth() / 3) + 1}`,
    },
  ];

  if (timeZone) {
    try {
      rows.splice(1, 0, {
        label: timeZone.replace(/_/g, " "),
        value: d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium", timeZone }),
      });
    } catch {
      /* an unsupported zone simply isn't shown */
    }
  }

  return rows;
}

/** 1–366. */
export function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}
