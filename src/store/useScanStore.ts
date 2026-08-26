"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import type { Quad } from "@/lib/Scan/warp";
import type { ScanFilter } from "@/lib/Scan/enhance";
import type { PageSize } from "@/lib/Scan/pdf";

/**
 * A page in the current scan.
 *
 * Both the original capture and the processed result are held, because every edit
 * — moving a corner, changing the filter, rotating — has to re-derive the result
 * from the *original*. Keeping only the processed image would mean each edit
 * compounding on the last, and a page that degrades a little every time you touch
 * it.
 */
export interface ScanPage {
  id: string;
  /** The capture as taken, never modified. A JPEG data URL. */
  original: string;
  /** Natural pixel size of the original, for mapping the quad to the display. */
  width: number;
  height: number;
  /** Corners in the original's pixel space. */
  quad: Quad;
  filter: ScanFilter;
  /** Quarter turns clockwise, applied after the warp. */
  rotation: number;
  /** The warped, filtered, rotated result. Null until it has been rendered. */
  processed: string | null;
}

interface ScanState {
  pages: ScanPage[];
  /** Id of the page open in the editor, or null for the page list. */
  editingId: string | null;
  pageSize: PageSize;
  title: string;
  /** Set while a warp is running, so the UI can say so. */
  busy: boolean;

  addPage: (page: Omit<ScanPage, "id" | "processed">) => string;
  setQuad: (id: string, quad: Quad) => void;
  setFilter: (id: string, filter: ScanFilter) => void;
  rotate: (id: string, quarters: number) => void;
  setProcessed: (id: string, processed: string) => void;
  remove: (id: string) => void;
  move: (id: string, delta: number) => void;
  edit: (id: string | null) => void;
  setPageSize: (size: PageSize) => void;
  setTitle: (title: string) => void;
  setBusy: (busy: boolean) => void;
  clear: () => void;
}

/**
 * The current scan.
 *
 * **Not persisted, on purpose.** A scan is a few megabytes of full-resolution JPEG
 * per page and its whole life is "capture, tidy, export" — measured in a minute or
 * two. Writing that to storage would fill the workspace's quota with documents the
 * user already saved as a PDF, and reopening the app to yesterday's half-finished
 * scan of a receipt is not a feature. Every other app here persists; this one is
 * the exception because its output is a file, not a record.
 */
export const useScanStore = create<ScanState>((set, get) => ({
  pages: [],
  editingId: null,
  pageSize: "fit",
  title: "Scan",
  busy: false,

  addPage: (page) => {
    const id = uid();
    set({ pages: [...get().pages, { ...page, id, processed: null }] });
    return id;
  },

  // Each of the three edits clears `processed`, which is the signal the editor
  // watches to re-run the warp. Keeping that in the store rather than in the
  // component is what stops a stale image being exported.
  setQuad: (id, quad) => {
    set({
      pages: get().pages.map((p) => (p.id === id ? { ...p, quad, processed: null } : p)),
    });
  },

  setFilter: (id, filter) => {
    set({
      pages: get().pages.map((p) => (p.id === id ? { ...p, filter, processed: null } : p)),
    });
  },

  rotate: (id, quarters) => {
    set({
      pages: get().pages.map((p) =>
        p.id === id ? { ...p, rotation: (((p.rotation + quarters) % 4) + 4) % 4, processed: null } : p,
      ),
    });
  },

  setProcessed: (id, processed) => {
    set({ pages: get().pages.map((p) => (p.id === id ? { ...p, processed } : p)) });
  },

  remove: (id) => {
    const pages = get().pages.filter((p) => p.id !== id);
    set({ pages, editingId: get().editingId === id ? null : get().editingId });
  },

  move: (id, delta) => {
    const pages = get().pages.slice();
    const from = pages.findIndex((p) => p.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= pages.length) return;
    const [page] = pages.splice(from, 1);
    pages.splice(to, 0, page);
    set({ pages });
  },

  edit: (editingId) => set({ editingId }),
  setPageSize: (pageSize) => set({ pageSize }),
  setTitle: (title) => set({ title: title.slice(0, 80) }),
  setBusy: (busy) => set({ busy }),

  clear: () => set({ pages: [], editingId: null, title: "Scan" }),
}));
