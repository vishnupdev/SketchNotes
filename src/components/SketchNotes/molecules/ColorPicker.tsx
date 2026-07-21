"use client";

import { useState } from "react";
import { COLORS, mapColor } from "@/engine/constants";
import { cx, randColor } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { DiceIcon } from "@/components/SketchNotes/atoms/icons";

/** Palette grid + custom picker + random, matching the original colour popover. */
export function ColorPicker() {
  const color = useEditorStore((s) => s.color);
  const dark = useEditorStore((s) => s.dark);
  const setColor = useEditorStore((s) => s.setColor);
  const closePopovers = useEditorStore((s) => s.closePopovers);

  const isPreset = COLORS.includes(color);
  const [custom, setCustom] = useState(!isPreset && color !== "auto" ? color : "#2d7ff0");

  const pick = (c: string) => {
    setColor(c);
    closePopovers();
  };

  return (
    <div className="max-w-[min(92vw,272px)]">
      <div className="grid grid-cols-8 gap-[5px]">
        {COLORS.map((c) => {
          const isAuto = c === "auto";
          const bg = mapColor(c, dark);
          const label = isAuto ? "Default (auto)" : c;
          return (
            <button
              key={c}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => pick(c)}
              className={cx(
                "tint grid size-[29px] place-items-center rounded-[9px] p-0",
                color === c && "outline-[2.5px] outline-offset-1 outline-accent",
              )}
            >
              {isAuto ? (
                <span
                  className="grid size-[23px] place-items-center rounded-full text-[11px] font-extrabold text-white shadow-[0_0_0_1px_rgba(31,42,51,.16)] dark:text-[#141a21]"
                  style={{ background: bg }}
                >
                  A
                </span>
              ) : (
                <span
                  className="size-[23px] rounded-full shadow-[0_0_0_1px_rgba(31,42,51,.16)]"
                  style={{ background: bg }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
        <label className="relative flex flex-1 cursor-pointer items-center gap-2 rounded-[10px] bg-black/5 px-[9px] py-[7px] hover:bg-black/10 dark:bg-white/[.08] dark:hover:bg-white/[.14]">
          <span
            className="size-[22px] flex-none rounded-full shadow-[0_0_0_1px_rgba(31,42,51,.2)]"
            style={{ background: custom }}
          />
          <span className="text-[12.5px] font-semibold">Custom</span>
          <input
            type="color"
            aria-label="Custom color picker"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setColor(e.target.value);
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <button
          type="button"
          title="Random color"
          aria-label="Pick a random color"
          onClick={() => {
            const c = randColor();
            setCustom(c);
            setColor(c);
          }}
          className="flex items-center gap-1.5 rounded-[10px] bg-accent-soft px-[11px] py-[7px] text-[12.5px] font-semibold text-accent hover:brightness-105"
        >
          <DiceIcon size={18} />
          Random
        </button>
      </div>
    </div>
  );
}
