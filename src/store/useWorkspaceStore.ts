"use client";

import { create } from "zustand";

/** Apps available in the workspace launcher. Sketchnotes is the default. */
export type AppId = "sketchnotes" | "pdf";

interface WorkspaceState {
  /** Which app fills the workspace. Defaults to the sketch canvas. */
  activeApp: AppId;
  /** Whether the app-switcher launcher overlay is open. */
  launcherOpen: boolean;
  /** True once the PDF editor iframe has been opened at least once, so we can
   *  keep it mounted afterwards and preserve any loaded document. */
  pdfMounted: boolean;

  setActiveApp: (app: AppId) => void;
  openLauncher: () => void;
  closeLauncher: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeApp: "sketchnotes",
  launcherOpen: false,
  pdfMounted: false,

  setActiveApp: (app) =>
    set((s) => ({
      activeApp: app,
      launcherOpen: false,
      pdfMounted: s.pdfMounted || app === "pdf",
    })),
  openLauncher: () => set({ launcherOpen: true }),
  closeLauncher: () => set({ launcherOpen: false }),
}));
