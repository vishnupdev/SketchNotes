/**
 * Notification sounds, synthesized with the Web Audio API so no audio assets
 * need bundling and every tone stays crisp at any volume. A single shared
 * AudioContext is created lazily and unlocked on the first user gesture (the
 * browser autoplay policy blocks audio until then).
 */

import type { SoundId } from "./types";

export interface SoundOption {
  id: SoundId;
  name: string;
  description: string;
}

/** Ordered list powering the sound picker. */
export const SOUNDS: SoundOption[] = [
  { id: "chime", name: "Chime", description: "Soft ascending bells" },
  { id: "bell", name: "Bell", description: "Warm resonant ring" },
  { id: "beep", name: "Beep", description: "Short double tone" },
  { id: "digital", name: "Digital", description: "Quick electronic arp" },
  { id: "marimba", name: "Marimba", description: "Mellow wooden notes" },
  { id: "alert", name: "Alert", description: "Urgent repeating buzz" },
];

let ctx: AudioContext | null = null;

type ACtor = typeof AudioContext;

/** Lazily create / resume the shared AudioContext. Returns null when unsupported. */
export function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC: ACtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** Schedule one enveloped note. */
function note(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  peak = 0.22,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

/** Each sound is a recipe scheduling notes from time `t`. */
const RECIPES: Record<SoundId, (ac: AudioContext, t: number) => void> = {
  chime: (ac, t) => {
    [659.25, 783.99, 1046.5].forEach((f, i) => note(ac, f, t + i * 0.14, 0.5, "sine", 0.2));
  },
  bell: (ac, t) => {
    note(ac, 587.33, t, 1.4, "sine", 0.22);
    note(ac, 880, t, 1.2, "sine", 0.09); // shimmer harmonic
    note(ac, 1174.66, t, 0.8, "sine", 0.05);
  },
  beep: (ac, t) => {
    note(ac, 880, t, 0.16, "square", 0.16);
    note(ac, 880, t + 0.22, 0.16, "square", 0.16);
  },
  digital: (ac, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      note(ac, f, t + i * 0.08, 0.14, "square", 0.12),
    );
  },
  marimba: (ac, t) => {
    [523.25, 659.25, 587.33].forEach((f, i) => note(ac, f, t + i * 0.13, 0.4, "triangle", 0.22));
  },
  alert: (ac, t) => {
    for (let i = 0; i < 4; i++) note(ac, 740, t + i * 0.2, 0.13, "sawtooth", 0.14);
  },
};

/** Play a sound by id. No-op when audio is unavailable / still locked. */
export function playSound(id: SoundId): void {
  const ac = ensureAudioContext();
  if (!ac) return;
  (RECIPES[id] ?? RECIPES.chime)(ac, ac.currentTime + 0.02);
}
