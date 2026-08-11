"use client";

import type { BoardActions } from "@/hooks/useBoard";
import { SECTION_KINDS } from "@/lib/Board/catalog";
import { SectionGlyph } from "@/components/Board/atoms/SectionGlyph";

interface AddSectionBarProps {
  actions: BoardActions;
}

/**
 * One button per section type — the direct way to add a card.
 *
 * The prompt is the app's headline interaction, not a gate in front of it. This
 * bar means the board is fully usable without composing a sentence, which matters
 * for speed (five taps to a five-card board) and for anyone using a screen reader
 * or switch input, where a free-text field is the slowest control on the page.
 */
export function AddSectionBar({ actions }: AddSectionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        id="add-section-label"
        className="mr-0.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft"
      >
        Add
      </span>
      <div role="group" aria-labelledby="add-section-label" className="flex flex-wrap gap-1.5">
        {SECTION_KINDS.map((kind) => (
          <button
            key={kind.type}
            type="button"
            onClick={() =>
              actions.dispatch({ kind: "add", type: kind.type, title: kind.defaultTitle })
            }
            title={kind.blurb}
            className="tint hover-pop flex items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <SectionGlyph type={kind.type} size={14} />
            {kind.label}
          </button>
        ))}
      </div>
    </div>
  );
}
