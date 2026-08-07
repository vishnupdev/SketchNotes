/** Domain types for the Sound Meter (microphone frequency & level analysis). */

/** Lifecycle of the microphone capture. */
export type MicStatus = "idle" | "starting" | "live" | "denied" | "error";

/** Which live visualization the user is looking at. */
export type ScopeView = "spectrum" | "waveform";

/** A pitch estimate for one analysis window. */
export interface Pitch {
  /** Fundamental frequency in Hz. */
  hz: number;
  /**
   * How periodic the window was, 0→1. Low values mean noise or a chord rather
   * than a single sustained tone; the UI dims the note readout below a floor.
   */
  clarity: number;
}

/** Loudness of one analysis window, in dBFS (0 = full scale, negative below). */
export interface Level {
  /** Root-mean-square level — what "how loud is it" means perceptually. */
  rms: number;
  /** Largest absolute sample in the window. */
  peak: number;
  /** Whether any sample hit full scale (the mic input is clipping). */
  clipping: boolean;
}

/** The nearest equal-tempered note to a frequency. */
export interface NoteMatch {
  /** Note letter with any accidental, e.g. "A", "C♯". */
  name: string;
  /** Scientific-pitch octave number (A4 = 440 Hz by default). */
  octave: number;
  /** Exact frequency of that note, for the given reference pitch. */
  hz: number;
  /** Signed distance from that note in cents (−50…+50). */
  cents: number;
  /** MIDI note number, handy as a stable key. */
  midi: number;
}

/**
 * One analysed frame, pushed to subscribers on every animation frame.
 *
 * `waveform` and `spectrum` are the engine's own buffers, reused frame to
 * frame: read them synchronously (draw, measure) and never retain them.
 */
export interface Frame {
  /** Time-domain samples, −1→1. */
  waveform: Float32Array;
  /** Frequency-domain magnitudes, 0→255, one entry per FFT bin. */
  spectrum: Uint8Array;
  /** Hz covered by each spectrum bin. */
  binHz: number;
  /** Capture sample rate in Hz. */
  sampleRate: number;
  level: Level;
  /** Null when the window is too quiet or too noisy to hold a pitch. */
  pitch: Pitch | null;
}

/** A numeric snapshot of a frame — what the store keeps for the readouts. */
export interface Reading {
  /** Detected fundamental, in Hz. Null when the sound holds no pitch. */
  hz: number | null;
  /** Confidence in `hz`, 0→1. */
  clarity: number;
  /** Loudest frequency present, in Hz — the tallest FFT bin, not the fundamental. */
  peakHz: number | null;
  /** RMS level in dBFS. */
  rms: number;
  /** Peak sample level in dBFS. */
  peak: number;
  clipping: boolean;
}

/** Details of the live capture, shown so a reading can be judged. */
export interface CaptureInfo {
  sampleRate: number;
  fftSize: number;
  /** Hz per FFT bin — the spectrum's resolution. */
  binHz: number;
  /** Label of the input device, when the browser exposes one. */
  deviceLabel: string | null;
  /** Whether the browser's voice processing (AGC/NS/AEC) was switched off. */
  rawInput: boolean;
}
