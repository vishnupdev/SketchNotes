/**
 * Morse playback: a synthesized sidetone (Web Audio, no asset files) kept in
 * lock-step with an on-screen lamp and optional haptics.
 *
 * A message is first flattened into a {@link Beat} timeline at the requested
 * speed, then that one timeline drives all three outputs — so what you hear,
 * see and feel is the same signal. Audio is scheduled ahead of time on the
 * AudioContext clock (immune to main-thread jank); the lamp and character
 * highlight ride along on timers, which is accurate enough for the eye.
 */

import { MORSE, unitMs } from "./alphabet";

/** One stretch of the timeline: tone on or silence, for `ms`. */
export interface Beat {
  on: boolean;
  ms: number;
  /** Index into the source text, for highlighting the character being sent. */
  charIndex?: number;
}

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Unlock the audio context from a user gesture. Safe to call repeatedly. */
export function primeAudio(): void {
  const ac = audioCtx();
  if (ac && ac.state === "suspended") void ac.resume();
}

/** Whether this device exposes the Vibration API. */
export const canVibrate = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/**
 * Flatten text into a beat timeline. Standard spacing: dit 1 unit, dah 3,
 * 1 unit between the signals of a character, 3 between characters, 7 between
 * words. Characters outside the table are skipped.
 */
export function buildPlan(text: string, wpm: number): Beat[] {
  const u = unitMs(wpm);
  const beats: Beat[] = [];
  let gap = 0; // silence owed before the next character

  const chars = text.toUpperCase().split("");
  chars.forEach((char, charIndex) => {
    if (/\s/.test(char)) {
      if (beats.length) gap = 7 * u;
      return;
    }
    const code = MORSE[char];
    if (!code) return;
    if (gap) beats.push({ on: false, ms: gap });
    code.split("").forEach((sym, i) => {
      if (i) beats.push({ on: false, ms: u });
      beats.push({ on: true, ms: (sym === "-" ? 3 : 1) * u, charIndex });
    });
    gap = 3 * u;
  });

  return beats;
}

/**
 * Flatten a raw code string (e.g. a prosign like `...---...`) into a timeline.
 * Unlike {@link buildPlan} there are no character gaps: a prosign is sent as one
 * unbroken run of signals, which is exactly what distinguishes it from the
 * letters it is spelled with.
 */
export function buildCodePlan(code: string, wpm: number): Beat[] {
  const u = unitMs(wpm);
  const beats: Beat[] = [];
  code
    .replace(/[^.-]/g, "")
    .split("")
    .forEach((sym, i) => {
      if (i) beats.push({ on: false, ms: u });
      beats.push({ on: true, ms: (sym === "-" ? 3 : 1) * u });
    });
  return beats;
}

export interface PlayOptions {
  wpm: number;
  tone: number;
  sound: boolean;
  light: boolean;
  haptics: boolean;
  /** Lamp state changed. */
  onSignal?: (on: boolean) => void;
  /** The source character now being sent (`null` between words). */
  onChar?: (index: number | null) => void;
  /** Playback reached the end (not called when cancelled). */
  onDone?: () => void;
}

/** Handle returned by {@link playMorse}; call `cancel` to stop early. */
export interface Playback {
  cancel: () => void;
}

const RAMP = 0.004; // 4ms attack/release — long enough to kill the click

/**
 * Play a message as Morse — either text (converted at the current speed) or a
 * pre-built timeline from {@link buildCodePlan}. Returns a handle whose
 * `cancel()` silences the tone, clears the lamp and stops any vibration.
 */
export function playMorse(source: string | Beat[], opts: PlayOptions): Playback {
  const beats = typeof source === "string" ? buildPlan(source, opts.wpm) : source;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const nodes: OscillatorNode[] = [];
  let cancelled = false;

  const finish = () => {
    opts.onSignal?.(false);
    opts.onChar?.(null);
  };

  if (!beats.length) {
    // Nothing sendable — report completion on the next tick so callers can
    // still rely on onDone firing asynchronously.
    timers.push(setTimeout(() => opts.onDone?.(), 0));
    return {
      cancel: () => {
        cancelled = true;
        timers.forEach(clearTimeout);
      },
    };
  }

  const ac = opts.sound ? audioCtx() : null;
  if (ac) {
    if (ac.state === "suspended") void ac.resume();
    const start = ac.currentTime + 0.06; // small lead so the first dit isn't clipped
    let at = start;
    for (const beat of beats) {
      const secs = beat.ms / 1000;
      if (beat.on) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(opts.tone, at);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.22, at + RAMP);
        gain.gain.setValueAtTime(0.22, at + Math.max(RAMP, secs - RAMP));
        gain.gain.linearRampToValueAtTime(0, at + secs);
        osc.connect(gain).connect(ac.destination);
        osc.start(at);
        osc.stop(at + secs + 0.01);
        nodes.push(osc);
      }
      at += secs;
    }
  }

  // One vibration pattern for the whole message: [on, off, on, …].
  if (opts.haptics && canVibrate()) {
    const pattern: number[] = [];
    // The API's pattern always starts with a buzz, so lead with 0 if we don't.
    if (!beats[0].on) pattern.push(0);
    for (const beat of beats) pattern.push(Math.round(beat.ms));
    try {
      navigator.vibrate(pattern);
    } catch {
      /* some browsers reject long patterns — the tone and lamp still play */
    }
  }

  // Lamp + character highlight, offset by the same lead as the audio.
  let elapsed = ac ? 60 : 0;
  let lastChar: number | null = null;
  for (const beat of beats) {
    const at = elapsed;
    const charIndex = beat.charIndex ?? null;
    const emitChar = beat.on && charIndex !== lastChar;
    if (emitChar) lastChar = charIndex;
    if (opts.light || emitChar) {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if (opts.light) opts.onSignal?.(beat.on);
          if (emitChar) opts.onChar?.(charIndex);
        }, at),
      );
    }
    elapsed += beat.ms;
  }
  timers.push(
    setTimeout(() => {
      if (cancelled) return;
      finish();
      opts.onDone?.();
    }, elapsed + 40),
  );

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      timers.forEach(clearTimeout);
      nodes.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
      });
      if (opts.haptics && canVibrate()) {
        try {
          navigator.vibrate(0);
        } catch {
          /* ignore */
        }
      }
      finish();
    },
  };
}

/** Total wall-clock length of a message at `wpm`, in ms. */
export const planDuration = (text: string, wpm: number): number =>
  buildPlan(text, wpm).reduce((sum, b) => sum + b.ms, 0);

/* --------------------------- straight key tone --------------------------- */

let keyOsc: OscillatorNode | null = null;
let keyGain: GainNode | null = null;

/** Start the sidetone for a held key. No-op if it is already sounding. */
export function startTone(freq: number): void {
  const ac = audioCtx();
  if (!ac || keyOsc) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.22, ac.currentTime + RAMP);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  keyOsc = osc;
  keyGain = gain;
}

/** Release the held-key sidetone. */
export function stopTone(): void {
  const ac = audioCtx();
  if (!ac || !keyOsc || !keyGain) return;
  const osc = keyOsc;
  const gain = keyGain;
  keyOsc = null;
  keyGain = null;
  const end = ac.currentTime + RAMP;
  gain.gain.cancelScheduledValues(ac.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0, end);
  try {
    osc.stop(end + 0.01);
  } catch {
    /* already stopped */
  }
}
