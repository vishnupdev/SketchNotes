"use client";

import { create } from "zustand";
import type { EditorState as OverlayState } from "@/engine/SketchEngine";
import type { Theme, Tool } from "@/engine/types";
import { DEFAULT_FONT, DEFAULT_TEXT_SIZE, DEFAULT_THEME, WIDTHS } from "@/engine/constants";

/** Which single popover (if any) is open in the dock/header. */
export type PopoverId =
  | "color"
  | "width"
  | "shape"
  | "emoji"
  | "font"
  | "textsize"
  | "download"
  | null;

export type SaveStatus = "" | "saving" | "saved";

interface EditorState {
  /* --- tool & style (source of truth, pushed to the engine) --- */
  tool: Tool;
  color: string;
  widthIdx: number;
  currentEmoji: string;
  fontKey: string;
  fontSize: number;
  dark: boolean;

  /* --- current note --- */
  curId: string | null;
  title: string;

  /* --- derived engine state --- */
  zoom: number;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isEmpty: boolean;

  /* --- chrome / UI --- */
  activePopover: PopoverId;
  drawerOpen: boolean;
  saveStatus: SaveStatus;
  editorOverlay: OverlayState | null;
  /** Live text-overlay value, read by the engine when it commits internally. */
  editValue: string;
  toast: { message: string; nonce: number } | null;
  storageOK: boolean;

  /* --- actions --- */
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setWidthIdx: (i: number) => void;
  setCurrentEmoji: (ch: string) => void;
  setFontKey: (k: string) => void;
  setFontSize: (px: number) => void;
  setDark: (d: boolean) => void;
  setTheme: (t: Theme) => void;

  setCurId: (id: string | null) => void;
  setTitle: (t: string) => void;

  setZoom: (z: number) => void;
  setHasSelection: (v: boolean) => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
  setIsEmpty: (v: boolean) => void;

  togglePopover: (id: Exclude<PopoverId, null>) => void;
  closePopovers: () => void;
  setDrawerOpen: (open: boolean) => void;
  setSaveStatus: (s: SaveStatus) => void;
  setEditorOverlay: (s: OverlayState | null) => void;
  setEditValue: (v: string) => void;
  showToast: (message: string) => void;
  setStorageOK: (ok: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tool: "pen",
  color: "auto",
  widthIdx: 1,
  currentEmoji: "😀",
  fontKey: DEFAULT_FONT,
  fontSize: DEFAULT_TEXT_SIZE,
  dark: DEFAULT_THEME === "dark",

  curId: null,
  title: "",

  zoom: 1,
  hasSelection: false,
  canUndo: false,
  canRedo: false,
  isEmpty: true,

  activePopover: null,
  drawerOpen: false,
  saveStatus: "",
  editorOverlay: null,
  editValue: "",
  toast: null,
  storageOK: true,

  setTool: (tool) => set({ tool, activePopover: null }),
  setColor: (color) => set({ color }),
  setWidthIdx: (widthIdx) => set({ widthIdx }),
  setCurrentEmoji: (currentEmoji) => set({ currentEmoji }),
  setFontKey: (fontKey) => set({ fontKey }),
  setFontSize: (fontSize) => set({ fontSize }),
  setDark: (dark) => set({ dark }),
  setTheme: (t) => set({ dark: t === "dark" }),

  setCurId: (curId) => set({ curId }),
  setTitle: (title) => set({ title }),

  setZoom: (zoom) => set({ zoom }),
  setHasSelection: (hasSelection) => set({ hasSelection }),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setIsEmpty: (isEmpty) => set({ isEmpty }),

  togglePopover: (id) =>
    set((s) => ({ activePopover: s.activePopover === id ? null : id })),
  closePopovers: () => set({ activePopover: null }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setEditorOverlay: (editorOverlay) => set({ editorOverlay }),
  setEditValue: (editValue) => set({ editValue }),
  showToast: (message) => set({ toast: { message, nonce: Date.now() } }),
  setStorageOK: (storageOK) => set({ storageOK }),
}));

export { WIDTHS };
