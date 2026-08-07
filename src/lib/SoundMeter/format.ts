/** Display formatting and scale helpers for the Sound Meter. */

import { SILENT_DB } from "./analysis";

/** Lowest frequency drawn on the spectrum — below human hearing. */
export const SPECTRUM_MIN_HZ = 20;
/** Highest frequency drawn on the spectrum, capped at the edge of hearing. */
export const SPECTRUM_MAX_HZ = 20000;

/**
 * dBFS added to a reading to guess a sound-pressure level. Consumer
 * microphones are uncalibrated, so this is a rule-of-thumb offset (0 dBFS ≈
 * 100 dB SPL on a typical laptop mic) the user can nudge — never a measurement.
 */
export const SPL_OFFSET_DEFAULT = 100;
export const SPL_OFFSET_MIN = 60;
export const SPL_OFFSET_MAX = 130;

/** Frequency with a sensible number of digits for its magnitude. */
export function formatHz(hz: number | null): string {
  if (hz === null || !Number.isFinite(hz)) return "—";
  if (hz >= 10000) return `${(hz / 1000).toFixed(2)} k`;
  if (hz >= 1000) return hz.toFixed(0);
  if (hz >= 100) return hz.toFixed(1);
  return hz.toFixed(2);
}

/** Unit label matching {@link formatHz}'s scaling. */
export const hzUnit = (hz: number | null): string => (hz !== null && hz >= 10000 ? "kHz" : "Hz");

/** A dB figure to one decimal, with the floor shown as −∞ rather than −100. */
export function formatDb(db: number): string {
  if (!Number.isFinite(db) || db <= SILENT_DB) return "−∞";
  return db.toFixed(1);
}

/** Signed cents, always carrying its sign so ±0 reads as in tune. */
export function formatCents(cents: number): string {
  if (cents === 0) return "0";
  // U+2212 minus, to match the typographic minus used elsewhere in the meter.
  return cents > 0 ? `+${cents}` : `−${Math.abs(cents)}`;
}

/**
 * Map a dB value onto 0→1 across a meter's range, for bar widths and heights.
 * `floor` is the quietest dB the meter shows.
 */
export function dbFraction(db: number, floor = -60, ceiling = 0): number {
  if (!Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db - floor) / (ceiling - floor)));
}

/**
 * Position of a frequency on a log axis, 0→1. Pitch is perceived
 * logarithmically, so a log axis gives each octave the same width and keeps
 * the musically interesting bottom end from collapsing into a few pixels.
 */
export function logPosition(
  hz: number,
  min = SPECTRUM_MIN_HZ,
  max = SPECTRUM_MAX_HZ,
): number {
  if (hz <= 0) return 0;
  return Math.min(1, Math.max(0, Math.log(hz / min) / Math.log(max / min)));
}

/** Inverse of {@link logPosition} — the frequency at a fraction of the axis. */
export function positionToHz(
  fraction: number,
  min = SPECTRUM_MIN_HZ,
  max = SPECTRUM_MAX_HZ,
): number {
  return min * Math.pow(max / min, Math.min(1, Math.max(0, fraction)));
}

/** Octave gridlines drawn under the spectrum, labelled where there's room. */
export const SPECTRUM_TICKS = [
  { hz: 50, label: "50" },
  { hz: 100, label: "100" },
  { hz: 250, label: "250" },
  { hz: 500, label: "500" },
  { hz: 1000, label: "1k" },
  { hz: 2000, label: "2k" },
  { hz: 5000, label: "5k" },
  { hz: 10000, label: "10k" },
] as const;

/** An everyday comparison for an estimated SPL, to make the number mean something. */
export function describeSpl(spl: number): string {
  if (spl < 30) return "near silence";
  if (spl < 45) return "a quiet room";
  if (spl < 60) return "a normal conversation";
  if (spl < 75) return "a busy office";
  if (spl < 88) return "city traffic";
  if (spl < 100) return "a loud machine";
  return "hearing-damage territory";
}
