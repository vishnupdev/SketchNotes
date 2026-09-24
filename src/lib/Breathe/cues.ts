import type { Phase } from "./patterns";

/**
 * Breathe's cues: a tone that rises through an inhale and falls through an
 * exhale, a soft chime on a hold, and a buzz on each change for a phone held in
 * the hand with the eyes closed — which is how a breathing exercise is
 * actually done, and why the cues exist at all.
 *
 * Synthesised, like the Metronome's clicks, so the app works offline.
 */

const LOW = 196; // G3
const HIGH = 294; // D4 — a fifth above, calm rather than bright

let ctx: AudioContext | null = null;
let voice: { osc: OscillatorNode; gain: GainNode } | null = null;

/** Open (or wake) the audio context. Call from the gesture that starts a session. */
export function unlockCues(): void {
  if (typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx ??= new Ctor();
  void ctx.resume();
}

/** Fade the current tone out — on pause, stop, or before the next one. */
export function hushCues(): void {
  if (!ctx || !voice) return;
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setTargetAtTime(0, now, 0.08);
  voice.osc.stop(now + 0.5);
  voice = null;
}

export function releaseCues(): void {
  hushCues();
  void ctx?.close();
  ctx = null;
}

/** Sound the start of a phase lasting `seconds`. */
export function playPhase(phase: Phase, volume: number): void {
  if (!ctx || ctx.state === "closed") return;
  hushCues();
  const now = ctx.currentTime;
  const peak = 0.12 * Math.min(1, Math.max(0, volume));
  if (peak <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (phase.kind === "hold") {
    // A single soft chime that rings away — the stillness is the point.
    osc.frequency.setValueAtTime(phase.level > 0.5 ? HIGH * 2 : LOW * 2, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak * 0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.start(now);
    osc.stop(now + 1.7);
    return;
  }

  // A swell that glides with the breath and fades before the phase ends.
  const [from, to] = phase.kind === "in" ? [LOW, HIGH] : [HIGH, LOW];
  const end = now + phase.seconds;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, end);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.6, phase.seconds / 3));
  gain.gain.setTargetAtTime(0.0001, end - Math.min(0.8, phase.seconds / 3), 0.25);
  osc.start(now);
  osc.stop(end + 0.3);
  voice = { osc, gain };
}

/** A short buzz: one for in, two for a hold, a long one for out. */
export function buzz(phase: Phase): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(phase.kind === "in" ? 30 : phase.kind === "hold" ? [20, 60, 20] : 70);
}

export const canVibrate = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
