"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { isHex } from "@/lib/color";
import type { RampFormat } from "@/lib/Contrast/ramp";
import type { VisionType } from "@/lib/Contrast/vision";

const PREFS_KEY = "sknotes:contrast:prefs";

export type ContrastTool = "check" | "ramp" | "vision";

export const CONTRAST_TOOLS: ContrastTool[] = ["check", "ramp", "vision"];

/** A palette starts with something worth looking at rather than an empty grid. */
const DEFAULT_PALETTE = ["#1f74e0", "#2f9e44", "#e0533b", "#e8930c", "#8b5cf6", "#0d9488"];

const MAX_PALETTE = 12;

interface StoredPrefs {
  tool?: string;
  foreground?: string;
  background?: string;
  rampBase?: string;
  rampName?: string;
  rampFormat?: string;
  vision?: string;
  palette?: unknown;
}

interface ContrastState {
  tool: ContrastTool;
  /** The pair being graded. */
  foreground: string;
  background: string;
  /** The colour a ramp is built around, and what its tokens are called. */
  rampBase: string;
  rampName: string;
  rampFormat: RampFormat;
  /** Which vision the palette is being previewed under. */
  vision: VisionType;
  /** The palette checked for confusable pairs. */
  palette: string[];

  setTool: (tool: ContrastTool) => void;
  setForeground: (hex: string) => void;
  setBackground: (hex: string) => void;
  swap: () => void;
  setRampBase: (hex: string) => void;
  setRampName: (name: string) => void;
  setRampFormat: (format: RampFormat) => void;
  setVision: (vision: VisionType) => void;
  addSwatch: (hex: string) => void;
  setSwatch: (index: number, hex: string) => void;
  removeSwatch: (index: number) => void;
  hydrate: () => Promise<void>;
}

const isTool = (v: unknown): v is ContrastTool => CONTRAST_TOOLS.includes(v as ContrastTool);

const RAMP_FORMATS: RampFormat[] = ["css", "tailwind", "scss", "json"];
const VISION_TYPES: VisionType[] = [
  "normal",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
];

/** Normalise to `#rrggbb`, or null if it is not a colour. */
function normalize(raw: string): string | null {
  const value = raw.trim();
  if (!isHex(value)) return null;
  let h = value.replace(/^#/, "").toLowerCase();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return `#${h}`;
}

/**
 * Contrast's state: the pair being graded, the ramp being generated, the palette
 * being simulated.
 *
 * Every colour is stored normalised to `#rrggbb`. Doing it at the boundary means
 * nothing downstream has to cope with `#ABC` and `abcdef` being the same colour —
 * the ramp generator, the grader and the simulator all get one form. Invalid input
 * is *rejected* rather than coerced to black, because silently turning a typo into
 * black would report a contrast figure for a colour nobody chose.
 */
export const useContrastStore = create<ContrastState>((set, get) => ({
  tool: "check",
  foreground: "#1f74e0",
  background: "#ffffff",
  rampBase: "#1f74e0",
  rampName: "brand",
  rampFormat: "css",
  vision: "deuteranopia",
  palette: DEFAULT_PALETTE,

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },

  setForeground: (hex) => {
    const value = normalize(hex);
    if (value) {
      set({ foreground: value });
      void persist(get());
    }
  },

  setBackground: (hex) => {
    const value = normalize(hex);
    if (value) {
      set({ background: value });
      void persist(get());
    }
  },

  swap: () => {
    const { foreground, background } = get();
    set({ foreground: background, background: foreground });
    void persist(get());
  },

  setRampBase: (hex) => {
    const value = normalize(hex);
    if (value) {
      set({ rampBase: value });
      void persist(get());
    }
  },

  setRampName: (rampName) => {
    set({ rampName: rampName.slice(0, 40) });
    void persist(get());
  },

  setRampFormat: (rampFormat) => {
    set({ rampFormat });
    void persist(get());
  },

  setVision: (vision) => {
    set({ vision });
    void persist(get());
  },

  addSwatch: (hex) => {
    const value = normalize(hex);
    const { palette } = get();
    if (!value || palette.length >= MAX_PALETTE) return;
    set({ palette: [...palette, value] });
    void persist(get());
  },

  setSwatch: (index, hex) => {
    const value = normalize(hex);
    if (!value) return;
    const palette = get().palette.slice();
    if (index < 0 || index >= palette.length) return;
    palette[index] = value;
    set({ palette });
    void persist(get());
  },

  removeSwatch: (index) => {
    const palette = get().palette.filter((_, i) => i !== index);
    // Never leave the grid empty — there would be nothing to simulate, and the
    // panel would look broken rather than empty.
    set({ palette: palette.length > 0 ? palette : DEFAULT_PALETTE.slice(0, 2) });
    void persist(get());
  },

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as StoredPrefs;
      const palette = Array.isArray(p.palette)
        ? p.palette
            .map((v) => (typeof v === "string" ? normalize(v) : null))
            .filter((v): v is string => v !== null)
            .slice(0, MAX_PALETTE)
        : [];

      set({
        tool: isTool(p.tool) ? p.tool : "check",
        foreground: normalize(p.foreground ?? "") ?? get().foreground,
        background: normalize(p.background ?? "") ?? get().background,
        rampBase: normalize(p.rampBase ?? "") ?? get().rampBase,
        rampName: typeof p.rampName === "string" ? p.rampName.slice(0, 40) : "brand",
        rampFormat: RAMP_FORMATS.includes(p.rampFormat as RampFormat)
          ? (p.rampFormat as RampFormat)
          : "css",
        vision: VISION_TYPES.includes(p.vision as VisionType)
          ? (p.vision as VisionType)
          : "deuteranopia",
        palette: palette.length > 0 ? palette : DEFAULT_PALETTE,
      });
    } catch {
      /* corrupt prefs are simply the defaults */
    }
  },
}));

const persist = (s: ContrastState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: s.tool,
      foreground: s.foreground,
      background: s.background,
      rampBase: s.rampBase,
      rampName: s.rampName,
      rampFormat: s.rampFormat,
      vision: s.vision,
      palette: s.palette,
    } satisfies StoredPrefs),
  );

export { MAX_PALETTE };
