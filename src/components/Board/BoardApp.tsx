"use client";

import { useCallback } from "react";
import { useBoardActions } from "@/hooks/useBoard";
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
