"use client";

/**
 * Microphone capture for the Sound Meter.
 *
 * A module-level singleton, for the same reason the speed test uses one: the
 * capture has to outlive any component that started it, and there must only
 * ever be one open microphone. Analysis runs in a single requestAnimationFrame
 * loop that publishes one {@link Frame} to every subscriber, so the readouts,
 * the spectrum and the scope all draw the same instant of audio and the
 * expensive pitch pass happens once rather than once per widget.
 *
 * Nothing is recorded and nothing leaves the device — each frame is analysed
 * and discarded.
 */

import { detectPitch, measureLevel } from "./analysis";
import type { CaptureInfo, Frame, Pitch } from "./types";

/**
 * 4096-point FFT: ~12 Hz spectrum bins and an 85 ms window at 48 kHz — long
 * enough to hold two periods of a low bass note, short enough that the meter
 * still feels immediate.
 */
const FFT_SIZE = 4096;

/** Samples the pitch pass looks at: the most recent half of the window. */
const PITCH_WINDOW = 2048;

/** Run the pitch pass every Nth frame — 30 Hz is far faster than the eye. */
const PITCH_EVERY = 2;

/** Display smoothing for the spectrum only; the scope stays unsmoothed. */
const SPECTRUM_SMOOTHING = 0.78;

/** Why a capture could not start — the store maps these to user-facing copy. */
export type MicErrorKind = "denied" | "notfound" | "unsupported" | "failed";

export class MicError extends Error {
  readonly kind: MicErrorKind;
  constructor(kind: MicErrorKind, message: string) {
    super(message);
    this.name = "MicError";
    this.kind = kind;
  }
}

type FrameListener = (frame: Frame) => void;
type LostListener = () => void;

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let rafId: number | null = null;
let frameCount = 0;
let lastPitch: Pitch | null = null;

let waveform = new Float32Array(FFT_SIZE);
let spectrum = new Uint8Array(FFT_SIZE / 2);

const listeners = new Set<FrameListener>();
const lostListeners = new Set<LostListener>();

/** Whether this browser can capture audio at all. */
export const micSupported = (): boolean =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== "undefined" &&
  !!(window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext);

/** True while the microphone is open and frames are being published. */
export const isCapturing = (): boolean => analyser !== null;

/** Subscribe to analysed frames. Returns an unsubscribe function. */
export function onFrame(fn: FrameListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Subscribe to the microphone being taken away (unplugged, revoked, ended). */
export function onLost(fn: LostListener): () => void {
  lostListeners.add(fn);
  return () => lostListeners.delete(fn);
}

function tick(): void {
  const node = analyser;
  const ac = ctx;
  if (!node || !ac) return;
  rafId = requestAnimationFrame(tick);

  node.getFloatTimeDomainData(waveform);
  node.getByteFrequencyData(spectrum);

  // The pitch pass is the only costly part, so it runs on a slower cadence and
  // its last answer is reused in between. Level is cheap and stays per-frame.
  if (frameCount++ % PITCH_EVERY === 0) {
    lastPitch = detectPitch(waveform.subarray(waveform.length - PITCH_WINDOW), ac.sampleRate);
  }

  const frame: Frame = {
    waveform,
    spectrum,
    binHz: ac.sampleRate / node.fftSize,
    sampleRate: ac.sampleRate,
    level: measureLevel(waveform),
    pitch: lastPitch,
  };
  for (const fn of listeners) fn(frame);
}

/** Translate a getUserMedia rejection into something the UI can explain. */
function toMicError(err: unknown): MicError {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new MicError("denied", "Microphone access was blocked.");
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new MicError("notfound", "No microphone was found on this device.");
  }
  return new MicError("failed", "The microphone could not be opened.");
}

/**
 * Open the microphone and start publishing frames. Must be called from a user
 * gesture (both the permission prompt and the AudioContext require one).
 * Resolves with the capture's details; rejects with a {@link MicError}.
 */
export async function startCapture(): Promise<CaptureInfo> {
  if (analyser && ctx) return describeCapture();
  if (!micSupported()) {
    throw new MicError("unsupported", "This browser cannot capture audio.");
  }

  // Ask for the unprocessed signal: echo cancellation, noise suppression and
  // especially automatic gain control all rewrite the very thing being
  // measured. Browsers that refuse simply hand back a processed track, which
  // `describeCapture` reports so the reading can be taken with a pinch of salt.
  let media: MediaStream;
  try {
    media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
  } catch (err) {
    throw toMicError(err);
  }

  try {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    const ac = new Ctor!();
    if (ac.state === "suspended") await ac.resume();

    const node = ac.createAnalyser();
    node.fftSize = FFT_SIZE;
    node.smoothingTimeConstant = SPECTRUM_SMOOTHING;
    // The analyser is a sink here — deliberately not connected to the
    // destination, so the microphone is never played back through the speakers.
    const src = ac.createMediaStreamSource(media);
    src.connect(node);

    ctx = ac;
    stream = media;
    source = src;
    analyser = node;
    frameCount = 0;
    lastPitch = null;
    if (waveform.length !== node.fftSize) waveform = new Float32Array(node.fftSize);
    if (spectrum.length !== node.frequencyBinCount) {
      spectrum = new Uint8Array(node.frequencyBinCount);
    }

    for (const track of media.getAudioTracks()) {
      track.addEventListener("ended", handleTrackEnded);
    }

    rafId = requestAnimationFrame(tick);
    return describeCapture();
  } catch (err) {
    // Never leave the microphone open (and its indicator lit) after a failure.
    media.getTracks().forEach((t) => t.stop());
    throw err instanceof MicError ? err : toMicError(err);
  }
}

function handleTrackEnded(): void {
  stopCapture();
  for (const fn of lostListeners) fn();
}

/** Close the microphone and stop the analysis loop. Safe to call when idle. */
export function stopCapture(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  for (const track of stream?.getAudioTracks() ?? []) {
    track.removeEventListener("ended", handleTrackEnded);
    track.stop();
  }
  source?.disconnect();
  // Closing the context releases the audio hardware; a later start makes a new
  // one, which also picks up a device the user switched to in the meantime.
  void ctx?.close().catch(() => {
    /* already closed */
  });
  stream = null;
  source = null;
  analyser = null;
  ctx = null;
  lastPitch = null;
}

/** Details of the running capture. Throws if called while idle. */
function describeCapture(): CaptureInfo {
  const ac = ctx;
  const node = analyser;
  if (!ac || !node) throw new MicError("failed", "The microphone is not running.");
  const track = stream?.getAudioTracks()[0];
  const settings = track?.getSettings() as MediaTrackSettings | undefined;
  return {
    sampleRate: ac.sampleRate,
    fftSize: node.fftSize,
    binHz: ac.sampleRate / node.fftSize,
    deviceLabel: track?.label || null,
    // Absent settings mean the browser won't say — assume it processed the
    // signal rather than claiming a raw feed we can't vouch for.
    rawInput:
      settings?.autoGainControl === false &&
      settings?.noiseSuppression === false &&
      settings?.echoCancellation === false,
  };
}
