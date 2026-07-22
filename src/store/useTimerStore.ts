"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { notify, playChime } from "@/lib/Timer/sound";
import {
  type Countdown,
  type Pomodoro,
  type PomoPhase,
  type PomoSettings,
  type Stopwatch,
  type TimerMode,
} from "@/lib/Timer/types";
import {
  defaultSnapshot,
  loadTimer,
  saveTimer,
  type TimerSnapshot,
} from "@/lib/Timer/timer-api";

interface TimerState extends TimerSnapshot {
  /** Wall-clock, refreshed by the ticker to drive live displays. */
  now: number;
  /** True once the persisted snapshot has been merged in. */
  hydrated: boolean;

  hydrate: () => void;
  setMode: (mode: TimerMode) => void;

  // Countdowns
  addCountdown: (durationMs: number, label?: string, autostart?: boolean) => void;
  startCountdown: (id: string) => void;
  pauseCountdown: (id: string) => void;
  resetCountdown: (id: string) => void;
  addTime: (id: string, deltaMs: number) => void;
  toggleLoop: (id: string) => void;
  renameCountdown: (id: string, label: string) => void;
  removeCountdown: (id: string) => void;
  clearFinished: () => void;

  // Stopwatch
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  lapStopwatch: () => void;
  resetStopwatch: () => void;

  // Pomodoro
  startPomo: () => void;
  pausePomo: () => void;
  resetPomo: () => void;
  skipPomo: () => void;
  updateSettings: (patch: Partial<PomoSettings>) => void;
}

const phaseMs = (phase: PomoPhase, s: PomoSettings): number =>
  (phase === "focus" ? s.focusMin : phase === "short" ? s.shortMin : s.longMin) * 60_000;

/** Elapsed for a stopwatch given the current time. */
export const swElapsed = (sw: Stopwatch, now: number): number =>
  sw.accumulatedMs + (sw.running && sw.startedAt != null ? now - sw.startedAt : 0);

/** Live remaining ms for a countdown given the current time. */
export const cdRemaining = (c: Countdown, now: number): number =>
  c.status === "running" && c.endAt != null ? Math.max(0, c.endAt - now) : c.remainingMs;

/** Live remaining ms for the pomodoro given the current time. */
export const pomoRemaining = (p: Pomodoro, now: number): number =>
  p.status === "running" && p.endAt != null ? Math.max(0, p.endAt - now) : p.remainingMs;

// ---- module-level ticker (shared across app mounts so timers keep running) ----
let ticker: ReturnType<typeof setInterval> | null = null;

function anyRunning(s: TimerState): boolean {
  return (
    s.stopwatch.running ||
    s.pomodoro.status === "running" ||
    s.countdowns.some((c) => c.status === "running")
  );
}

/** Snapshot slice to persist (everything except volatile `now`/`hydrated`). */
function snapshotOf(s: TimerState): TimerSnapshot {
  return {
    mode: s.mode,
    countdowns: s.countdowns,
    stopwatch: s.stopwatch,
    pomodoro: s.pomodoro,
    settings: s.settings,
  };
}

export const useTimerStore = create<TimerState>((set, get) => {
  /** Persist current durable state. */
  const persist = () => saveTimer(snapshotOf(get()));

  /** Start/stop the shared interval based on whether anything is counting. */
  const syncTicker = () => {
    const running = anyRunning(get());
    if (running && ticker === null) {
      ticker = setInterval(() => tick(), 200);
    } else if (!running && ticker !== null) {
      clearInterval(ticker);
      ticker = null;
    }
  };

  /** One tick: refresh `now`, and roll over any timers that hit zero. */
  const tick = () => {
    const now = Date.now();
    const s = get();
    let changed = false;

    // Countdown completions.
    const countdowns = s.countdowns.map((c) => {
      if (c.status !== "running" || c.endAt == null || now < c.endAt) return c;
      changed = true;
      playChime();
      notify("Timer finished", c.label || "Countdown complete");
      if (c.loop) {
        return { ...c, endAt: now + c.durationMs, remainingMs: c.durationMs, status: "running" as const };
      }
      return { ...c, endAt: null, remainingMs: 0, status: "done" as const };
    });

    // Pomodoro completion → advance phase.
    let pomodoro = s.pomodoro;
    if (pomodoro.status === "running" && pomodoro.endAt != null && now >= pomodoro.endAt) {
      changed = true;
      pomodoro = advancePomo(pomodoro, s.settings, now);
    }

    set({ now, ...(changed ? { countdowns, pomodoro } : {}) });
    if (changed) {
      persist();
      syncTicker();
    }
  };

  /** Compute the next pomodoro phase after one completes. */
  const advancePomo = (p: Pomodoro, cfg: PomoSettings, now: number): Pomodoro => {
    if (p.phase === "focus") {
      const cycleCount = p.cycleCount + 1;
      const totalFocus = p.totalFocus + 1;
      const goLong = cycleCount % cfg.longEvery === 0;
      const nextPhase: PomoPhase = goLong ? "long" : "short";
      playChime(true);
      notify("Focus complete", `Time for a ${goLong ? "long" : "short"} break.`);
      const dur = phaseMs(nextPhase, cfg);
      return {
        phase: nextPhase,
        cycleCount,
        totalFocus,
        status: cfg.autoStart ? "running" : "idle",
        endAt: cfg.autoStart ? now + dur : null,
        remainingMs: dur,
      };
    }
    // A break finished → back to focus.
    playChime(true);
    notify("Break over", "Back to focus.");
    const dur = phaseMs("focus", cfg);
    return {
      phase: "focus",
      cycleCount: p.cycleCount,
      totalFocus: p.totalFocus,
      status: cfg.autoStart ? "running" : "idle",
      endAt: cfg.autoStart ? now + dur : null,
      remainingMs: dur,
    };
  };

  /** Apply a state change, persist it, and re-evaluate the ticker. */
  const commit = (patch: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => {
    set(patch as Partial<TimerState>);
    persist();
    syncTicker();
  };

  return {
    ...defaultSnapshot(),
    now: 0,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) {
        set({ now: Date.now() });
        return;
      }
      void loadTimer().then((snap) => {
        set({ ...snap, now: Date.now(), hydrated: true });
        syncTicker();
      });
    },

    setMode: (mode) => commit({ mode }),

    // ---- Countdowns ----
    addCountdown: (durationMs, label = "", autostart = true) => {
      if (durationMs <= 0) return;
      const now = Date.now();
      const c: Countdown = {
        id: uid(),
        label: label.trim(),
        durationMs,
        remainingMs: durationMs,
        endAt: autostart ? now + durationMs : null,
        status: autostart ? "running" : "idle",
        loop: false,
      };
      commit((s) => ({ countdowns: [...s.countdowns, c] }));
    },

    startCountdown: (id) =>
      commit((s) => ({
        countdowns: s.countdowns.map((c) => {
          if (c.id !== id) return c;
          // Finished timers restart from their full duration.
          const remaining = c.status === "done" || c.remainingMs <= 0 ? c.durationMs : c.remainingMs;
          return { ...c, status: "running", endAt: Date.now() + remaining, remainingMs: remaining };
        }),
      })),

    pauseCountdown: (id) =>
      commit((s) => ({
        countdowns: s.countdowns.map((c) =>
          c.id === id && c.status === "running"
            ? { ...c, status: "paused", remainingMs: cdRemaining(c, Date.now()), endAt: null }
            : c,
        ),
      })),

    resetCountdown: (id) =>
      commit((s) => ({
        countdowns: s.countdowns.map((c) =>
          c.id === id ? { ...c, status: "idle", remainingMs: c.durationMs, endAt: null } : c,
        ),
      })),

    addTime: (id, deltaMs) =>
      commit((s) => ({
        countdowns: s.countdowns.map((c) => {
          if (c.id !== id) return c;
          const running = c.status === "running" && c.endAt != null;
          const nextRemaining = Math.max(0, cdRemaining(c, Date.now()) + deltaMs);
          return {
            ...c,
            durationMs: Math.max(1000, c.durationMs + deltaMs),
            remainingMs: nextRemaining,
            endAt: running ? Date.now() + nextRemaining : c.endAt,
            status: c.status === "done" && nextRemaining > 0 ? "paused" : c.status,
          };
        }),
      })),

    toggleLoop: (id) =>
      commit((s) => ({
        countdowns: s.countdowns.map((c) => (c.id === id ? { ...c, loop: !c.loop } : c)),
      })),

    renameCountdown: (id, label) =>
      commit((s) => ({
        countdowns: s.countdowns.map((c) => (c.id === id ? { ...c, label } : c)),
      })),

    removeCountdown: (id) =>
      commit((s) => ({ countdowns: s.countdowns.filter((c) => c.id !== id) })),

    clearFinished: () =>
      commit((s) => ({ countdowns: s.countdowns.filter((c) => c.status !== "done") })),

    // ---- Stopwatch ----
    startStopwatch: () =>
      commit((s) => ({
        stopwatch: { ...s.stopwatch, running: true, startedAt: Date.now() },
      })),

    pauseStopwatch: () =>
      commit((s) =>
        s.stopwatch.running
          ? {
              stopwatch: {
                ...s.stopwatch,
                running: false,
                startedAt: null,
                accumulatedMs: swElapsed(s.stopwatch, Date.now()),
              },
            }
          : {},
      ),

    lapStopwatch: () =>
      commit((s) => ({
        stopwatch: { ...s.stopwatch, laps: [...s.stopwatch.laps, swElapsed(s.stopwatch, Date.now())] },
      })),

    resetStopwatch: () =>
      commit({ stopwatch: { running: false, startedAt: null, accumulatedMs: 0, laps: [] } }),

    // ---- Pomodoro ----
    startPomo: () =>
      commit((s) => {
        const p = s.pomodoro;
        const remaining = p.remainingMs > 0 ? p.remainingMs : phaseMs(p.phase, s.settings);
        return { pomodoro: { ...p, status: "running", endAt: Date.now() + remaining, remainingMs: remaining } };
      }),

    pausePomo: () =>
      commit((s) =>
        s.pomodoro.status === "running"
          ? {
              pomodoro: {
                ...s.pomodoro,
                status: "paused",
                remainingMs: pomoRemaining(s.pomodoro, Date.now()),
                endAt: null,
              },
            }
          : {},
      ),

    resetPomo: () =>
      commit((s) => ({
        pomodoro: {
          phase: "focus",
          status: "idle",
          endAt: null,
          remainingMs: phaseMs("focus", s.settings),
          cycleCount: 0,
          totalFocus: s.pomodoro.totalFocus,
        },
      })),

    // Jump to the next phase without counting the current one as completed.
    skipPomo: () =>
      commit((s) => {
        const p = s.pomodoro;
        const nextPhase: PomoPhase =
          p.phase === "focus"
            ? (p.cycleCount + 1) % s.settings.longEvery === 0
              ? "long"
              : "short"
            : "focus";
        const dur = phaseMs(nextPhase, s.settings);
        return {
          pomodoro: {
            ...p,
            phase: nextPhase,
            status: "idle",
            endAt: null,
            remainingMs: dur,
          },
        };
      }),

    updateSettings: (patch) =>
      commit((s) => {
        const settings = { ...s.settings, ...patch };
        // If the current phase is idle, reflect new durations immediately.
        const p = s.pomodoro;
        const pomodoro =
          p.status === "idle" ? { ...p, remainingMs: phaseMs(p.phase, settings) } : p;
        return { settings, pomodoro };
      }),
  };
});
