"use client";

import { create } from "zustand";

/** Apps available in the workspace launcher. Sketchnotes is the default. */
export type AppId =
  | "sketchnotes"
  | "pdf"
  | "image"
  | "todos"
  | "reminders"
  | "timer"
  | "system"
  | "speed";

interface WorkspaceState {
  /** Which app fills the workspace. Defaults to the sketch canvas. */
  activeApp: AppId;
  /** Active PDF-editor section id (null = its home/tool grid). */
  pdfTool: string | null;
  /** Whether the app-switcher launcher overlay is open. */
  launcherOpen: boolean;
  /** Whether the application settings overlay is open. */
  settingsOpen: boolean;

  setActiveApp: (app: AppId) => void;
  setPdfTool: (tool: string | null) => void;
  openLauncher: () => void;
  closeLauncher: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeApp: "sketchnotes",
  pdfTool: null,
  launcherOpen: false,
  settingsOpen: false,

  setActiveApp: (app) => set({ activeApp: app, launcherOpen: false }),
  setPdfTool: (pdfTool) => set({ pdfTool }),
  openLauncher: () => set({ launcherOpen: true }),
  closeLauncher: () => set({ launcherOpen: false }),
  // Opening settings closes the launcher so only one overlay shows at a time.
  openSettings: () => set({ settingsOpen: true, launcherOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
}));
