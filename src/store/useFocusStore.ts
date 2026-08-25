"use client";

import { create } from "zustand";
import type { AppId } from "@/store/useWorkspaceStore";

/**
 * "Open that app, and put me on *this* thing."
 *
 * The shell can switch apps but has no business knowing how to select a note or
 * scroll to a board card. So a search hit leaves a target here, the shell opens
 * the app, and the app takes the target if it knows what to do with one — the
 * same arrangement as `useIntakeStore` for incoming files.
 *
 * Reading is destructive, which is the point: a target must be acted on once,
 * not re-applied every time the app happens to re-mount.
 *
 * Never persisted. A focus request is meaningful for a second, and reopening the
 * workspace tomorrow should not jump somewhere.
 */
interface FocusState {
  /** The app the request is for, or null when nothing is pending. */
  app: AppId | null;
  /** App-specific id — a note id, a board section id. */
  target: string | null;

  request: (app: AppId, target: string) => void;
  /** Take the target for `app`, clearing it. Null if the request isn't for it. */
  take: (app: AppId) => string | null;
  clear: () => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  app: null,
  target: null,

  request: (app, target) => set({ app, target }),

  take: (app) => {
    const { app: pending, target } = get();
    if (pending !== app || target === null) return null;
    set({ app: null, target: null });
    return target;
  },

  clear: () => set({ app: null, target: null }),
}));
