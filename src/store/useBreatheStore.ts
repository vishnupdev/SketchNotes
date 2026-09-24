"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import {
  CUSTOM_ID,
  cycleSeconds,
  DEFAULT_CUSTOM,
  findPattern,
  LENGTHS,
  PATTERNS,
  phaseAt,
  type Custom,
  type Length,
  type Pattern,
} from "@/lib/Breathe/patterns";
import { MIN_SESSION_SECONDS, MAX_SESSIONS, normalizeHistory, type Session } from "@/lib/Breathe/history";
import { hushCues, releaseCues, unlockCues } from "@/lib/Breathe/cues";

const PREFS_KEY = "sknotes:breathe:prefs";
const HISTORY_KEY = "sknotes:breathe:history";

export type BreatheTool = "breathe" | "patterns" | "history";
export const BREATHE_TOOLS: BreatheTool[] = ["breathe", "patterns", "history"];

export type Status = "idle" | "running" | "paused" | "done";

interface Prefs {
  tool: BreatheTool;
  patternId: string;
  custom: Custom;
  length: Length;
  sound: boolean;
  volume: number;
  haptics: boolean;
}

interface BreatheState extends Prefs {
  status: Status;
  /** Seconds banked before the current run (i.e. across pauses). */
  banked: number;
  /** `performance.now()` when the current run started, or null when not running. */
  runStart: number | null;
  /** The session that just ended, for the completion screen. */
  last: Session | null;
  history: Session[];

  setTool: (tool: BreatheTool) => void;
  hydrate: () => Promise<void>;
  choose: (patternId: string) => void;
  setCustom: (patch: Partial<Custom>) => void;
  setPrefs: (patch: Partial<Pick<Prefs, "length" | "sound" | "volume" | "haptics">>) => void;

  start: () => void;
  pause: () => void;
  resume: () => void;
  /** End early. Kept in the log if it was long enough to count. */
  stop: () => void;
  /** The session reached its last exhale. */
  finish: () => void;
  dismiss: () => void;
  clearHistory: () => void;
  release: () => void;
}

/** The pattern the prefs point at. */
export const currentPattern = (s: Pick<BreatheState, "patternId" | "custom">): Pattern =>
  findPattern(s.patternId, s.custom);

/** Seconds into the session right now. Read by the animation loop every frame. */
export const elapsedOf = (s: Pick<BreatheState, "banked" | "runStart">, now = performance.now()): number =>
  s.banked + (s.runStart === null ? 0 : (now - s.runStart) / 1000);

const clampInt = (v: unknown, min: number, max: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;

/**
 * Breathe's state.
 *
 * The session is a clock and nothing else — seconds banked across pauses plus
 * the moment the current run began — and the orb reads it through
 * {@link elapsedOf} on every animation frame. Nothing per-frame goes through
 * React: the store changes only when the session starts, pauses or ends.
 */
export const useBreatheStore = create<BreatheState>((set, get) => ({
  tool: "breathe",
  patternId: "calm",
  custom: DEFAULT_CUSTOM,
  length: 3,
  sound: false,
  volume: 0.7,
  haptics: true,
  status: "idle",
  banked: 0,
  runStart: null,
  last: null,
  history: [],

  setTool: (tool) => {
    set({ tool });
    persistPrefs(get());
  },

  hydrate: async () => {
    const [prefs, history] = await Promise.all([sGet(PREFS_KEY), sGet(HISTORY_KEY)]);
    const p = parse(prefs) as Partial<Prefs> | null;
    const c = (p?.custom ?? {}) as Partial<Custom>;
    set({
      history: normalizeHistory(parse(history)),
      ...(p && {
        tool: BREATHE_TOOLS.includes(p.tool as BreatheTool) ? (p.tool as BreatheTool) : "breathe",
        patternId:
          p.patternId === CUSTOM_ID || PATTERNS.some((x) => x.id === p.patternId) ? (p.patternId as string) : "calm",
        custom: {
          inhale: clampInt(c.inhale, 1, 12, DEFAULT_CUSTOM.inhale),
          holdIn: clampInt(c.holdIn, 0, 12, DEFAULT_CUSTOM.holdIn),
          exhale: clampInt(c.exhale, 1, 16, DEFAULT_CUSTOM.exhale),
          holdOut: clampInt(c.holdOut, 0, 12, DEFAULT_CUSTOM.holdOut),
        },
        length: LENGTHS.includes(p.length as Length) ? (p.length as Length) : 3,
        sound: p.sound === true,
        volume: typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : 0.7,
        haptics: p.haptics !== false,
      }),
    });
  },

  choose: (patternId) => {
    if (get().status === "running" || get().status === "paused") get().stop();
    set({ patternId, status: "idle", last: null });
    persistPrefs(get());
  },

  setCustom: (patch) => {
    set({ custom: { ...get().custom, ...patch } });
    persistPrefs(get());
  },

  setPrefs: (patch) => {
    set(patch);
    if (patch.sound === false) hushCues();
    persistPrefs(get());
  },

  start: () => {
    if (get().sound) unlockCues();
    set({ status: "running", banked: 0, runStart: performance.now(), last: null });
  },

  pause: () => {
    if (get().status !== "running") return;
    hushCues();
    set({ status: "paused", banked: elapsedOf(get()), runStart: null });
  },

  resume: () => {
    if (get().status !== "paused") return;
    if (get().sound) unlockCues();
    set({ status: "running", runStart: performance.now() });
  },

  stop: () => {
    const s = get();
    if (s.status !== "running" && s.status !== "paused") return;
    hushCues();
    const seconds = elapsedOf(s);
    const pattern = currentPattern(s);
    const session = record(set, get, pattern, seconds, phaseAt(pattern, seconds).cycle);
    set({ status: session ? "done" : "idle", banked: 0, runStart: null, last: session });
  },

  finish: () => {
    const s = get();
    if (s.status !== "running") return;
    const pattern = currentPattern(s);
    const cycles = Math.max(1, Math.round(elapsedOf(s) / cycleSeconds(pattern)));
    const session = record(set, get, pattern, cycles * cycleSeconds(pattern), cycles);
    set({ status: "done", banked: 0, runStart: null, last: session });
  },

  dismiss: () => set({ status: "idle", last: null }),

  clearHistory: () => {
    set({ history: [] });
    void sSet(HISTORY_KEY, "[]");
  },

  release: () => {
    // Leaving mid-session still counts what was done.
    get().stop();
    releaseCues();
  },
}));

function record(
  set: (p: Partial<BreatheState>) => void,
  get: () => BreatheState,
  pattern: Pattern,
  seconds: number,
  cycles: number,
): Session | null {
  if (seconds < MIN_SESSION_SECONDS) return null;
  const session: Session = {
    at: Date.now(),
    patternId: pattern.id,
    patternName: pattern.name,
    seconds: Math.round(seconds),
    cycles,
  };
  set({ history: [...get().history, session].slice(-MAX_SESSIONS) });
  void sSet(HISTORY_KEY, JSON.stringify(get().history));
  return session;
}

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistPrefs(s: BreatheState): void {
  const prefs: Prefs = {
    tool: s.tool,
    patternId: s.patternId,
    custom: s.custom,
    length: s.length,
    sound: s.sound,
    volume: s.volume,
    haptics: s.haptics,
  };
  void sSet(PREFS_KEY, JSON.stringify(prefs));
}
