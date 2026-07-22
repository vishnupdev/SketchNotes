/**
 * Persistence for the Timer app. A single localStorage slot holds a snapshot of
 * the durable state (countdowns, stopwatch, pomodoro, settings, active mode).
 * Because timing uses absolute `endAt` / `startedAt` timestamps, a running timer
 * resumes correctly after a reload. The volatile `now` tick is never persisted.
 */

import { sGet, sSet } from "@/lib/storage";
import { DEFAULT_POMO, type Countdown, type Pomodoro, type PomoSettings, type Stopwatch, type TimerMode } from "./types";

const KEY = "sknotes:timer";

export interface TimerSnapshot {
  mode: TimerMode;
  countdowns: Countdown[];
  stopwatch: Stopwatch;
  pomodoro: Pomodoro;
  settings: PomoSettings;
}

export function defaultSnapshot(): TimerSnapshot {
  return {
    mode: "countdown",
    countdowns: [],
    stopwatch: { running: false, startedAt: null, accumulatedMs: 0, laps: [] },
    pomodoro: {
      phase: "focus",
      status: "idle",
      endAt: null,
      remainingMs: DEFAULT_POMO.focusMin * 60_000,
      cycleCount: 0,
      totalFocus: 0,
    },
    settings: { ...DEFAULT_POMO },
  };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Best-effort coercion of parsed JSON into a valid snapshot. */
function normalize(raw: unknown): TimerSnapshot {
  const base = defaultSnapshot();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  if (r.mode === "countdown" || r.mode === "stopwatch" || r.mode === "pomodoro") {
    base.mode = r.mode;
  }

  if (Array.isArray(r.countdowns)) {
    base.countdowns = r.countdowns
      .map((c): Countdown | null => {
        if (!c || typeof c !== "object") return null;
        const t = c as Record<string, unknown>;
        if (typeof t.id !== "string" || !isNum(t.durationMs)) return null;
        const status =
          t.status === "running" || t.status === "paused" || t.status === "done"
            ? t.status
            : "idle";
        return {
          id: t.id,
          label: typeof t.label === "string" ? t.label : "",
          durationMs: t.durationMs,
          remainingMs: isNum(t.remainingMs) ? t.remainingMs : t.durationMs,
          endAt: isNum(t.endAt) ? t.endAt : null,
          status,
          loop: Boolean(t.loop),
        };
      })
      .filter((c): c is Countdown => c !== null);
  }

  if (r.stopwatch && typeof r.stopwatch === "object") {
    const s = r.stopwatch as Record<string, unknown>;
    base.stopwatch = {
      running: Boolean(s.running),
      startedAt: isNum(s.startedAt) ? s.startedAt : null,
      accumulatedMs: isNum(s.accumulatedMs) ? s.accumulatedMs : 0,
      laps: Array.isArray(s.laps) ? s.laps.filter(isNum) : [],
    };
  }

  if (r.settings && typeof r.settings === "object") {
    const s = r.settings as Record<string, unknown>;
    base.settings = {
      focusMin: isNum(s.focusMin) ? s.focusMin : DEFAULT_POMO.focusMin,
      shortMin: isNum(s.shortMin) ? s.shortMin : DEFAULT_POMO.shortMin,
      longMin: isNum(s.longMin) ? s.longMin : DEFAULT_POMO.longMin,
      longEvery: isNum(s.longEvery) ? s.longEvery : DEFAULT_POMO.longEvery,
      autoStart: s.autoStart != null ? Boolean(s.autoStart) : DEFAULT_POMO.autoStart,
    };
  }

  if (r.pomodoro && typeof r.pomodoro === "object") {
    const p = r.pomodoro as Record<string, unknown>;
    const phase = p.phase === "short" || p.phase === "long" ? p.phase : "focus";
    const status =
      p.status === "running" || p.status === "paused" || p.status === "done" ? p.status : "idle";
    base.pomodoro = {
      phase,
      status,
      endAt: isNum(p.endAt) ? p.endAt : null,
      remainingMs: isNum(p.remainingMs) ? p.remainingMs : base.settings.focusMin * 60_000,
      cycleCount: isNum(p.cycleCount) ? p.cycleCount : 0,
      totalFocus: isNum(p.totalFocus) ? p.totalFocus : 0,
    };
  }

  return base;
}

export async function loadTimer(): Promise<TimerSnapshot> {
  try {
    const raw = await sGet(KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultSnapshot();
  } catch {
    return defaultSnapshot();
  }
}

export function saveTimer(snapshot: TimerSnapshot): void {
  void sSet(KEY, JSON.stringify(snapshot));
}
