"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import type { ModelId } from "@/lib/Detect/engine";
import { recordSeen, type Detection, type SeenEntry } from "@/lib/Detect/detections";

const PREFS_KEY = "sknotes:detect:prefs";

export type DetectTool = "live" | "picture" | "seen";

export const DETECT_TOOLS: DetectTool[] = ["live", "picture", "seen"];

export type Facing = "environment" | "user";

export const MODELS: { id: ModelId; label: string; hint: string }[] = [
  {
    id: "fast",
    label: "Fast",
    hint: "Small and quick — keeps up with live video on a phone",
  },
  {
    id: "accurate",
    label: "Accurate",
    hint: "Finds smaller and more crowded things, at a slower frame rate",
  },
];

/** Confidence floor, as the slider moves it. Below ~0.3 the model guesses. */
export const MIN_SCORE_FLOOR = 0.2;
export const MIN_SCORE_CEILING = 0.9;

interface DetectState {
  tool: DetectTool;

  model: ModelId;
  /** Ignore anything the model is less sure of than this, 0–1. */
  minScore: number;
  /** Draw the percentage after each label. */
  showScores: boolean;
  /** Which camera the Live panel opens. */
  facing: Facing;

  /**
   * What the camera has found this session — peak count and best confidence per
   * label. Deliberately *not* persisted; see the note on the store below.
   */
  seen: SeenEntry[];

  setTool: (tool: DetectTool) => void;
  setModel: (model: ModelId) => void;
  setMinScore: (minScore: number) => void;
  setShowScores: (showScores: boolean) => void;
  setFacing: (facing: Facing) => void;
  /** Fold one frame's detections into the session tally. */
  record: (detections: readonly Detection[]) => void;
  clearSeen: () => void;

  hydrate: () => Promise<void>;
}

/**
 * Detect's state: the settings, and what has been seen since the app opened.
 *
 * The detector itself lives in `lib/Detect/engine.ts` as a module-level
 * singleton rather than in here, because it is not state the UI renders — it is
 * tens of megabytes of weights in GPU memory, and putting it in a store would
 * invite a re-render to touch it. Nor do the live detections live here: they
 * arrive ten times a second, and routing them through a store would re-render
 * the whole panel on every frame. The overlay holds them in a ref and paints
 * them onto a canvas; only the *tally* — which changes rarely — reaches here.
 *
 * **The tally is not persisted, on purpose.** A list of what your camera saw,
 * kept on the device, is a record of the room you were standing in. The
 * settings are worth remembering across visits; "a bed, 2 people, 22:14" is
 * not, and the only defensible place for it is memory that empties when you
 * leave. Everything else this app touches — frames, boxes, scores — is already
 * discarded the moment it has been drawn.
 */
export const useDetectStore = create<DetectState>((set, get) => ({
  tool: "live",

  model: "fast",
  // 0.5 is the model package's own default and a sensible floor for a live
  // preview: lower and a blank wall starts sprouting furniture.
  minScore: 0.5,
  showScores: true,
  facing: "environment",

  seen: [],

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },
  setModel: (model) => {
    set({ model });
    void persist(get());
  },
  setMinScore: (minScore) => {
    set({ minScore: clampScore(minScore) });
    void persist(get());
  },
  setShowScores: (showScores) => {
    set({ showScores });
    void persist(get());
  },
  setFacing: (facing) => {
    set({ facing });
    void persist(get());
  },

  record: (detections) => {
    if (!detections.length) return;
    const seen = recordSeen(get().seen, detections, Date.now());
    set({ seen });
  },
  clearSeen: () => set({ seen: [] }),

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw) as Partial<Prefs>;
      set({
        tool: DETECT_TOOLS.includes(prefs.tool as DetectTool) ? (prefs.tool as DetectTool) : "live",
        model: MODELS.some((m) => m.id === prefs.model) ? (prefs.model as ModelId) : "fast",
        minScore: typeof prefs.minScore === "number" ? clampScore(prefs.minScore) : 0.5,
        showScores: prefs.showScores ?? true,
        facing: prefs.facing === "user" ? "user" : "environment",
      });
    } catch {
      /* corrupt prefs are simply the defaults */
    }
  },
}));

const clampScore = (value: number): number =>
  Math.min(MIN_SCORE_CEILING, Math.max(MIN_SCORE_FLOOR, Number.isFinite(value) ? value : 0.5));

interface Prefs {
  tool: DetectTool;
  model: ModelId;
  minScore: number;
  showScores: boolean;
  facing: Facing;
}

const persist = (state: DetectState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: state.tool,
      model: state.model,
      minScore: state.minScore,
      showScores: state.showScores,
      facing: state.facing,
      // `seen` is deliberately absent — see the note on the store.
    } satisfies Prefs),
  );
