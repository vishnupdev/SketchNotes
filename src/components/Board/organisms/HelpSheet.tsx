"use client";

import { SECTION_KINDS } from "@/lib/Board/catalog";
import { HELP_GRAMMAR } from "@/lib/Board/commands";
import { useBoardStore } from "@/store/useBoardStore";
import { CloseIcon } from "@/components/SketchNotes/atoms/icons";
import { SectionGlyph } from "@/components/Board/atoms/SectionGlyph";
import { PromptChip } from "@/components/Board/atoms/PromptChip";

interface HelpSheetProps {
  /** Put a phrase in the composer (or run it) — chips are live commands. */
  onPick: (text: string) => void;
}

/**
 * The grammar sheet: every phrasing the parser understands, grouped by what it
 * does, plus the five section types.
 *
 * A prompt-driven app has to publish its vocabulary — a deterministic parser
 * that quietly rejects unfamiliar wording is only usable if the wording it *does*
 * accept is written down. Every line here is a working command, tappable, so the
 * sheet doubles as the fastest way to drive the board.
 */
export function HelpSheet({ onPick }: HelpSheetProps) {
  const closeHelp = useBoardStore((s) => s.closeHelp);

  return (
    <section
      id="board-help"
      aria-labelledby="board-help-title"
      className="rounded-2xl border border-border bg-panel p-4 shadow-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="board-help-title" className="text-[15px] font-bold tracking-[.1px]">
            What you can say
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            Tap any line to run it. Nothing leaves your device — the wording is understood here in
            the browser.
          </p>
        </div>
        <button
          type="button"
          onClick={closeHelp}
          aria-label="Close the phrase list"
          className="tint hover-pop -mr-1 -mt-1 grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <h3 className="mt-4 font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
        Section types
      </h3>
      <ul role="list" className="mt-2 grid gap-1.5 min-[560px]:grid-cols-2">
        {SECTION_KINDS.map((kind) => (
          <li key={kind.type} className="flex items-center gap-2.5 rounded-xl border border-border bg-paper px-2.5 py-2">
            <SectionGlyph type={kind.type} tile />
            <span className="min-w-0">
              <span className="block text-[13px] font-bold">{kind.label}</span>
              <span className="block text-[11.5px] leading-snug text-ink-soft">{kind.blurb}</span>
            </span>
          </li>
        ))}
      </ul>

      {HELP_GRAMMAR.map((group) => (
        <div key={group.heading}>
          <h3 className="mt-4 font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
            {group.heading}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.lines.map((line) => (
              <PromptChip key={line} text={line} onPick={onPick} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
