"use client";

import { create } from "zustand";
import type { IntakeItem, IntakeKind } from "@/lib/intake/types";

/**
 * The waiting room for files and text arriving from outside the workspace.
 *
 * Shell-level and deliberately tiny: the shell puts an arrival here and switches
 * to the app that can open it; that app takes it and does its own thing with it.
 * Neither side imports the other, so a new arrival type is a line in
 * `lib/intake/types.ts` plus one `useEffect` in the app that wants it — and an
 * app that never looks costs nothing (rules #4/#5).
 *
 * Never persisted. An arrival is a one-time delivery, and a file handle from a
 * previous session is not something to hold on to.
 */
interface IntakeState {
  pending: IntakeItem[];
  /** Anything that arrived but no app could open, phrased for the user. */
  problem: string;

  push: (items: IntakeItem[]) => void;
  /**
   * Take the oldest arrival of a kind, removing it. Reading destructively is
   * what stops an app re-opening the same file every time it is re-mounted.
   */
  take: (kind: IntakeKind) => IntakeItem | null;
  /** Whether anything of this kind is waiting — cheap to subscribe to. */
  setProblem: (message: string) => void;
  clear: () => void;
}

export const useIntakeStore = create<IntakeState>((set, get) => ({
  pending: [],
  problem: "",

  push: (items) => {
    if (items.length === 0) return;
    set((s) => ({ pending: [...s.pending, ...items], problem: "" }));
  },

  take: (kind) => {
    const item = get().pending.find((i) => i.kind === kind) ?? null;
    if (item) set((s) => ({ pending: s.pending.filter((i) => i.id !== item.id) }));
    return item;
  },

  setProblem: (problem) => set({ problem }),
  clear: () => set({ pending: [], problem: "" }),
}));

/** Selector helper: is an arrival of this kind waiting? */
export const hasIntake = (kind: IntakeKind) => (s: IntakeState) =>
  s.pending.some((i) => i.kind === kind);
