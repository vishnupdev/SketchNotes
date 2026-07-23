"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { AUTO, DEFAULT_SOURCE, DEFAULT_TARGET, isKnownLanguage } from "@/lib/Translate/languages";
import type { TranslateMode } from "@/lib/Translate/types";

const PREFS_KEY = "sknotes:translate-prefs";

interface StoredPrefs {
  source: string;
  target: string;
  mode: TranslateMode;
}

const MODES: TranslateMode[] = ["auto", "offline", "online"];

interface TranslateState {
  /** Source language code, or AUTO to detect. */
  source: string;
  /** Target language code (never AUTO). */
  target: string;
  /** Which engine strategy to use. */
  mode: TranslateMode;
  /** The text the user is translating. */
  input: string;

  setSource: (code: string) => void;
  setTarget: (code: string) => void;
  setMode: (mode: TranslateMode) => void;
  setInput: (text: string) => void;
  /**
   * Swap source ↔ target languages. `detectedSource` supplies the real code
   * when the source is AUTO. Returns true if a swap happened (so the UI can
   * move the previous output into the input box). No-op otherwise.
   */
  swap: (detectedSource?: string) => boolean;
  /** Adopt persisted preferences after mount (avoids SSR mismatch). */
  hydratePrefs: () => void;
}

/** Persist the language/mode choices (not the transient input text). */
function persist(s: Pick<TranslateState, "source" | "target" | "mode">) {
  const prefs: StoredPrefs = { source: s.source, target: s.target, mode: s.mode };
  void sSet(PREFS_KEY, JSON.stringify(prefs));
}

/** UI state for the Translate app. Language/mode choices persist per browser. */
export const useTranslateStore = create<TranslateState>((set, get) => ({
  source: DEFAULT_SOURCE,
  target: DEFAULT_TARGET,
  mode: "auto",
  input: "",

  setSource: (code) => {
    set((s) => {
      // Choosing the language that's already the target is meaningless — push
      // the old source over to the target side (falling back to a default if
      // it was AUTO, which can't be a target).
      if (code !== AUTO && code === s.target) {
        return { source: code, target: s.source === AUTO ? DEFAULT_TARGET : s.source };
      }
      return { source: code };
    });
    persist(get());
  },
  setTarget: (code) => {
    // A target can never equal the source; flip the source to AUTO if it would.
    set((s) => (code === s.source ? { target: code, source: AUTO } : { target: code }));
    persist(get());
  },
  setMode: (mode) => {
    set({ mode });
    persist(get());
  },
  setInput: (input) => set({ input }),

  swap: (detectedSource) => {
    const { source, target } = get();
    // With auto-detect on, swap using the language we actually detected.
    const realSource = source === AUTO ? detectedSource : source;
    if (!realSource || realSource === target) return false;
    const next = { source: target, target: realSource };
    set(next);
    persist({ ...get(), ...next });
    return true;
  },

  hydratePrefs: async () => {
    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as Partial<StoredPrefs>;
      set({
        source: p.source === AUTO || (p.source && isKnownLanguage(p.source)) ? p.source : DEFAULT_SOURCE,
        target: p.target && isKnownLanguage(p.target) ? p.target : DEFAULT_TARGET,
        mode: p.mode && MODES.includes(p.mode) ? p.mode : "auto",
      });
    } catch {
      /* corrupt value — keep defaults */
    }
  },
}));
