"use client";

import { useCallback, useEffect, useState } from "react";
import { useBoardActions } from "@/hooks/useBoard";
import { splitLink } from "@/lib/Board/board-api";
import { useIntakeStore } from "@/store/useIntakeStore";
import { useFocusStore } from "@/store/useFocusStore";
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
  const { sections, runPrompt } = actions;
  const [queuedShare, setQueuedShare] = useState<{ text: string; url: string } | null>(null);

  /*
   * Text or a link shared into OneApp from another app's share sheet.
   *
   * The board is where a saved link belongs, so the shell routes a share with no
   * file here (see `lib/intake/types.ts`). It goes into a "Shared" section,
   * created on first use, through the same `dispatch` the cards and the prompt
   * use — so it lands in the transcript and can be undone like any other change.
   */
  const takeIntake = useIntakeStore((s) => s.take);
  const pendingText = useIntakeStore((s) => s.pending.some((i) => i.kind === "text"));
  const { dispatch } = actions;
  useEffect(() => {
    if (!pendingText) return;
    const item = takeIntake("text");
    if (!item) return;

    const raw = [item.title, item.text, item.url].filter(Boolean).join(" ").trim();
    if (!raw) return;
    const { label, url } = splitLink(raw);

    const existing = sections.find(
      (s) => s.type === "links" && s.title.toLowerCase() === SHARED_TITLE.toLowerCase(),
    );
    if (existing) {
      dispatch({ kind: "addItem", id: existing.id, text: label, url });
      return;
    }
    // A fresh section has no id until the board has it, so the row is added on
    // the next pass — `sections` changes, this effect is not re-entered (the
    // arrival is already taken), so the add is queued explicitly.
    dispatch({ kind: "add", type: "links", title: SHARED_TITLE });
    setQueuedShare({ text: label, url });
  }, [dispatch, pendingText, sections, takeIntake]);

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

  // Second half of the above: drop the shared row into the section once it exists.
  useEffect(() => {
    if (!queuedShare) return;
    const section = sections.find(
      (s) => s.type === "links" && s.title.toLowerCase() === SHARED_TITLE.toLowerCase(),
    );
    if (!section) return;
    dispatch({ kind: "addItem", id: section.id, text: queuedShare.text, url: queuedShare.url });
    setQueuedShare(null);
  }, [dispatch, queuedShare, sections]);

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
