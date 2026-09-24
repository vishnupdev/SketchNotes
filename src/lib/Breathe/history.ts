/**
 * Breathe's log: what was practised, and when — kept as the raw sessions so
 * every figure (streak, minutes, the fortnight chart) is derived, never stored
 * twice and never out of step.
 */

export interface Session {
  /** When it ended, ms since the epoch. */
  at: number;
  patternId: string;
  patternName: string;
  seconds: number;
  cycles: number;
}

/** Shorter than this is a false start, not a session. */
export const MIN_SESSION_SECONDS = 20;
/** Enough for years of daily use without the log becoming the storage problem. */
export const MAX_SESSIONS = 1000;

/** `YYYY-MM-DD` in the viewer's own time zone — a day is the one they lived. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The same calendar day, `n` days earlier — by date, so DST cannot skip one. */
function daysBefore(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() - n);
  return d.getTime();
}

/**
 * Consecutive days with at least one session, ending today — or yesterday, so
 * a streak is not shown as broken at breakfast before today's session.
 */
export function streak(sessions: readonly Session[], now: number): number {
  const days = new Set(sessions.map((s) => dayKey(s.at)));
  let start = 0;
  if (!days.has(dayKey(now))) {
    if (!days.has(dayKey(daysBefore(now, 1)))) return 0;
    start = 1;
  }
  let count = 0;
  while (days.has(dayKey(daysBefore(now, start + count)))) count++;
  return count;
}

export const totalMinutes = (sessions: readonly Session[]): number =>
  sessions.reduce((sum, s) => sum + s.seconds, 0) / 60;

/** Minutes practised on each of the last `n` days, oldest first, today last. */
export function lastDays(sessions: readonly Session[], n: number, now: number): { key: string; minutes: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.at), (byDay.get(dayKey(s.at)) ?? 0) + s.seconds / 60);
  return Array.from({ length: n }, (_, i) => {
    const key = dayKey(daysBefore(now, n - 1 - i));
    return { key, minutes: byDay.get(key) ?? 0 };
  });
}

/** Coerce a stored log, dropping anything that is not recognisably a session. */
export function normalizeHistory(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return [];
  const out: Session[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    if (typeof s.at !== "number" || !Number.isFinite(s.at)) continue;
    if (typeof s.seconds !== "number" || !(s.seconds > 0)) continue;
    out.push({
      at: s.at,
      patternId: typeof s.patternId === "string" ? s.patternId : "box",
      patternName: typeof s.patternName === "string" ? s.patternName.slice(0, 40) : "Breathing",
      seconds: Math.round(s.seconds),
      cycles: typeof s.cycles === "number" && s.cycles >= 0 ? Math.round(s.cycles) : 0,
    });
  }
  return out.sort((a, b) => a.at - b.at).slice(-MAX_SESSIONS);
}
