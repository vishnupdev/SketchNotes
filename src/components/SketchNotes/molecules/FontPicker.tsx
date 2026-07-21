"use client";

import { FONTS, FONT_KEYS } from "@/engine/constants";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

/** Font-family chooser for the text tool / selected text. */
export function FontPicker() {
  const fontKey = useEditorStore((s) => s.fontKey);
  const setFontKey = useEditorStore((s) => s.setFontKey);

  return (
    <div
      data-text-style
      className="grid max-h-[210px] w-[224px] grid-cols-3 gap-1.5 overflow-y-auto [scrollbar-width:thin]"
    >
      {FONT_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          aria-label={FONTS[k].label}
          aria-pressed={k === fontKey}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => setFontKey(k)}
          className={cx(
            "flex h-[48px] flex-col items-center justify-center rounded-xl leading-none",
            k === fontKey ? "bg-accent-soft text-accent" : "tint text-text",
          )}
        >
          <span className="text-[19px]" style={{ fontFamily: FONTS[k].stack }}>
            Aa
          </span>
          <span className="mt-1 text-[9px] text-ink-soft">{FONTS[k].label}</span>
        </button>
      ))}
    </div>
  );
}
