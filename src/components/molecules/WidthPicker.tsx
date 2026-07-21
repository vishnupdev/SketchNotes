"use client";

import { WIDTHS } from "@/engine/constants";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

/** Stroke-width chooser (three presets shared with text sizes). */
export function WidthPicker() {
  const widthIdx = useEditorStore((s) => s.widthIdx);
  const setWidthIdx = useEditorStore((s) => s.setWidthIdx);
  const closePopovers = useEditorStore((s) => s.closePopovers);

  return (
    <div className="flex gap-1.5">
      {WIDTHS.map((w, i) => (
        <button
          key={w}
          type="button"
          aria-label={`Width ${w}`}
          onClick={() => {
            setWidthIdx(i);
            closePopovers();
          }}
          className={cx(
            "grid h-[46px] w-[52px] place-items-center rounded-xl",
            i === widthIdx ? "bg-accent-soft text-accent" : "tint text-text",
          )}
        >
          <i
            className="block w-[26px] rounded-full bg-current"
            style={{ height: `${w}px` }}
          />
        </button>
      ))}
    </div>
  );
}
