"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import type { AppId } from "@/store/useWorkspaceStore";
import { TOURS } from "@/lib/Walkaround/tours";

const APP_KEY = "sknotes:walk:app";
const DONE_KEY = "sknotes:walk:done";
const VIEW_KEY = "sknotes:walk:view";

/** Which half of the app is on screen. */
export type WalkView = "apps" | "tour";

export const WALK_VIEWS: WalkView[] = ["apps", "tour"];

const isApp = (v: unknown): v is AppId => typeof v === "string" && v in TOURS;

interface WalkaroundState {
  view: WalkView;
  /** The app being walked around, or null before one is picked. */
  app: AppId | null;
  /** Which stop of that app's tour is showing. */
  step: number;
  /** Apps whose tour has been seen through to the last stop. */
  done: AppId[];

  setView: (view: WalkView) => void;
  /** Pick an app and start its tour from the beginning. */
  start: (app: AppId) => void;
  /** Jump to a stop — from a pin on the stage, or a row in the step list. */
  goTo: (step: number) => void;
  /** Move one stop; stops at either end rather than wrapping. */
  nudge: (delta: 1 | -1) => void;
  /** Merge the persisted pick and progress in after mount (avoids SSR mismatch). */
  hydrate: () => void;
}

/**
 * Walkaround's state: which app is being toured, where in its tour we are, and
 * which tours have been finished.
 *
 * The finished list is the only part worth persisting for its own sake — it is
 * what lets the picker say "you've seen this one" across visits, in an app whose
 * whole job is telling you about things you haven't found yet. The current pick
 * and step ride along so a reload drops you back where you were rather than at
 * the grid.
 */
export const useWalkaroundStore = create<WalkaroundState>((set, get) => ({
  view: "apps",
  app: null,
  step: 0,
  done: [],

  setView: (view) => {
    set({ view });
    void sSet(VIEW_KEY, view);
  },

  start: (app) => {
    set({ app, step: 0, view: "tour" });
    void sSet(APP_KEY, app);
    void sSet(VIEW_KEY, "tour");
  },

  goTo: (step) => {
    const { app } = get();
    if (!app) return;
    // Clamped rather than validated: a pin and a list row can only ever ask for
    // a stop that exists, and a persisted step from a tour that has since lost
    // a stop should land on the last one, not crash the panel.
    const last = TOURS[app].steps.length - 1;
    set({ step: Math.min(Math.max(step, 0), last) });
  },

  nudge: (delta) => get().goTo(get().step + delta),

  hydrate: async () => {
    const [app, done, view] = await Promise.all([sGet(APP_KEY), sGet(DONE_KEY), sGet(VIEW_KEY)]);
    const picked = isApp(app) ? app : null;
    let finished: AppId[] = [];
    try {
      const raw = done ? JSON.parse(done) : [];
      if (Array.isArray(raw)) finished = raw.filter(isApp);
    } catch {
      /* corrupt value — start the tick list over rather than fail to open */
    }
    set({
      app: picked,
      done: finished,
      // No pick means nothing to show in the tour view, so the grid wins
      // regardless of which view was last open.
      view: picked && view === "tour" ? "tour" : "apps",
      step: 0,
    });
  },
}));

/**
 * Mark a tour finished. Separate from the store's actions because it is called
 * from a render-time effect (reaching the last stop is what completes a tour,
 * not a button press) and must be a no-op once the app is already ticked.
 */
export function markTourDone(app: AppId): void {
  const { done } = useWalkaroundStore.getState();
  if (done.includes(app)) return;
  const next = [...done, app];
  useWalkaroundStore.setState({ done: next });
  void sSet(DONE_KEY, JSON.stringify(next));
}
