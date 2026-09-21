"use client";

import { useCallback, useEffect, useState } from "react";
import { useBoardActions } from "@/hooks/useBoard";
import { splitLink } from "@/lib/Board/board-api";
import type { BoardSection, SectionType } from "@/lib/Board/types";
import { useIntakeStore } from "@/store/useIntakeStore";
import { useFocusStore } from "@/store/useFocusStore";
import { hasSendTo, useSendToStore } from "@/store/useSendToStore";
import { useBoardStore } from "@/store/useBoardStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { AppsIcon, BoardIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { AddSectionBar } from "@/components/Board/molecules/AddSectionBar";
import { PromptLog } from "@/components/Board/molecules/PromptLog";
import { BoardCanvas } from "@/components/Board/organisms/BoardCanvas";
import { BoardEmpty } from "@/components/Board/organisms/BoardEmpty";
import { HelpSheet } from "@/components/Board/organisms/HelpSheet";
import { PromptComposer } from "@/components/Board/organisms/PromptComposer";

/** Title of the links section a share lands in. */
const SHARED_TITLE = "Shared";

/** Title of the note section text sent from another app lands in. */
const RECEIVED_TITLE = "Received";

/** A row waiting for the section it belongs in — see the settling effect. */
interface QueuedRow {
  type: SectionType;
  title: string;
  text: string;
  url: string;
}

/** The section with this type and title, if the board already has one. */
const findSection = (sections: BoardSection[], { type, title }: Pick<QueuedRow, "type" | "title">) =>
  sections.find((s) => s.type === type && s.title.toLowerCase() === title.toLowerCase());

/**
 * Board — a page of sections the user composes by describing it.
 *
 * "add a checklist for groceries", "rename it to shopping", "move it to top",
 * "remove it": the whole app is add / modify / remove, driven from one text field.
 * The wording is understood by a local parser (`lib/Board/commands.ts`), so it
 * costs nothing, needs no key and works with the network off — and every command
 * has an equivalent control on the card, so nothing is locked behind a phrase.
 *
 * The board lives in this browser (`sknotes:board`) like the rest of the
 * workspace: no account, nothing uploaded.
 */
export function BoardApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const helpOpen = useBoardStore((s) => s.helpOpen);
  const setDraft = useBoardStore((s) => s.setDraft);
  const actions = useBoardActions();
  const { sections, runPrompt, ready } = actions;
  /**
   * A row whose section does not exist yet.
   *
   * A fresh section has no id until the board has it, so the add is queued here
   * and the row dropped in on the next pass. Shared by both arrival paths below
   * — a share sheet and a send from another app differ only in which section
   * they land in.
   */
  const [queued, setQueued] = useState<QueuedRow | null>(null);

  /*
   * Text or a link shared into OneApp from another app's share sheet.
   *
   * The board is where a saved link belongs, so the shell routes a share with no
   * file here (see `lib/intake/types.ts`). It goes into a "Shared" section,
   * created on first use, through the same `dispatch` the cards and the prompt
   * use — so it lands in the transcript and can be undone like any other change.
   *
   * Gated on `ready`: dispatching before the stored board has been read applies
   * the add to an empty array and saves *that*, which loses the board.
   */
  const takeIntake = useIntakeStore((s) => s.take);
  const pendingText = useIntakeStore((s) => s.pending.some((i) => i.kind === "text"));
  const { dispatch } = actions;
  useEffect(() => {
    if (!ready || !pendingText) return;
    const item = takeIntake("text");
    if (!item) return;

    const raw = [item.title, item.text, item.url].filter(Boolean).join(" ").trim();
    if (!raw) return;
    const { label, url } = splitLink(raw);
    const row: QueuedRow = { type: "links", title: SHARED_TITLE, text: label, url };

    const existing = findSection(sections, row);
    if (existing) {
      dispatch({ kind: "addItem", id: existing.id, text: row.text, url: row.url });
      return;
    }
    dispatch({ kind: "add", type: row.type, title: row.title });
    setQueued(row);
  }, [dispatch, pendingText, ready, sections, takeIntake]);

  /*
   * Text sent here from another app — a recognised page, a voice transcript
   * (see `lib/sendto/types.ts`).
   *
   * It lands in a "Received" *note* section rather than the "Shared" links one:
   * a sent paragraph is prose, and filing it as a link with no URL would
   * render a row that looks broken. The same two-phase add as above, and the
   * same `dispatch`, so it shows in the transcript and undoes like anything
   * else the user did themselves — and the same wait for `ready`, since this
   * arrives the instant the app mounts and would otherwise always be early.
   */
  const takeSend = useSendToStore((s) => s.take);
  const sendWaiting = useSendToStore(hasSendTo("board"));
  useEffect(() => {
    if (!ready || !sendWaiting) return;
    const item = takeSend("board");
    if (!item) return;
    const row: QueuedRow = { type: "note", title: RECEIVED_TITLE, text: item.value, url: "" };

    const existing = findSection(sections, row);
    if (existing) {
      dispatch({ kind: "addItem", id: existing.id, text: row.text, url: row.url });
      return;
    }
    dispatch({ kind: "add", type: row.type, title: row.title });
    setQueued(row);
  }, [dispatch, ready, sendWaiting, sections, takeSend]);

  /*
   * A section a palette search hit named. The board already knows how to scroll
   * to and flash a card (that is how a typed command shows where it landed), so
   * this only has to hand the id over.
   */
  const takeFocus = useFocusStore((s) => s.take);
  const focusPending = useFocusStore((s) => s.app === "board");
  const setFocusSection = useBoardStore((s) => s.setFocus);
  useEffect(() => {
    if (!focusPending) return;
    const id = takeFocus("board");
    if (id) setFocusSection(id);
  }, [focusPending, setFocusSection, takeFocus]);

  // Second half of both arrivals above: drop the row in once its section exists.
  useEffect(() => {
    if (!queued) return;
    const section = findSection(sections, queued);
    if (!section) return;
    dispatch({ kind: "addItem", id: section.id, text: queued.text, url: queued.url });
    setQueued(null);
  }, [dispatch, queued, sections]);

  /**
   * A tapped example: run it, unless it's a stem ("rename ") that needs
   * finishing — those are handed to the composer instead of failing.
   */
  const pick = useCallback(
    (text: string) => {
      if (text.endsWith(" ")) setDraft(text);
      else runPrompt(text);
    },
    [setDraft, runPrompt],
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* The masthead scrolls away; only the composer below it is pinned. On a
          phone a sticky brand block *plus* a sticky composer would hold about a
          third of the viewport permanently, and the brand isn't what needs to
          stay reachable. */}
      <header className="px-[22px] pb-4 pt-[22px]">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<BoardIcon size={26} />}
            name="Board"
            tagline="your own page, built by prompting"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>

      </header>

      {/* Pinned on its own, so the app's primary control is reachable from any
          scroll position on any viewport. */}
      <div className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-2.5 pt-3">
        <PromptComposer actions={actions} />
      </div>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-8 pt-4">
        <div className="flex flex-col gap-4">
          {helpOpen && <HelpSheet onPick={pick} />}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <AddSectionBar actions={actions} />
            {sections.length > 0 && (
              <p className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
                {sections.length} section{sections.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {sections.length > 0 ? <BoardCanvas actions={actions} /> : <BoardEmpty onPick={pick} />}

          <PromptLog />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
