"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import type { BoardLogEntry, BoardSection } from "@/lib/Board/types";

/** How many undo steps are kept. Deep enough to walk back a bad prompt run,
 *  shallow enough that the snapshots stay cheap. */
const UNDO_DEPTH = 25;

/** How many transcript lines are shown under the composer. */
const LOG_DEPTH = 8;

interface BoardState {
  /** What's in the composer. */
  draft: string;
  /** Whether the grammar sheet is open. */
  helpOpen: boolean;
  /** Section to scroll to and flash — cleared once the flash has run. */
  focusId: string | null;
  /** Newest-first transcript of prompts and what they did. */
  log: BoardLogEntry[];
  /**
   * Board snapshots, newest last, for undo. These are *session* history rather
   * than data: the board itself lives in the TanStack Query cache and
   * localStorage, so a reload starts a fresh, empty undo stack instead of
   * offering to revert a change from days ago.
   */
  past: BoardSection[][];

  setDraft: (draft: string) => void;
  toggleHelp: () => void;
  closeHelp: () => void;
  setFocus: (focusId: string | null) => void;
  /** Record what a prompt did, for the transcript. */
  pushLog: (input: string, message: string, ok: boolean) => void;
  clearLog: () => void;
  /** Remember `sections` as the state to return to. */
  pushPast: (sections: BoardSection[]) => void;
  /** Take the most recent snapshot off the stack, or null when there is none. */
  popPast: () => BoardSection[] | null;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  draft: "",
  helpOpen: false,
  focusId: null,
  log: [],
  past: [],

  setDraft: (draft) => set({ draft }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  closeHelp: () => set({ helpOpen: false }),
  setFocus: (focusId) => set({ focusId }),

  pushLog: (input, message, ok) =>
    set((s) => ({
      log: [{ id: uid(), input, message, ok, at: Date.now() }, ...s.log].slice(0, LOG_DEPTH),
    })),
  clearLog: () => set({ log: [] }),

  pushPast: (sections) => set((s) => ({ past: [...s.past, sections].slice(-UNDO_DEPTH) })),
  popPast: () => {
    const { past } = get();
    if (!past.length) return null;
    set({ past: past.slice(0, -1) });
    return past[past.length - 1];
  },
}));
