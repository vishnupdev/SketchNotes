"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { setUiSoundEnabled, UI_SOUND_KEY } from "@/lib/ui-sound";
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
  | "nearby"
  | "speed"
  | "news"
  | "world"
  | "malayalam"
  | "translate"
  | "morse"
  | "sound"
  | "color"
  | "resources"
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
  "resources",
  "nearby",
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
  /**
   * The app whose opening animation is currently playing (null = none). Set by
   * {@link setActiveApp} when the app actually changes, and cleared by
   * <AppIntro /> once the animation is done.
   */
  appIntro: AppId | null;
  /** Chosen mouse pointer for the whole workspace. See `@/lib/cursors`. */
  cursor: CursorSettings;
  /**
   * Whether the interface sounds play — the boot chime and the movement tones.
   * On by default. Mirrored into `@/lib/ui-sound`, which is where the cues are
   * actually gated, so a non-React caller (`playNav`) needn't reach the store.
   */
  soundOn: boolean;

  /**
   * Open an app. Plays that app's opening animation unless `intro: false` —
   * which is what adopting a deep link on first load passes, since there the
   * app isn't opening on top of anything.
   */
  setActiveApp: (app: AppId, opts?: { intro?: boolean }) => void;
  setPdfTool: (tool: string | null) => void;
  /** Called by <AppIntro /> when the opening animation has finished. */
  endAppIntro: () => void;
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
  /** Merge the persisted sound choice in after mount (avoids SSR mismatch). */
  hydrateSound: () => void;
  /** Turn the interface sounds on or off for the whole workspace. */
  setSoundOn: (on: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeApp: "sketchnotes",
  pdfTool: null,
  launcherOpen: false,
  settingsOpen: false,
  appOrder: ALL_APPS,
  appIntro: null,
  cursor: DEFAULT_CURSOR_SETTINGS,
  soundOn: true,

  // Re-picking the app that's already on screen closes the launcher without
  // replaying the animation — nothing opened.
  setActiveApp: (app, opts) =>
    set({
      activeApp: app,
      launcherOpen: false,
      appIntro: opts?.intro === false || app === get().activeApp ? get().appIntro : app,
    }),
  setPdfTool: (pdfTool) => set({ pdfTool }),
  endAppIntro: () => set({ appIntro: null }),
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

  // Stored as "on"/"off" rather than JSON: `@/lib/ui-sound` reads the same key
  // synchronously to gate a cue that fires before this hydration lands, and a
  // bare flag is the one shape both readers can agree on without parsing.
  hydrateSound: async () => {
    const raw = await sGet(UI_SOUND_KEY);
    if (raw === null) return;
    const on = raw !== "off";
    set({ soundOn: on });
    setUiSoundEnabled(on);
  },
  setSoundOn: (on) => {
    set({ soundOn: on });
    setUiSoundEnabled(on);
    void sSet(UI_SOUND_KEY, on ? "on" : "off");
  },
}));
