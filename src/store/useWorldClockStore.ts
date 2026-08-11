"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { DEFAULT_PINS, PLACE_BY_ID } from "@/lib/WorldClock/places";

/** The app's three views, switched from the floating bottom bar. */
export type WorldClockMode = "clocks" | "country" | "news";

const PINS_KEY = "sknotes:worldclock:pins";
const PREFS_KEY = "sknotes:worldclock:prefs";

/** Keep the board readable and the per-second re-render cheap. */
export const MAX_PINS = 24;

interface WorldClockPrefs {
  hour12: boolean;
  showSeconds: boolean;
}

const DEFAULT_PREFS: WorldClockPrefs = { hour12: true, showSeconds: false };

/**
 * Coerce an untrusted stored pin list into ids this build still knows about.
 * A city dropped from the catalog is discarded rather than left to render as a
 * blank card, and an empty result falls back to the starter board.
 */
function normalizePins(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_PINS;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === "string" && PLACE_BY_ID[v] && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.length ? out.slice(0, MAX_PINS) : DEFAULT_PINS;
}

function normalizePrefs(raw: unknown): WorldClockPrefs {
  const r = (raw ?? {}) as Partial<WorldClockPrefs>;
  return {
    hour12: typeof r.hour12 === "boolean" ? r.hour12 : DEFAULT_PREFS.hour12,
    showSeconds: typeof r.showSeconds === "boolean" ? r.showSeconds : DEFAULT_PREFS.showSeconds,
  };
}

interface WorldClockState extends WorldClockPrefs {
  /** Which view fills the app. */
  mode: WorldClockMode;
  /** Pinned city ids, in board order; persisted per browser. */
  pins: string[];
  /**
   * The country whose details and headlines the other two tabs show. Held as an
   * ISO code rather than a place id: a country reads the same whichever of its
   * cities you arrived from.
   */
  selectedCountry: string | null;
  /**
   * Minutes added to "now" by the time slider, for planning a call across
   * zones. Session-only — a saved scrub offset would be stale on the next
   * visit, and a clock that isn't showing the real time must never be the
   * state you come back to.
   */
  scrubMinutes: number;
  /**
   * Place ids whose country peek (facts + headlines) is unfolded on the board.
   *
   * Held here rather than inside the board because the board unmounts whenever
   * another tab is shown: opening a city's peek, following it to the full
   * country details and coming back would otherwise find it collapsed again.
   * Session-only, like the scrub — a board that reopens yesterday's selection
   * is noise, not memory.
   */
  openBriefs: string[];

  setMode: (mode: WorldClockMode) => void;
  /** Open a country's details, switching to the given tab (defaults to details). */
  selectCountry: (code: string, mode?: WorldClockMode) => void;
  pin: (placeId: string) => void;
  unpin: (placeId: string) => void;
  isPinned: (placeId: string) => boolean;
  /** Move a pinned city to a new index in the board order. */
  movePin: (from: number, to: number) => void;
  setScrub: (minutes: number) => void;
  resetScrub: () => void;
  /** Unfold or fold a city's country peek on the board. */
  toggleBrief: (placeId: string) => void;
  setHour12: (hour12: boolean) => void;
  setShowSeconds: (showSeconds: boolean) => void;
  /** Merge the persisted board and preferences in after mount (avoids SSR mismatch). */
  hydrate: () => void;
}

/**
 * UI state for the World Clock: the pinned board, the country in focus, the
 * time-slider offset and the clock display preferences.
 */
export const useWorldClockStore = create<WorldClockState>((set, get) => ({
  mode: "clocks",
  pins: DEFAULT_PINS,
  selectedCountry: null,
  scrubMinutes: 0,
  openBriefs: [],
  ...DEFAULT_PREFS,

  setMode: (mode) => set({ mode }),

  selectCountry: (code, mode = "country") => set({ selectedCountry: code, mode }),

  pin: (placeId) => {
    const { pins } = get();
    if (pins.includes(placeId) || !PLACE_BY_ID[placeId] || pins.length >= MAX_PINS) return;
    const next = [...pins, placeId];
    set({ pins: next });
    void sSet(PINS_KEY, JSON.stringify(next));
  },

  unpin: (placeId) => {
    const next = get().pins.filter((id) => id !== placeId);
    // Drop any open peek for the removed city too, so re-pinning it later
    // doesn't bring back an expansion the reader never asked for.
    set({ pins: next, openBriefs: get().openBriefs.filter((id) => id !== placeId) });
    void sSet(PINS_KEY, JSON.stringify(next));
  },

  isPinned: (placeId) => get().pins.includes(placeId),

  movePin: (from, to) => {
    const pins = get().pins;
    if (from === to || from < 0 || to < 0 || from >= pins.length || to >= pins.length) return;
    const next = pins.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ pins: next });
    void sSet(PINS_KEY, JSON.stringify(next));
  },

  setScrub: (scrubMinutes) => set({ scrubMinutes }),
  resetScrub: () => set({ scrubMinutes: 0 }),

  toggleBrief: (placeId) => {
    const open = get().openBriefs;
    set({
      openBriefs: open.includes(placeId)
        ? open.filter((id) => id !== placeId)
        : [...open, placeId],
    });
  },

  setHour12: (hour12) => {
    set({ hour12 });
    void sSet(PREFS_KEY, JSON.stringify({ hour12, showSeconds: get().showSeconds }));
  },

  setShowSeconds: (showSeconds) => {
    set({ showSeconds });
    void sSet(PREFS_KEY, JSON.stringify({ hour12: get().hour12, showSeconds }));
  },

  hydrate: async () => {
    const [rawPins, rawPrefs] = await Promise.all([sGet(PINS_KEY), sGet(PREFS_KEY)]);
    if (rawPins) {
      try {
        set({ pins: normalizePins(JSON.parse(rawPins)) });
      } catch {
        /* corrupt value — keep the starter board */
      }
    }
    if (rawPrefs) {
      try {
        set(normalizePrefs(JSON.parse(rawPrefs)));
      } catch {
        /* corrupt value — keep the defaults */
      }
    }
  },
}));
