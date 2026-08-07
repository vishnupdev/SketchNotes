/**
 * Persistence for the Morse app: playback settings and learning progress are
 * kept in the shared key/value store, so speed, tone and per-character mastery
 * survive a reload. Nothing leaves the browser.
 */

import { sGet, sSet } from "@/lib/storage";
import type { CharStat, MorseSnapshot, MorseSettings, PracticePool, PracticeStyle } from "./types";

const KEY = "sknotes:morse";

/** 12 wpm with a 600 Hz sidetone — the speed and pitch most courses start at. */
export const DEFAULT_SETTINGS: MorseSettings = {
  wpm: 12,
  tone: 600,
  sound: true,
  light: true,
  haptics: false,
};

export const WPM_MIN = 5;
export const WPM_MAX = 30;
export const TONE_MIN = 400;
export const TONE_MAX = 900;

export const defaultSnapshot = (): MorseSnapshot => ({
  settings: { ...DEFAULT_SETTINGS },
  pool: "letters",
  style: "listen",
  stats: {},
  bestStreak: 0,
});

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const num = (v: unknown, fallback: number, lo: number, hi: number): number =>
  typeof v === "number" && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : fallback;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

const POOLS: PracticePool[] = ["letters", "numbers", "alphanumeric", "all"];
const STYLES: PracticeStyle[] = ["listen", "read"];

/** Coerce an untrusted stored value into a complete, in-range snapshot. */
function normalize(raw: unknown): MorseSnapshot {
  const base = defaultSnapshot();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<MorseSnapshot>;
  const s = (r.settings ?? {}) as Partial<MorseSettings>;

  const stats: Record<string, CharStat> = {};
  if (r.stats && typeof r.stats === "object") {
    for (const [char, stat] of Object.entries(r.stats as Record<string, unknown>)) {
      if (!stat || typeof stat !== "object") continue;
      const { asked, right } = stat as Partial<CharStat>;
      if (typeof asked !== "number" || typeof right !== "number") continue;
      stats[char] = { asked: Math.max(0, asked), right: Math.max(0, right) };
    }
  }

  return {
    settings: {
      wpm: num(s.wpm, base.settings.wpm, WPM_MIN, WPM_MAX),
      tone: num(s.tone, base.settings.tone, TONE_MIN, TONE_MAX),
      sound: bool(s.sound, base.settings.sound),
      light: bool(s.light, base.settings.light),
      haptics: bool(s.haptics, base.settings.haptics),
    },
    pool: POOLS.includes(r.pool as PracticePool) ? (r.pool as PracticePool) : base.pool,
    style: STYLES.includes(r.style as PracticeStyle) ? (r.style as PracticeStyle) : base.style,
    stats,
    bestStreak: num(r.bestStreak, 0, 0, 100_000),
  };
}

export async function loadMorse(): Promise<MorseSnapshot> {
  const raw = await sGet(KEY);
  if (!raw) return defaultSnapshot();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return defaultSnapshot();
  }
}

export function saveMorse(snapshot: MorseSnapshot): void {
  void sSet(KEY, JSON.stringify(snapshot));
}
