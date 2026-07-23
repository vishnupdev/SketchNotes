"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";

/** Apps available in the workspace launcher. Sketchnotes is the default. */
export type AppId =
  | "sketchnotes"
  | "pdf"
  | "image"
  | "todos"
  | "reminders"
  | "timer"
  | "system"
  | "speed"
  | "news"
  | "malayalam"
  | "translate";

/** Canonical app list — also the default launcher order for a fresh visitor. */
const ALL_APPS: AppId[] = [
  "sketchnotes",
  "pdf",
  "image",
  "todos",
  "reminders",
  "timer",
  "system",
  "speed",
  "news",
  "malayalam",
  "translate",
];

const ORDER_KEY = "sknotes:app-order";

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

  setActiveApp: (app: AppId) => void;
  setPdfTool: (tool: string | null) => void;
  openLauncher: () => void;
  closeLauncher: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  /** Merge the persisted launcher order in after mount (avoids SSR mismatch). */
  hydrateAppOrder: () => void;
  setAppOrder: (order: AppId[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeApp: "sketchnotes",
  pdfTool: null,
  launcherOpen: false,
  settingsOpen: false,
  appOrder: ALL_APPS,

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
}));
