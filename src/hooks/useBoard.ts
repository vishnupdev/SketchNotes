"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { applyCommand } from "@/lib/Board/apply";
import {
  BOARD_KEY,
  clampText,
  clampTitle,
  fetchBoard,
  safeUrl,
  saveBoard,
} from "@/lib/Board/board-api";
import { itemPart, moveToTrash } from "@/lib/trash";
import { parsePrompt } from "@/lib/Board/commands";
import type { BoardCommand, BoardSection, SectionItem } from "@/lib/Board/types";
import { queryKeys } from "@/lib/query-keys";
import { useBoardStore } from "@/store/useBoardStore";

/** The board itself. One array is the whole truth; the UI renders it in order. */
export function useBoard() {
  return useQuery({
    queryKey: queryKeys.board,
    queryFn: fetchBoard,
    staleTime: Infinity,
  });
}

/**
 * Every way the board changes, in one place so they share a query client and a
 * single undo stack.
 *
 * Two doors into the same room:
 *
 * - {@link BoardActions.runPrompt} parses a line of English and dispatches the
 *   command it resolves to. This is the app's headline interaction.
 * - {@link BoardActions.dispatch} takes an already-built command, which is what
 *   the card controls (+/−, tick, move, remove) use. Routing the buttons through
 *   the *same* reducer as the prompt is deliberate: there is one definition of
 *   what "reset a counter" means, and both paths get undo for free.
 *
 * Free-text editing (a note's body, a renamed title, a retyped row) goes through
 * the `write*` methods instead. Those deliberately skip the undo stack and the
 * transcript — a snapshot per keystroke would bury the entries worth keeping,
 * and the text itself is still on screen to fix.
 */
export interface BoardActions {
  sections: BoardSection[];
  /** Parse a line of English and carry it out. */
  runPrompt: (input: string) => void;
  /**
   * Carry out an already-resolved command. Pass `undoable: false` for a control
   * that fires per keystroke or per spinner click (a counter's goal field, say),
   * so one adjustment doesn't bury the undo stack under twenty entries.
   */
  dispatch: (command: BoardCommand, opts?: { undoable?: boolean }) => void;
  writeSection: (id: string, patch: Partial<Pick<BoardSection, "title" | "text" | "unit">>) => void;
  writeItem: (id: string, itemId: string, patch: Partial<Pick<SectionItem, "text" | "url">>) => void;
  /** Step back to the board as it was before the last undoable change. */
  undo: () => void;
  canUndo: boolean;
}

export function useBoardActions(): BoardActions {
  const qc = useQueryClient();
  const { data } = useBoard();
  const sections = data ?? [];

  const pushLog = useBoardStore((s) => s.pushLog);
  const pushPast = useBoardStore((s) => s.pushPast);
  const popPast = useBoardStore((s) => s.popPast);
  const setFocus = useBoardStore((s) => s.setFocus);
  const setDraft = useBoardStore((s) => s.setDraft);
  const toggleHelp = useBoardStore((s) => s.toggleHelp);
  const canUndo = useBoardStore((s) => s.past.length > 0);

  /* Read from the cache rather than from the render's `sections`, so two
     dispatches in one tick can't both build on the same stale array. */
  const read = useCallback(
    () => qc.getQueryData<BoardSection[]>(queryKeys.board) ?? [],
    [qc],
  );

  const commit = useCallback(
    (next: BoardSection[]) => {
      qc.setQueryData(queryKeys.board, next);
      void saveBoard(next);
    },
    [qc],
  );

  const dispatch = useCallback(
    (command: BoardCommand, opts?: { undoable?: boolean }) => {
      const before = read();
      const result = applyCommand(before, command);
      if (result.sections) {
        if (result.undoable && opts?.undoable !== false) pushPast(before);
        /*
         * Undo already covers the last 25 changes of *this session*; the trash is
         * what survives a reload. Only the two commands that destroy a whole
         * section go in it — an unticked checkbox is not worth keeping for a
         * month, and a removed card can be an afternoon's thinking.
         */
        if (command.kind === "remove" || command.kind === "clear") {
          const gone =
            command.kind === "remove"
              ? before.filter((s) => s.id === command.id)
              : before;
          for (const section of gone) {
            void moveToTrash({
              app: "board",
              label: section.title,
              detail: `${section.type} · ${section.items.length} row${section.items.length === 1 ? "" : "s"}`,
              parts: [itemPart(BOARD_KEY, section)],
            });
          }
        }
        commit(result.sections);
      }
      // Deliberately no `setFocus` here: flashing and scrolling to a card is how
      // a *typed* command shows where it landed. A card's own buttons are
      // already under the user's eye, and scrolling out from under a field being
      // edited would be actively hostile.
    },
    [read, commit, pushPast],
  );

  const undo = useCallback(() => {
    const previous = popPast();
    if (!previous) {
      pushLog("undo", "There's nothing to undo.", false);
      return;
    }
    commit(previous);
    pushLog("undo", "Reverted the last change.", true);
  }, [popPast, commit, pushLog]);

  const runPrompt = useCallback(
    (input: string) => {
      const text = input.trim();
      if (!text) return;
      const before = read();
      const parsed = parsePrompt(text, before);

      if (!parsed.ok) {
        // The draft is left in place: the wording was nearly right, and
        // re-typing it from scratch to fix one word is the wrong ask.
        pushLog(text, parsed.message, false);
        return;
      }

      if (parsed.command.kind === "help") {
        toggleHelp();
        pushLog(text, "Here's everything you can say.", true);
        setDraft("");
        return;
      }
      if (parsed.command.kind === "undo") {
        undo();
        setDraft("");
        return;
      }

      const result = applyCommand(before, parsed.command);
      if (result.sections) {
        if (result.undoable) pushPast(before);
        commit(result.sections);
      }
      if (result.focusId) setFocus(result.focusId);
      pushLog(text, result.message, result.sections !== null);
      // Only a change earns a cleared composer; a "nothing happened" reply
      // leaves the wording there to adjust.
      if (result.sections) setDraft("");
    },
    [read, commit, pushPast, pushLog, setFocus, setDraft, toggleHelp, undo],
  );

  const writeSection = useCallback(
    (id: string, patch: Partial<Pick<BoardSection, "title" | "text" | "unit">>) => {
      const clean: Partial<BoardSection> = {};
      if (patch.title !== undefined) clean.title = clampTitle(patch.title);
      if (patch.text !== undefined) clean.text = clampText(patch.text);
      if (patch.unit !== undefined) clean.unit = clampTitle(patch.unit);
      commit(read().map((s) => (s.id === id ? { ...s, ...clean, updatedAt: Date.now() } : s)));
    },
    [read, commit],
  );

  const writeItem = useCallback(
    (id: string, itemId: string, patch: Partial<Pick<SectionItem, "text" | "url">>) => {
      const clean: Partial<SectionItem> = {};
      if (patch.text !== undefined) clean.text = clampTitle(patch.text);
      if (patch.url !== undefined) clean.url = safeUrl(patch.url);
      commit(
        read().map((s) =>
          s.id === id
            ? {
                ...s,
                updatedAt: Date.now(),
                items: s.items.map((i) => (i.id === itemId ? { ...i, ...clean } : i)),
              }
            : s,
        ),
      );
    },
    [read, commit],
  );

  return { sections, runPrompt, dispatch, writeSection, writeItem, undo, canUndo };
}
