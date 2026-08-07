"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { peakFrequency } from "@/lib/SoundMeter/analysis";
import {
  isCapturing,
  MicError,
  micSupported,
  onFrame,
  onLost,
  startCapture,
  stopCapture,
} from "@/lib/SoundMeter/engine";
import { A4_MAX, A4_MIN, DEFAULT_A4 } from "@/lib/SoundMeter/notes";
import { SPL_OFFSET_DEFAULT, SPL_OFFSET_MAX, SPL_OFFSET_MIN } from "@/lib/SoundMeter/format";
import { SILENT_DB } from "@/lib/SoundMeter/analysis";
import type { CaptureInfo, MicStatus, Reading, ScopeView } from "@/lib/SoundMeter/types";

/**
 * State for the Sound Meter.
 *
 * The analysis loop runs at 60 fps, which is far more often than React should
 * re-render: the canvases subscribe to `onFrame` directly and paint without
 * touching state, while this store takes a numeric snapshot at
 * {@link READOUT_EVERY} frames — fast enough to look live, slow enough that the
 * digits stay readable and the tree stays cheap.
 */

const A4_KEY = "sknotes:sound:a4";
const VIEW_KEY = "sknotes:sound:view";
const SPL_KEY = "sknotes:sound:spl-offset";

/** Publish a readout every Nth analysis frame (≈20 Hz at 60 fps). */
const READOUT_EVERY = 3;

/**
 * Keep showing the last pitch for this long after it drops out. Speech and
 * bowed notes dip below the clarity floor constantly; without a short hold the
 * note readout would flicker on every consonant.
 */
const PITCH_HOLD_MS = 450;

const IDLE_READING: Reading = {
  hz: null,
  clarity: 0,
  peakHz: null,
  rms: SILENT_DB,
  peak: SILENT_DB,
  clipping: false,
};

const ERROR_COPY: Record<string, string> = {
  denied:
    "Microphone access was blocked. Allow it for this site in your browser's address-bar permissions, then try again.",
  notfound: "No microphone was found. Connect one and try again.",
  unsupported: "This browser can't capture audio. Try the latest Chrome, Edge, Firefox or Safari.",
  failed: "The microphone couldn't be opened. Close anything else using it and try again.",
};

interface SoundMeterState {
  status: MicStatus;
  error: string | null;
  /** Details of the running capture; null while idle. */
  capture: CaptureInfo | null;
  /** Latest numeric snapshot, refreshed ~20 times a second while live. */
  reading: Reading;
  /** Loudest peak seen since the meter started, in dBFS. */
  peakHold: number;
  /** Whether the input has clipped at any point in this session. */
  clippedEver: boolean;

  /** Reference pitch in Hz that note names are derived from. */
  a4: number;
  /** Which visualization the scope shows. */
  view: ScopeView;
  /** dB added to a dBFS reading to estimate SPL — a guess, not a calibration. */
  splOffset: number;
  settingsHydrated: boolean;

  /** Merge persisted preferences in after mount (avoids an SSR mismatch). */
  hydrate: () => void;
  /** Open the microphone. Must be called from a user gesture. */
  start: () => Promise<void>;
  /** Close the microphone and freeze the last reading. */
  stop: () => void;
  resetPeak: () => void;
  setA4: (hz: number) => void;
  setView: (view: ScopeView) => void;
  setSplOffset: (db: number) => void;
}

// Module-level so the subscription survives re-renders and app switches, and
// so a second mount can never start a second capture.
let unsubscribeFrame: (() => void) | null = null;
let unsubscribeLost: (() => void) | null = null;
let frameCount = 0;
let lastPitchAt = 0;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const useSoundMeterStore = create<SoundMeterState>((set, get) => ({
  status: "idle",
  error: null,
  capture: null,
  reading: IDLE_READING,
  peakHold: SILENT_DB,
  clippedEver: false,

  a4: DEFAULT_A4,
  view: "spectrum",
  splOffset: SPL_OFFSET_DEFAULT,
  settingsHydrated: false,

  hydrate: () => {
    if (get().settingsHydrated) return;
    set({ settingsHydrated: true });
    void Promise.all([sGet(A4_KEY), sGet(VIEW_KEY), sGet(SPL_KEY)]).then(([a4, view, spl]) => {
      const parsedA4 = Number(a4);
      const parsedSpl = Number(spl);
      set({
        // Unknown or hand-edited values fall back to the defaults rather than
        // leaving the meter reading against nonsense.
        a4: Number.isFinite(parsedA4) && parsedA4 >= A4_MIN && parsedA4 <= A4_MAX ? parsedA4 : DEFAULT_A4,
        view: view === "waveform" || view === "spectrum" ? view : "spectrum",
        splOffset:
          Number.isFinite(parsedSpl) && parsedSpl >= SPL_OFFSET_MIN && parsedSpl <= SPL_OFFSET_MAX
            ? parsedSpl
            : SPL_OFFSET_DEFAULT,
      });
    });
  },

  start: async () => {
    if (get().status === "starting" || isCapturing()) return;
    if (!micSupported()) {
      set({ status: "error", error: ERROR_COPY.unsupported });
      return;
    }

    set({
      status: "starting",
      error: null,
      reading: IDLE_READING,
      peakHold: SILENT_DB,
      clippedEver: false,
    });
    frameCount = 0;
    lastPitchAt = 0;

    try {
      const capture = await startCapture();
      set({ status: "live", capture, error: null });

      unsubscribeFrame = onFrame((frame) => {
        // A pitched frame refreshes the hold; an unpitched one keeps the last
        // note until the hold expires.
        const now = performance.now();
        if (frame.pitch) lastPitchAt = now;

        if (frameCount++ % READOUT_EVERY !== 0) return;

        const held = frame.pitch === null && now - lastPitchAt < PITCH_HOLD_MS;
        const previous = get().reading;
        set((s) => ({
          reading: {
            hz: frame.pitch ? frame.pitch.hz : held ? previous.hz : null,
            clarity: frame.pitch ? frame.pitch.clarity : held ? previous.clarity : 0,
            peakHz: peakFrequency(frame.spectrum, frame.binHz),
            rms: frame.level.rms,
            peak: frame.level.peak,
            clipping: frame.level.clipping,
          },
          peakHold: Math.max(s.peakHold, frame.level.peak),
          clippedEver: s.clippedEver || frame.level.clipping,
        }));
      });

      unsubscribeLost = onLost(() => {
        // The device went away (unplugged, or permission revoked mid-session).
        get().stop();
        set({ status: "error", error: ERROR_COPY.failed });
      });
    } catch (err) {
      const kind = err instanceof MicError ? err.kind : "failed";
      set({
        status: kind === "denied" ? "denied" : "error",
        error: ERROR_COPY[kind] ?? ERROR_COPY.failed,
        capture: null,
      });
    }
  },

  stop: () => {
    unsubscribeFrame?.();
    unsubscribeLost?.();
    unsubscribeFrame = null;
    unsubscribeLost = null;
    stopCapture();
    // The last reading is deliberately left on screen — stopping the mic
    // shouldn't wipe the figure the user just took.
    set({ status: "idle", capture: null });
  },

  resetPeak: () => set({ peakHold: SILENT_DB, clippedEver: false }),

  setA4: (hz) => {
    const a4 = clamp(Math.round(hz), A4_MIN, A4_MAX);
    set({ a4 });
    void sSet(A4_KEY, String(a4));
  },

  setView: (view) => {
    set({ view });
    void sSet(VIEW_KEY, view);
  },

  setSplOffset: (db) => {
    const splOffset = clamp(Math.round(db), SPL_OFFSET_MIN, SPL_OFFSET_MAX);
    set({ splOffset });
    void sSet(SPL_KEY, String(splOffset));
  },
}));
