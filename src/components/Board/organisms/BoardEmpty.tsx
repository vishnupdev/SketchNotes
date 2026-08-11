"use client";

import { STARTER_PROMPTS } from "@/lib/Board/catalog";
import { BoardIcon } from "@/components/SketchNotes/atoms/icons";
import { PromptChip } from "@/components/Board/atoms/PromptChip";

interface BoardEmptyProps {
  onPick: (text: string) => void;
}

/**
 * The first thing a new visitor sees. It teaches the one thing worth knowing —
 * that you describe what you want — with prompts that actually run, rather than
 * seeding a demo board the user then has to clear out.
 */
export function BoardEmpty({ onPick }: BoardEmptyProps) {
  return (
    <section
      aria-labelledby="board-empty-title"
      className="rounded-2xl border border-dashed border-border bg-panel px-5 py-8 text-center"
    >
      <span
        aria-hidden
        className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"
      >
        <BoardIcon size={24} />
      </span>
      <h2 id="board-empty-title" className="mt-3 text-[17px] font-bold tracking-[.1px]">
        Your board is empty
      </h2>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-ink-soft">
        Describe a section and it appears. You can rename, resize, reorder and remove any of them the
        same way — or with the controls on each card.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {STARTER_PROMPTS.map((prompt) => (
          <PromptChip key={prompt} text={prompt} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}
