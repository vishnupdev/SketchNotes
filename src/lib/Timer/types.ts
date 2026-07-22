/** Domain types for the Timer app (countdown, stopwatch, pomodoro). */

/** Which tool fills the Timer workspace. */
export type TimerMode = "countdown" | "stopwatch" | "pomodoro";

/** Lifecycle of any timed thing. */
export type RunStatus = "idle" | "running" | "paused" | "done";

/** Pomodoro cycle phase. */
export type PomoPhase = "focus" | "short" | "long";

/**
 * A single countdown. Time is tracked with an absolute `endAt` while running so
 * the clock stays correct across app switches, tab backgrounding and reloads;
 * `remainingMs` holds the frozen value while paused/idle/done.
 */
export interface Countdown {
  id: string;
  label: string;
  /** Configured total, used for the progress ring and reset. */
  durationMs: number;
  /** Remaining while paused / idle / done. */
  remainingMs: number;
  /** Absolute completion timestamp while running, else null. */
  endAt: number | null;
  status: RunStatus;
  /** Restart automatically on completion (interval timer). */
  loop: boolean;
}

/** Stopwatch state. Elapsed = accumulatedMs + (running ? now - startedAt : 0). */
export interface Stopwatch {
  running: boolean;
  startedAt: number | null;
  accumulatedMs: number;
  /** Cumulative elapsed captured at each lap. */
  laps: number[];
}

/** User-tunable pomodoro durations and behaviour. */
export interface PomoSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  /** Take a long break after this many focus sessions. */
  longEvery: number;
  /** Auto-start the next phase when one completes. */
  autoStart: boolean;
}

/** Pomodoro runtime state. */
export interface Pomodoro {
  phase: PomoPhase;
  status: RunStatus;
  endAt: number | null;
  remainingMs: number;
  /** Focus sessions completed in the current long-break cycle. */
  cycleCount: number;
  /** Total focus sessions completed all-time (this session). */
  totalFocus: number;
}

export const DEFAULT_POMO: PomoSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: true,
};

export const POMO_PHASE_LABEL: Record<PomoPhase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};
