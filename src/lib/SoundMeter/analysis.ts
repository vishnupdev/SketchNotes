/**
 * Signal analysis for the Sound Meter — pure functions over one window of
 * time-domain samples. No Web Audio here, so the maths stays testable and the
 * engine stays a thin wrapper around the browser API.
 *
 * Pitch uses normalised autocorrelation. It is run in two passes: a coarse
 * scan over a half-rate copy of the window to find the period cheaply, then a
 * full-rate refinement plus parabolic interpolation around that lag. One-pass
 * full-rate autocorrelation would cost several milliseconds per frame and drop
 * animation frames; the two-pass version is ~1 ms with the same accuracy.
 */

import type { Level, Pitch } from "./types";

/** Quietest window worth measuring, as a linear RMS amplitude (≈ −44 dBFS). */
const SILENCE_RMS = 0.006;

/** Pitch search range. Below/above this the spectrum view is the better tool. */
export const PITCH_MIN_HZ = 50;
export const PITCH_MAX_HZ = 2000;

/**
 * Minimum normalised correlation for a window to count as pitched. Noise,
 * chords and consonants land well under this; a sustained note sits near 1.
 */
export const CLARITY_FLOOR = 0.55;

/** dBFS reported for digital silence, instead of −Infinity. */
export const SILENT_DB = -100;

/** Convert a linear amplitude (0→1) to dBFS, floored so meters stay finite. */
export const toDbfs = (amplitude: number): number =>
  amplitude > 0 ? Math.max(SILENT_DB, 20 * Math.log10(amplitude)) : SILENT_DB;

/** RMS and peak level of a window, plus whether the input is clipping. */
export function measureLevel(buf: Float32Array): Level {
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

/** Linear RMS amplitude of a window (not dB) — used as the silence gate. */
function rmsAmplitude(buf: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
  return Math.sqrt(sumSq / buf.length);
}

/**
 * Normalised autocorrelation at one lag: the correlation of the window with
 * itself shifted by `lag`, divided by the energy of the two overlapping
 * halves. Normalising this way keeps the result in −1→1 regardless of how
 * loud the sound is or how much it decays across the window, so the same
 * clarity threshold works for a shouted vowel and a fading guitar string.
 */
function normalizedCorrelation(buf: Float32Array, lag: number, n: number): number {
  let corr = 0;
  let energyA = 0;
  let energyB = 0;
  for (let i = 0; i + lag < n; i++) {
    const a = buf[i];
    const b = buf[i + lag];
    corr += a * b;
    energyA += a * a;
    energyB += b * b;
  }
  const norm = Math.sqrt(energyA * energyB);
  return norm > 0 ? corr / norm : 0;
}

/** Half-rate copy of a window, pair-averaged so the decimation low-passes too. */
function halveRate(buf: Float32Array, out: Float32Array): void {
  for (let i = 0; i < out.length; i++) out[i] = (buf[i * 2] + buf[i * 2 + 1]) * 0.5;
}

// Scratch buffer for the coarse pass, grown on demand and reused across frames
// so a 60 fps analysis loop allocates nothing.
let halfBuf = new Float32Array(0);

/**
 * Estimate the fundamental frequency of a window, or null when it holds no
 * usable pitch (too quiet, or not periodic enough — see {@link CLARITY_FLOOR}).
 */
export function detectPitch(buf: Float32Array, sampleRate: number): Pitch | null {
  const n = buf.length;
  if (n < 256 || rmsAmplitude(buf) < SILENCE_RMS) return null;

  /* ---- coarse pass: half rate, full lag range ---- */

  const halfN = n >> 1;
  if (halfBuf.length !== halfN) halfBuf = new Float32Array(halfN);
  halveRate(buf, halfBuf);
  const halfRate = sampleRate / 2;

  const minLagH = Math.max(2, Math.floor(halfRate / PITCH_MAX_HZ));
  const maxLagH = Math.min(halfN - 2, Math.floor(halfRate / PITCH_MIN_HZ));
  if (maxLagH <= minLagH) return null;

  // Collect the whole curve first: the best lag alone is not enough, because
  // autocorrelation peaks just as strongly at 2× and 3× the true period.
  const curve = new Float32Array(maxLagH + 1);
  let best = 0;
  for (let lag = minLagH; lag <= maxLagH; lag++) {
    const v = normalizedCorrelation(halfBuf, lag, halfN);
    curve[lag] = v;
    if (v > best) best = v;
  }
  if (best < CLARITY_FLOOR) return null;

  // Octave guard: take the *first* peak that comes close to the strongest one,
  // since the true period is the shortest lag that explains the waveform.
  const accept = best * 0.9;
  let coarseLag = -1;
  for (let lag = minLagH + 1; lag < maxLagH; lag++) {
    if (curve[lag] >= accept && curve[lag] >= curve[lag - 1] && curve[lag] >= curve[lag + 1]) {
      coarseLag = lag;
      break;
    }
  }
  if (coarseLag < 0) return null;

  /* ---- fine pass: full rate, a few lags either side ---- */

  const centre = coarseLag * 2;
  const from = Math.max(2, centre - 3);
  const to = Math.min(n - 2, centre + 3);
  let fineLag = centre;
  let fineVal = -1;
  for (let lag = from; lag <= to; lag++) {
    const v = normalizedCorrelation(buf, lag, n);
    if (v > fineVal) {
      fineVal = v;
      fineLag = lag;
    }
  }

  // Parabolic interpolation through the peak and its neighbours recovers the
  // sub-sample period, which is what keeps the reading inside a few cents.
  const left = normalizedCorrelation(buf, fineLag - 1, n);
  const right = normalizedCorrelation(buf, fineLag + 1, n);
  const denom = 2 * (2 * fineVal - left - right);
  const shift = denom !== 0 ? (right - left) / denom : 0;
  const period = fineLag + (Math.abs(shift) < 1 ? shift : 0);
  if (period <= 0) return null;

  const hz = sampleRate / period;
  if (hz < PITCH_MIN_HZ || hz > PITCH_MAX_HZ) return null;

  return { hz, clarity: Math.min(1, Math.max(0, fineVal)) };
}

/**
 * Loudest frequency present in a spectrum, in Hz — the peak FFT bin, refined
 * by parabolic interpolation between its neighbours. Unlike {@link detectPitch}
 * this follows whatever is loudest rather than the fundamental, which is what
 * you want for a whistle, a tone generator or a hum you're trying to identify.
 * Returns null for an empty spectrum.
 */
export function peakFrequency(spectrum: Uint8Array, binHz: number): number | null {
  let peakBin = -1;
  let peakVal = 0;
  // Bin 0 is DC; skip it so a mic's DC offset can't win.
  for (let i = 1; i < spectrum.length; i++) {
    if (spectrum[i] > peakVal) {
      peakVal = spectrum[i];
      peakBin = i;
    }
  }
  if (peakBin < 1 || peakVal < 8) return null;

  const left = spectrum[peakBin - 1] ?? 0;
  const right = spectrum[peakBin + 1] ?? 0;
  const denom = 2 * (2 * peakVal - left - right);
  const shift = denom !== 0 ? (right - left) / denom : 0;
  return (peakBin + (Math.abs(shift) < 1 ? shift : 0)) * binHz;
}
