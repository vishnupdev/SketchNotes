"use client";

import { useState } from "react";
import { EMOJI, EMOJI_CATS } from "@/lib/emoji";
import { cx } from "@/lib/utils";

/**
 * Tabbed emoji palette — presentation only, so anything in the workspace can
 * use it: the sketch sticker tool arms the stamp with it, Settings turns the
 * chosen glyph into a mouse pointer.
 */
export function EmojiGrid({
  onPick,
  label = "Emoji",
  className,
}: {
  /** Called with the chosen glyph. */
  onPick: (emoji: string) => void;
  /** Accessible name for the grid, since the tabs alone don't describe it. */
  label?: string;
  className?: string;
}) {
  const [cat, setCat] = useState(EMOJI_CATS[0]);

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={`${label} categories`}
        className="scrollbar-none mb-2 flex gap-0.75 overflow-x-auto pb-0.5"
      >
        {EMOJI_CATS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === cat}
            aria-label={`Category ${c}`}
            onClick={() => setCat(c)}
            className={cx(
              "flex-none rounded-[9px] px-2 py-1.5 text-[17px] leading-none",
              c === cat ? "bg-accent-soft" : "tint",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label={label}
        className="scroll-slim grid max-h-[min(46vh,260px)] grid-cols-7 gap-0.5 overflow-y-auto"
      >
        {EMOJI[cat].map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            aria-label={e}
            onClick={() => onPick(e)}
            className="tint grid aspect-square place-items-center rounded-lg text-[22px] leading-none"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
