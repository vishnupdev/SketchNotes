"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import {
  DEFAULT_CURSOR_SETTINGS,
  normalizeCursorSettings,
  type CursorSettings,
} from "@/lib/cursors";

/** Apps available in the workspace launcher. Sketchnotes is the default. */
export type AppId =
  | "sketchnotes"
  | "pdf"
  | "image"
  | "board"
  | "todos"
  | "reminders"
  | "timer"
  | "system"
  | "speed"
  | "news"
  | "world"
  | "malayalam"
  | "translate"
  | "morse"
  | "sound"
  | "color"
  | "assistant";

/** Canonical app list — also the default launcher order for a fresh visitor. */
const ALL_APPS: AppId[] = [
  "sketchnotes",
  // The guide sits near the front so a first-time visitor finds it early.
  "assistant",
  "pdf",
  "image",
  "board",
  "todos",
  "reminders",
  "timer",
  "system",
  "speed",
  "news",
  "world",
  "malayalam",
  "translate",
  "morse",
  "sound",
  "color",
];

const ORDER_KEY = "sknotes:app-order";
const CURSOR_KEY = "sknotes:cursor";

/**
 * Coerce an untrusted stored value into a valid, complete ordering: keep only
 * known ids (no dupes), then append any apps the stored order is missing so a
 * newly-added app still appears (at the end) rather than vanishing.
 */
function normalizeOrder(raw: unknown): AppId[] {
  const valid = new Set<AppId>(ALL_APPS);
  const seen = new Set<AppId>();
  const out: AppId[] = [];
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === "string" && valid.has(v as AppId) && !seen.has(v as AppId)) {
        seen.add(v as AppId);
        out.push(v as AppId);
      }
    }
  }
  for (const a of ALL_APPS) if (!seen.has(a)) out.push(a);
  return out;
}

interface WorkspaceState {
  /** Which app fills the workspace. Defaults to the sketch canvas. */
  activeApp: AppId;
  /** Active PDF-editor section id (null = its home/tool grid). */
  pdfTool: string | null;
  /** Whether the app-switcher launcher overlay is open. */
  launcherOpen: boolean;
  /** Whether the application settings overlay is open. */
  settingsOpen: boolean;
  /** User-defined order of launcher tiles; persisted to localStorage. */
  appOrder: AppId[];
  /** Chosen mouse pointer for the whole workspace. See `@/lib/cursors`. */
  cursor: CursorSettings;

  setActiveApp: (app: AppId) => void;
  setPdfTool: (tool: string | null) => void;
  openLauncher: () => void;
  closeLauncher: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  /** Merge the persisted launcher order in after mount (avoids SSR mismatch). */
  hydrateAppOrder: () => void;
  setAppOrder: (order: AppId[]) => void;
  /** Merge the persisted pointer choice in after mount (avoids SSR mismatch). */
  hydrateCursor: () => void;
  /** Change part of the pointer setup (preset, size, colour or custom image). */
  updateCursor: (patch: Partial<CursorSettings>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeApp: "sketchnotes",
  pdfTool: null,
  launcherOpen: false,
  settingsOpen: false,
  appOrder: ALL_APPS,
  cursor: DEFAULT_CURSOR_SETTINGS,

  setActiveApp: (app) => set({ activeApp: app, launcherOpen: false }),
  setPdfTool: (pdfTool) => set({ pdfTool }),
  openLauncher: () => set({ launcherOpen: true }),
  closeLauncher: () => set({ launcherOpen: false }),
  // Opening settings closes the launcher so only one overlay shows at a time.
  openSettings: () => set({ settingsOpen: true, launcherOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),

  hydrateAppOrder: async () => {
    const raw = await sGet(ORDER_KEY);
    if (!raw) return;
    try {
      set({ appOrder: normalizeOrder(JSON.parse(raw)) });
    } catch {
      /* corrupt value — keep the default order */
    }
  },
  setAppOrder: (order) => {
    const next = normalizeOrder(order);
    set({ appOrder: next });
    void sSet(ORDER_KEY, JSON.stringify(next));
  },

  hydrateCursor: async () => {
    const raw = await sGet(CURSOR_KEY);
    if (!raw) return;
    // Anything unrecognised — a retired preset, an older format, a hand-edited
    // value — is coerced back to something usable rather than left to break the
    // pointer. The first version of this feature stored a bare id string, which
    // isn't JSON, so a parse failure is a legitimate value and not an error.
    try {
      set({ cursor: normalizeCursorSettings(JSON.parse(raw)) });
    } catch {
      set({ cursor: normalizeCursorSettings(raw) });
    }
  },
  updateCursor: (patch) => {
    const next = normalizeCursorSettings({ ...get().cursor, ...patch });
    set({ cursor: next });
    void sSet(CURSOR_KEY, JSON.stringify(next));
  },
}));
