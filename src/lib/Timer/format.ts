/** Time formatting & parsing helpers shared across the Timer tools. */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

const pad = (n: number) => String(n).padStart(2, "0");

/** Split a duration (ms) into whole h / m / s, rounding up so a countdown shows
 *  the current second until it truly hits zero. */
export function splitClock(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

/** Countdown / duration clock: `M:SS`, `MM:SS`, or `H:MM:SS` when ≥ 1 hour. */
export function formatClock(ms: number): string {
  const { h, m, s } = splitClock(ms);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Stopwatch clock with centiseconds (floored): `MM:SS.CS` or `H:MM:SS.CS`. */
export function formatWatch(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalCs = Math.floor(clamped / 10);
  const cs = totalCs % 100;
  const totalS = Math.floor(totalCs / 100);
  const s = totalS % 60;
  const m = Math.floor(totalS / 60) % 60;
  const h = Math.floor(totalS / 3600);
  const base = `${pad(m)}:${pad(s)}.${pad(cs)}`;
  return h > 0 ? `${h}:${base}` : base;
}

/** Compose h/m/s into milliseconds. */
export const partsToMs = (h: number, m: number, s: number): number =>
  (h * 3600 + m * 60 + s) * 1000;

/** Compact human label, e.g. "45s", "25m", "1h 30m", "2h". */
export function humanDuration(ms: number): string {
  const { h, m, s } = splitClock(ms);
  if (h === 0 && m === 0) return `${s}s`;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (h === 0 && s > 0) parts.push(`${s}s`);
  return parts.join(" ");
}
