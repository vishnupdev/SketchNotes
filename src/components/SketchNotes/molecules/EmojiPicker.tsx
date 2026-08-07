"use client";

import { EmojiGrid } from "@/components/SketchNotes/molecules/EmojiGrid";
import { useEditorStore } from "@/store/useEditorStore";

/** Tabbed emoji/sticker picker. Choosing one arms the emoji stamp tool. */
export function EmojiPicker() {
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
      <EmojiGrid onPick={choose} label="Stickers" />
      <div className="px-1 pt-1.5 text-center text-[11px] text-ink-soft">
        Tap a sticker, then tap the canvas to place it.
      </div>
    </div>
  );
}
