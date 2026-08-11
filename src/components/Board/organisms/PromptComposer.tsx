"use client";

import { useRef } from "react";
import type { BoardActions } from "@/hooks/useBoard";
import { cx } from "@/lib/utils";
import { useBoardStore } from "@/store/useBoardStore";
import { HelpIcon, SendIcon, UndoIcon } from "@/components/SketchNotes/atoms/icons";

interface PromptComposerProps {
  actions: BoardActions;
}

/**
 * The composer — the app's primary control.
 *
 * It lives inside the sticky header rather than in the scrolling content, so the
 * one thing the app is *for* is reachable from any scroll position on any
 * viewport without a floating bar competing with the bottom nav.
 *
 * The status line under it is an `aria-live="polite"` region: after a command
 * the outcome is announced without moving focus, which is what lets someone stay
 * in the field and type the next instruction. It's rendered at a fixed minimum
 * height so a reply appearing never shifts the layout (rule #7).
 */
export function PromptComposer({ actions }: PromptComposerProps) {
  const draft = useBoardStore((s) => s.draft);
  const setDraft = useBoardStore((s) => s.setDraft);
  const toggleHelp = useBoardStore((s) => s.toggleHelp);
  const helpOpen = useBoardStore((s) => s.helpOpen);
  const last = useBoardStore((s) => s.log[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    actions.runPrompt(draft);
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="add a checklist for groceries"
            aria-label="Tell the board what to do"
            aria-describedby="board-status"
            autoComplete="off"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-full border border-border bg-panel py-2.5 pl-4 pr-11 text-[14px] placeholder:text-ink-soft focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Run this instruction"
            className="hover-glow absolute right-1 grid size-8 place-items-center rounded-full bg-accent text-on-accent disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <SendIcon size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={actions.undo}
          disabled={!actions.canUndo}
          title="Undo the last change"
          aria-label="Undo the last change"
          className="tint hover-pop grid size-9 flex-none place-items-center rounded-xl border border-border text-ink-soft hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <UndoIcon size={16} />
        </button>
        <button
          type="button"
          onClick={toggleHelp}
          aria-expanded={helpOpen}
          aria-controls="board-help"
          title="What can I say?"
          aria-label="What can I say?"
          className={cx(
            "tint hover-pop grid size-9 flex-none place-items-center rounded-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            helpOpen
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-ink-soft hover:border-accent hover:text-accent",
          )}
        >
          <HelpIcon size={16} />
        </button>
      </form>

      <p
        id="board-status"
        aria-live="polite"
        className={cx(
          "mt-1.5 min-h-[17px] px-1 text-[12px] leading-[17px]",
          last?.ok === false ? "text-danger" : "text-ink-soft",
        )}
      >
        {last?.message ?? "Say what you want in plain English — the ? button lists every phrasing."}
      </p>
    </div>
  );
}
