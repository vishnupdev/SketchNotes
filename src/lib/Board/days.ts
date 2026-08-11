/**
 * Day keys for the habit sections.
 *
 * A habit is ticked per calendar day *in the user's own time zone*, so the key
 * is a local `YYYY-MM-DD` string rather than an epoch offset: a UTC-based bucket
 * would flip a day early or late for anyone east or west of UTC, and would move
 * under them at a DST boundary.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar-day key for a timestamp (defaults to now). */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Single-letter weekday initial for a day key, for the habit strip's header. */
export function dayInitial(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "narrow" });
}

/** Full, spoken date for a day key — used for the tick button's label. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * The last `n` calendar days ending today, oldest first. Built by stepping a
 * local Date object rather than subtracting 24h at a time, so the run stays
 * correct across a daylight-saving change.
 */
export function recentDays(n: number, now: number = Date.now()): string[] {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    out.push(dayKey(day.getTime()));
  }
  return out;
}

/**
 * How many days in a row up to today are marked done. Today not being ticked
 * yet doesn't break the streak — the run is measured from yesterday in that
 * case, so a morning glance doesn't read "0".
 */
export function streak(done: string[], now: number = Date.now()): number {
  const set = new Set(done);
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  if (!set.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (set.has(dayKey(d.getTime()))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
