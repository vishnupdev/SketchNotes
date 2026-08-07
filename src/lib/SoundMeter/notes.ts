/**
 * Equal-temperament pitch maths: frequency ↔ note name, and the cents error
 * that turns a frequency readout into a tuner.
 *
 * Everything is derived from a reference pitch (A4) rather than a hardcoded
 * 440 Hz table, so the app can tune to orchestral 442 or baroque 415 without a
 * second code path.
 */

import type { NoteMatch } from "./types";

/** MIDI note number of A4 — the anchor every other note is derived from. */
const A4_MIDI = 69;

/** Sharps only: the app shows one spelling, and sharps read better in a meter. */
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

/** Concert-pitch presets offered in the UI, in Hz. */
export const A4_PRESETS = [415, 432, 435, 438, 440, 441, 442, 443, 444] as const;

/** Standard concert pitch. */
export const DEFAULT_A4 = 440;

/** Widest reference pitch the UI accepts, guarding hand-edited stored values. */
export const A4_MIN = 400;
export const A4_MAX = 480;

/** Exact frequency of a MIDI note for the given reference pitch. */
export const midiToHz = (midi: number, a4: number = DEFAULT_A4): number =>
  a4 * Math.pow(2, (midi - A4_MIDI) / 12);

/** Fractional MIDI number of a frequency — the whole part is the note. */
export const hzToMidi = (hz: number, a4: number = DEFAULT_A4): number =>
  A4_MIDI + 12 * Math.log2(hz / a4);

/**
 * Nearest note to `hz`, with the signed error in cents (100 cents = 1
 * semitone, so the result is always within ±50). Returns null for a
 * non-positive frequency.
 */
export function matchNote(hz: number, a4: number = DEFAULT_A4): NoteMatch | null {
  if (!(hz > 0) || !Number.isFinite(hz)) return null;
  const exact = hzToMidi(hz, a4);
  const midi = Math.round(exact);
  // Scientific pitch notation: C-1 is MIDI 0, so C4 (middle C) is MIDI 60.
  return {
    name: NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    hz: midiToHz(midi, a4),
    cents: Math.round((exact - midi) * 100),
    midi,
  };
}

/** "A♯3" — the note name and octave as one label. */
export const noteLabel = (note: NoteMatch): string => `${note.name}${note.octave}`;

/**
 * How far in tune a reading is, as a plain-language verdict. ±5 cents is the
 * threshold most tuners treat as "in tune"; it's also about the smallest pitch
 * difference a trained ear reliably hears.
 */
export function tuningVerdict(cents: number): "flat" | "in-tune" | "sharp" {
  if (cents < -5) return "flat";
  if (cents > 5) return "sharp";
  return "in-tune";
}
