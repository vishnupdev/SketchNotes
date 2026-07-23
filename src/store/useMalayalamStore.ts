"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";

const TEXT_KEY = "sknotes:malayalam-doc";
const FMT_KEY = "sknotes:malayalam-format";

export type FontFamily = "sans" | "serif" | "mono" | "hand";

/** Visual formatting applied to the whole document (uniform, textarea-wide). */
export interface DocFormat {
  fontFamily: FontFamily;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  /** Hex colour, or null to inherit the active theme's text colour. */
  color: string | null;
  /** Hex colour, or null to inherit the active theme's paper colour. */
  background: string | null;
}

export const DEFAULT_FORMAT: DocFormat = {
  fontFamily: "sans",
  fontSize: 18,
  bold: false,
  italic: false,
  color: null,
  background: null,
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Best-effort coercion of a parsed value into a valid DocFormat. */
function normalizeFormat(raw: unknown): DocFormat {
  const f = { ...DEFAULT_FORMAT };
  if (!raw || typeof raw !== "object") return f;
  const r = raw as Record<string, unknown>;
  if (r.fontFamily === "sans" || r.fontFamily === "serif" || r.fontFamily === "mono" || r.fontFamily === "hand") {
    f.fontFamily = r.fontFamily;
  }
  if (typeof r.fontSize === "number" && r.fontSize >= 12 && r.fontSize <= 64) f.fontSize = r.fontSize;
  f.bold = Boolean(r.bold);
  f.italic = Boolean(r.italic);
  if (typeof r.color === "string" && HEX.test(r.color)) f.color = r.color;
  if (typeof r.background === "string" && HEX.test(r.background)) f.background = r.background;
  return f;
}

interface MalayalamState {
  /** The composed Malayalam document. Persisted to localStorage. */
  text: string;
  /** Formatting applied to the document. Persisted to localStorage. */
  format: DocFormat;
  /** True once the persisted state has been merged in (avoids SSR mismatch). */
  hydrated: boolean;

  setText: (text: string) => void;
  setFormat: (patch: Partial<DocFormat>) => void;
  hydrate: () => void;
  clear: () => void;
}

export const useMalayalamStore = create<MalayalamState>((set, get) => ({
  text: "",
  format: DEFAULT_FORMAT,
  hydrated: false,

  setText: (text) => {
    set({ text });
    void sSet(TEXT_KEY, text);
  },
  setFormat: (patch) => {
    const format = { ...get().format, ...patch };
    set({ format });
    void sSet(FMT_KEY, JSON.stringify(format));
  },
  hydrate: async () => {
    const [text, fmt] = await Promise.all([sGet(TEXT_KEY), sGet(FMT_KEY)]);
    let format = DEFAULT_FORMAT;
    if (fmt) {
      try {
        format = normalizeFormat(JSON.parse(fmt));
      } catch {
        /* corrupt value — keep defaults */
      }
    }
    set({ text: text ?? "", format, hydrated: true });
  },
  clear: () => {
    set({ text: "" });
    void sSet(TEXT_KEY, "");
  },
}));
