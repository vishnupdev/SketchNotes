/**
 * Duration arithmetic: read "1h 20m 30s", write it back, and add it to an instant.
 *
 * Kept apart from the timestamp module because a duration is a *length*, not a
 * point — the two are only related by the one operation at the bottom of this
 * file, and keeping them apart is what stops "an hour" and "one o'clock" from
 * ever being the same value.
 */

/** Multiplier in milliseconds for each unit a duration can be written in. */
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  wk: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
};

export type DurationParse = { ok: true; ms: number } | { ok: false; error: string };

/**
 * Parse a written duration into milliseconds.
 *
 * Accepts the three shapes people actually write:
 *
 *   "1h 20m 30s"   unit-suffixed parts, in any order, with or without spaces
 *   "90"           a bare number, read as minutes (the common shorthand)
 *   "01:20:30"     clock notation — h:m:s, or m:s for two parts
 *
 * Negative totals are allowed on purpose: "-2h" is how you subtract in the
 * add-to-a-date tool, and rejecting it would mean a separate direction control.
 */
export function parseDuration(raw: string): DurationParse {
  const input = raw.trim().toLowerCase();
  if (!input) return { ok: false, error: "Enter a duration." };

  // Clock notation — checked first, because "1:30" is unambiguous and would
  // otherwise fall through to the unit parser as garbage.
  if (/^-?\d+(:\d{1,2}){1,2}$/.test(input)) {
    const negative = input.startsWith("-");
    const parts = input.replace("-", "").split(":").map(Number);
    const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
    const total = h * 3_600_000 + m * 60_000 + s * 1000;
    return { ok: true, ms: negative ? -total : total };
  }

  // A bare number means minutes: "remind me in 20" is minutes everywhere.
  if (/^-?\d+(\.\d+)?$/.test(input)) {
    return { ok: true, ms: Number(input) * 60_000 };
  }

  const matches = [...input.matchAll(/(-?\d+(?:\.\d+)?)\s*([a-z]+)/g)];
  if (matches.length === 0) {
    return { ok: false, error: 'Try something like "1h 20m", "90" for minutes, or "01:20:30".' };
  }

  // Reject leftovers rather than silently ignoring them, so a typo in
  // "2 huors" is reported instead of being read as 2 of nothing.
  const consumed = matches.reduce((n, m) => n + m[0].length, 0);
  const stripped = input.replace(/[\s,]/g, "").length;
  const matchedStripped = matches.reduce((n, m) => n + m[0].replace(/[\s,]/g, "").length, 0);
  if (matchedStripped < stripped && consumed < input.length) {
    const unknown = input.replace(/(-?\d+(?:\.\d+)?)\s*[a-z]+/g, "").replace(/[\s,]/g, "");
    if (unknown) return { ok: false, error: `"${unknown}" is not a unit of time.` };
  }

  let ms = 0;
  for (const [, value, unit] of matches) {
    const factor = UNIT_MS[unit];
    if (factor === undefined) return { ok: false, error: `"${unit}" is not a unit of time.` };
    ms += Number(value) * factor;
  }

  return { ok: true, ms };
}

/**
 * Write a duration out in the largest units that fit.
 *
 * Weeks are deliberately *not* used here even though the parser accepts them:
 * "3w 2d" is harder to hold in your head than "23d", and days are the largest
 * unit that means exactly one thing (a month does not).
 */
export function formatDuration(ms: number, { compact = false } = {}): string {
  if (!Number.isFinite(ms)) return "—";
  const negative = ms < 0;
  let rest = Math.abs(Math.round(ms));

  const parts: string[] = [];
  const push = (size: number, short: string, long: string) => {
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(compact ? `${n}${short}` : `${n} ${long}${n === 1 ? "" : "s"}`);
      rest -= n * size;
    }
  };

  push(86_400_000, "d", "day");
  push(3_600_000, "h", "hour");
  push(60_000, "m", "minute");
  push(1000, "s", "second");
  if (rest > 0 || parts.length === 0) parts.push(compact ? `${rest}ms` : `${rest} millisecond${rest === 1 ? "" : "s"}`);

  // Three parts is the readable limit; "2 days 4 hours 13 minutes" is a sentence,
  // and adding seconds and milliseconds to it makes it a data dump.
  const shown = parts.slice(0, 3).join(compact ? " " : ", ");
  return negative ? `-${shown}` : shown;
}

/** Every unit's view of one duration, for the breakdown table. */
export function durationBreakdown(ms: number): { label: string; value: string }[] {
  const abs = Math.abs(ms);
  const rows: [string, number][] = [
    ["Milliseconds", abs],
    ["Seconds", abs / 1000],
    ["Minutes", abs / 60_000],
    ["Hours", abs / 3_600_000],
    ["Days", abs / 86_400_000],
    ["Weeks", abs / 604_800_000],
  ];
  return rows.map(([label, value]) => ({
    label,
    value: (ms < 0 ? -value : value).toLocaleString(undefined, { maximumFractionDigits: 4 }),
  }));
}

/**
 * Add a duration to an instant.
 *
 * Plain millisecond arithmetic, which is the correct answer for a *duration* —
 * "in 24 hours" means 86,400,000 ms later even across a daylight-saving change,
 * where "tomorrow at this time" would not. The two differ twice a year and this
 * tool is the former.
 */
export const shiftInstant = (ms: number, byMs: number): number => ms + byMs;
