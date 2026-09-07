/**
 * How loud a window of samples is.
 *
 * Shell-level and generic (rules #2/#5): two apps now measure microphone level
 * — Sound Meter, whose whole purpose it is, and Clip, which needs to show that
 * the mic is actually picking something up *before* ten minutes are recorded
 * silently. Neither may import the other's internals, and a second copy of an
 * RMS loop is exactly the duplication rule #2 exists to prevent, so the
 * primitive lives here and both read from it.
 *
 * `lib/SoundMeter/analysis.ts` keeps its own richer API (pitch detection,
 * spectra, SPL offsets) and delegates the level maths to these functions, so
 * there is one definition of "how loud" in the workspace.
 */

/** dBFS reported for digital silence, instead of −Infinity. */
export const SILENT_DB = -100;

/** Convert a linear amplitude (0→1) to dBFS, floored so meters stay finite. */
export const toDbfs = (amplitude: number): number =>
  amplitude > 0 ? Math.max(SILENT_DB, 20 * Math.log10(amplitude)) : SILENT_DB;

/** RMS and peak level of a window, plus whether the input is clipping. */
export interface Loudness {
  /** Root-mean-square level in dBFS — what "how loud is it" means perceptually. */
  rms: number;
  /** Largest absolute sample in the window, in dBFS. */
  peak: number;
  /** Whether any sample hit full scale, so information has already been lost. */
  clipping: boolean;
}

export function measureLoudness(buf: Float32Array): Loudness {
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = buf[i];
    sumSq += s * s;
    const abs = s < 0 ? -s : s;
    if (abs > peak) peak = abs;
  }
  return {
    rms: toDbfs(Math.sqrt(sumSq / buf.length)),
    peak: toDbfs(peak),
    // Anything at or beyond full scale has already lost information.
    clipping: peak >= 0.999,
  };
}

/**
 * A dBFS reading mapped to how full a meter bar should be, 0→1.
 *
 * Linear in **decibels**, not in amplitude, because that is what a level meter
 * has to be: speech sits around −30 dBFS, which on a linear-amplitude bar is a
 * sliver against the edge and reads as "the microphone is not working". The
 * default floor of −60 dB puts normal speech somewhere in the middle, where a
 * change in it is actually visible.
 */
export function meterFill(rmsDb: number, floorDb = -60): number {
  if (!Number.isFinite(rmsDb) || rmsDb <= floorDb) return 0;
  return Math.max(0, Math.min(1, (rmsDb - floorDb) / -floorDb));
}
