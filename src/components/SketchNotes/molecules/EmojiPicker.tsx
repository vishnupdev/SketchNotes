"use client";

import { useState } from "react";
import { EMOJI, EMOJI_CATS } from "@/lib/emoji";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

/** Tabbed emoji/sticker picker. Choosing one arms the emoji stamp tool. */
export function EmojiPicker() {
  const [cat, setCat] = useState(EMOJI_CATS[0]);
  const setTool = useEditorStore((s) => s.setTool);
  const setCurrentEmoji = useEditorStore((s) => s.setCurrentEmoji);
  const showToast = useEditorStore((s) => s.showToast);
  const closePopovers = useEditorStore((s) => s.closePopovers);

  const choose = (ch: string) => {
    setCurrentEmoji(ch);
    setTool("emoji");
    closePopovers();
    showToast(`Tap the canvas to place ${ch}`);
  };

  return (
    <div className="max-w-[min(92vw,300px)]">
      <div className="mb-2 flex gap-[3px] overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {EMOJI_CATS.map((c) => (
          <button
            key={c}
            type="button"
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
      <div className="grid max-h-[min(46vh,260px)] grid-cols-7 gap-0.5 overflow-y-auto">
        {EMOJI[cat].map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            onClick={() => choose(e)}
            className="tint grid aspect-square place-items-center rounded-lg text-[22px] leading-none"
          >
            {e}
          </button>
        ))}
      </div>
      <div className="px-1 pt-1.5 text-center text-[11px] text-ink-soft">
        Tap a sticker, then tap the canvas to place it.
      </div>
    </div>
  );
}
