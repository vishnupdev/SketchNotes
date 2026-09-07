"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import {
  clampCountdown,
  CLIP_DEFAULTS,
  CLIP_SOURCES,
  type Clip,
  type ClipSettings,
  type ClipSource,
} from "@/lib/Clip/recorder";

/** Settings only. The recordings themselves are never written — see below. */
const PREFS_KEY = "sknotes:clip:prefs";

export type ClipTool = "record" | "library";

export const CLIP_TOOLS: ClipTool[] = ["record", "library"];

/**
 * `arming` is waiting on the browser's permission prompt; `counting` is the
 * countdown *after* it was granted. They are separate because they mean
 * different things to the user — one is "the browser is asking you", the other
 * is "get ready" — and only the second can be cancelled by this app.
 */
export type RecordState = "idle" | "arming" | "counting" | "recording" | "paused";

interface ClipState {
  tool: ClipTool;
  settings: ClipSettings;
  /** This session's recordings, newest first. */
  clips: Clip[];
  state: RecordState;
  /** Milliseconds recorded so far, ticked by the recorder. */
  elapsed: number;
  /** Seconds left of the pre-roll countdown, while `state` is "counting". */
  counting: number;
  /** Microphone level, 0–1, while a capture is live. */
  level: number;
  error: string | null;
  /** Which clip the library is playing. */
  playingId: string | null;

  setTool: (tool: ClipTool) => void;
  hydrate: () => Promise<void>;
  setSettings: (settings: Partial<ClipSettings>) => void;

  setState: (state: RecordState) => void;
  setElapsed: (elapsed: number) => void;
  setCounting: (counting: number) => void;
  setLevel: (level: number) => void;
  setError: (error: string | null) => void;

  addClip: (clip: Omit<Clip, "id">) => void;
  removeClip: (id: string) => void;
  clearClips: () => void;
  play: (id: string | null) => void;
}

/**
 * Clip's state.
 *
 * **Recordings live only in memory, and the app says so.** A minute of 1080p
 * screen capture is tens of megabytes; keeping clips in the workspace's storage
 * would exhaust the origin's quota in a handful of takes — and evict other
 * apps' notes and tasks to do it, since the quota is shared. So a clip is a
 * `Blob` and an object URL, kept until it is saved or the tab is closed, and
 * only the settings are persisted.
 *
 * The object URLs are revoked on removal. Left alone they hold their blob in
 * memory for the life of the document, which for video is the difference
 * between a few hundred megabytes and a tab the browser kills.
 */
export const useClipStore = create<ClipState>((set, get) => ({
  tool: "record",
  settings: CLIP_DEFAULTS,
  clips: [],
  state: "idle",
  elapsed: 0,
  counting: 0,
  level: 0,
  error: null,
  playingId: null,

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw) as { tool?: ClipTool; settings?: Partial<ClipSettings> };
      const source = prefs.settings?.source;
      set({
        tool: CLIP_TOOLS.includes(prefs.tool as ClipTool) ? (prefs.tool as ClipTool) : "record",
        settings: {
          ...CLIP_DEFAULTS,
          ...prefs.settings,
          source: CLIP_SOURCES.includes(source as ClipSource)
            ? (source as ClipSource)
            : CLIP_DEFAULTS.source,
          countdown: clampCountdown(prefs.settings?.countdown ?? CLIP_DEFAULTS.countdown),
        },
      });
    } catch {
      /* corrupt prefs are simply the defaults */
    }
  },

  setSettings: (settings) => {
    const next = { ...get().settings, ...settings };
    set({ settings: { ...next, countdown: clampCountdown(next.countdown) } });
    void persist(get());
  },

  // Going idle clears the readings with it, so a stale level bar or a leftover
  // countdown can't sit on screen next to a stopped recorder.
  setState: (state) =>
    set({ state, ...(state === "idle" ? { elapsed: 0, counting: 0, level: 0 } : {}) }),
  setElapsed: (elapsed) => set({ elapsed }),
  setCounting: (counting) => set({ counting }),
  setLevel: (level) => set({ level }),
  setError: (error) => set({ error }),

  addClip: (clip) => {
    set({ clips: [{ ...clip, id: uid() }, ...get().clips], tool: "library" });
    void persist(get());
  },

  removeClip: (id) => {
    const clip = get().clips.find((item) => item.id === id);
    // Revoking is not optional: the blob is held for the life of the document
    // otherwise, and these are videos.
    if (clip) URL.revokeObjectURL(clip.url);
    set({
      clips: get().clips.filter((item) => item.id !== id),
      playingId: get().playingId === id ? null : get().playingId,
    });
  },

  clearClips: () => {
    for (const clip of get().clips) URL.revokeObjectURL(clip.url);
    set({ clips: [], playingId: null });
  },

  play: (playingId) => set({ playingId }),
}));

const persist = (state: ClipState): Promise<void> =>
  sSet(PREFS_KEY, JSON.stringify({ tool: state.tool, settings: state.settings }));
