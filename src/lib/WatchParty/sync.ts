import type { Playback } from "./types";

/**
 * Keeping a room in step — the arithmetic, with no players or sockets in it.
 *
 * Every device plays its own copy of the video; nothing is streamed frame by
 * frame. What makes that a *shared* viewing is that every player steers toward
 * the same line (see {@link Playback}) against the same clock. Two problems:
 *
 *  1. **Whose clock.** Each device's clock is off from the host's by some
 *     unknown amount, often seconds. A guest measures it the way NTP does: it
 *     asks the host the time and times the round trip. The sample with the
 *     *shortest* round trip is kept, because that is the one where "the answer
 *     was stamped halfway through" is least wrong.
 *  2. **How to catch up.** A seek is the blunt fix — it rebuffers and it jumps.
 *     A small drift is instead closed by playing a few percent fast or slow for a
 *     few seconds, which nobody can hear. YouTube only offers rates in steps of a
 *     quarter, so there the only tool is a seek, used with a wider margin.
 */

/** Epoch milliseconds that never step backwards within a page's life. */
export const now = (): number => performance.timeOrigin + performance.now();

/** Where the line says the media should be at host time `hostNow`. */
export function expectedPosition(p: Playback, hostNow: number): number {
  if (p.status !== "playing") return p.position;
  return Math.max(0, p.position + ((hostNow - p.at) / 1000) * p.rate);
}

interface Sample {
  rtt: number;
  offset: number;
}

/**
 * The guest's estimate of `hostClock − localClock`.
 *
 * Holds the last {@link ClockSync.WINDOW} samples and trusts the one with the
 * least round trip. Old samples roll off, so a clock that genuinely drifts (a
 * laptop waking from sleep) is followed within a minute rather than never.
 */
export class ClockSync {
  static readonly WINDOW = 12;
  private samples: Sample[] = [];

  /** `t0` when the ping left, `host` the host's stamp, `t1` when the pong came back. */
  add(t0: number, host: number, t1: number): void {
    const rtt = Math.max(0, t1 - t0);
    this.samples.push({ rtt, offset: host - (t0 + rtt / 2) });
    if (this.samples.length > ClockSync.WINDOW) this.samples.shift();
  }

  private best(): Sample | null {
    let best: Sample | null = null;
    for (const s of this.samples) if (!best || s.rtt < best.rtt) best = s;
    return best;
  }

  get offset(): number {
    return this.best()?.offset ?? 0;
  }

  /** The most recent round trip — what the member list shows as ping. */
  get rtt(): number | null {
    return this.samples.length ? this.samples[this.samples.length - 1].rtt : null;
  }

  get ready(): boolean {
    return this.samples.length > 0;
  }
}

export type PlayerEngine = "element" | "youtube";

export type Correction =
  | { kind: "ok"; rate: number }
  | { kind: "rate"; rate: number }
  | { kind: "seek"; to: number };

/** Past this, a `<video>` seeks rather than trying to talk its way back. */
export const SEEK_AT: Record<PlayerEngine, number> = { element: 1, youtube: 0.8 };

/** Within this, a player is in step. Below what anyone can see on a screen. */
export const IN_STEP = 0.06;

/** The furthest a `<video>` is ever pushed off its rate, as a fraction. */
const MAX_NUDGE = 0.1;

/**
 * What a player should do about being `actual − expected` seconds off.
 *
 * The nudge is proportional — half a second ahead plays at 90% until it is
 * back — and capped, because past ten percent speech starts to sound wrong.
 */
export function correct(
  actual: number,
  expected: number,
  baseRate: number,
  engine: PlayerEngine,
): Correction {
  const drift = actual - expected;
  const size = Math.abs(drift);
  if (size >= SEEK_AT[engine]) return { kind: "seek", to: expected };
  if (engine === "youtube" || size <= IN_STEP) return { kind: "ok", rate: baseRate };
  const nudge = Math.min(MAX_NUDGE, size * 0.5) * Math.sign(drift);
  return { kind: "rate", rate: baseRate * (1 - nudge) };
}

/** How a drift reads in the member list. */
export function driftLabel(drift: number | null): string {
  if (drift == null) return "";
  const size = Math.abs(drift);
  if (size <= 0.15) return "in sync";
  return `${size.toFixed(1)}s ${drift > 0 ? "ahead" : "behind"}`;
}

/** YouTube accepts only the rates it lists; take the nearest. */
export function nearestRate(rate: number, available: readonly number[]): number {
  if (!available.length) return 1;
  return available.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best));
}

/** The playback speeds offered in the room's speed menu. */
export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
