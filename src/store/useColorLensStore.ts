"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { sGet, sSet } from "@/lib/storage";
import { isHex, rgbToHex } from "@/lib/ColorLens/convert";
import { averageColor, extractPalette } from "@/lib/ColorLens/palette";
import type { ImageSource, PaletteEntry, PickRecord } from "@/lib/ColorLens/types";

const PICKS_KEY = "sknotes:colorlens-picks";

/** How many past picks the history strip keeps. */
const HISTORY_LIMIT = 24;

/** Swatch counts the palette panel offers. */
export const PALETTE_SIZES = [4, 6, 8, 12] as const;

interface ColorLensState {
  /** Object/data URL of the loaded image, or null when nothing is loaded. */
  imageUrl: string | null;
  /** Where the image came from — drives the "retake" vs "replace" wording. */
  imageSource: ImageSource;
  /** Original filename, when the image came from a file. */
  imageName: string | null;
  /** Natural pixel size of the loaded image. */
  imageSize: { w: number; h: number } | null;

  /** Dominant colours of the whole image, most-dominant first. */
  palette: PaletteEntry[];
  /** How many swatches to extract. */
  paletteSize: number;
  /** The image's overall average colour. */
  averageHex: string | null;

  /** The colour currently being reported on. */
  pickedHex: string | null;
  /** Recent picks, newest first; persisted on this device. */
  history: PickRecord[];
  hydrated: boolean;

  /** Set once an image finishes decoding and its pixels have been read. */
  analyzing: boolean;
  error: string | null;

  hydrate: () => void;
  setImage: (url: string, source: ImageSource, name: string | null) => void;
  clearImage: () => void;
  /** Feed decoded RGBA pixels in to build the palette. */
  analyze: (data: Uint8ClampedArray, w: number, h: number) => void;
  setPaletteSize: (size: number) => void;
  /** Record a colour as the current pick (and add it to history). */
  pick: (hex: string) => void;
  clearHistory: () => void;
  setError: (message: string | null) => void;
}

/**
 * Object URLs must be revoked or the blob stays in memory for the life of the
 * document. Tracked at module level so replacing an image always releases the
 * previous one, even across an app switch that unmounts the UI.
 */
let liveObjectUrl: string | null = null;

function releaseObjectUrl() {
  if (liveObjectUrl) {
    URL.revokeObjectURL(liveObjectUrl);
    liveObjectUrl = null;
  }
}

/**
 * The decoded pixels of the current image, kept out of the store's state: it is
 * a multi-megabyte buffer that no component renders directly, and putting it in
 * state would make every subscriber compare it on each update. Held here so
 * changing the swatch count can re-extract from the same image without asking
 * the surface to decode it a second time.
 */
let lastPixels: Uint8ClampedArray | null = null;

/** Keep only well-formed records — the store is fed by localStorage. */
function normalizeHistory(raw: unknown): PickRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is PickRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as PickRecord).hex === "string" &&
        isHex((r as PickRecord).hex),
    )
    .slice(0, HISTORY_LIMIT)
    .map((r) => ({ id: r.id || uid(), hex: r.hex.toLowerCase(), at: r.at || 0 }));
}

export const useColorLensStore = create<ColorLensState>((set, get) => ({
  imageUrl: null,
  imageSource: null,
  imageName: null,
  imageSize: null,
  palette: [],
  paletteSize: 8,
  averageHex: null,
  pickedHex: null,
  history: [],
  hydrated: false,
  analyzing: false,
  error: null,

  hydrate: () => {
    if (get().hydrated) return;
    void sGet(PICKS_KEY).then((raw) => {
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      try {
        set({ history: normalizeHistory(JSON.parse(raw)), hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    });
  },

  setImage: (url, source, name) => {
    releaseObjectUrl();
    lastPixels = null;
    if (url.startsWith("blob:")) liveObjectUrl = url;
    set({
      imageUrl: url,
      imageSource: source,
      imageName: name,
      imageSize: null,
      palette: [],
      averageHex: null,
      pickedHex: null,
      analyzing: true,
      error: null,
    });
  },

  clearImage: () => {
    releaseObjectUrl();
    lastPixels = null;
    set({
      imageUrl: null,
      imageSource: null,
      imageName: null,
      imageSize: null,
      palette: [],
      averageHex: null,
      pickedHex: null,
      analyzing: false,
      error: null,
    });
  },

  analyze: (data, w, h) => {
    lastPixels = data;
    const palette = extractPalette(data, get().paletteSize);
    const average = averageColor(data);
    set({
      palette,
      averageHex: average ? rgbToHex(average) : null,
      imageSize: { w, h },
      analyzing: false,
      // Open on the image's most dominant colour, so the report is never empty.
      pickedHex: get().pickedHex ?? palette[0]?.hex ?? null,
    });
  },

  // Re-extract from the pixels already in hand, so changing the swatch count is
  // instant and doesn't disturb the current pick.
  setPaletteSize: (paletteSize) =>
    set(lastPixels ? { paletteSize, palette: extractPalette(lastPixels, paletteSize) } : { paletteSize }),

  pick: (hex) => {
    const value = hex.toLowerCase();
    // Collapse repeats: re-picking the same colour moves it to the front rather
    // than filling the strip with one swatch.
    const history = [
      { id: uid(), hex: value, at: Date.now() },
      ...get().history.filter((r) => r.hex !== value),
    ].slice(0, HISTORY_LIMIT);
    set({ pickedHex: value, history });
    void sSet(PICKS_KEY, JSON.stringify(history));
  },

  clearHistory: () => {
    set({ history: [] });
    void sSet(PICKS_KEY, "[]");
  },

  setError: (error) => set({ error, analyzing: false }),
}));
