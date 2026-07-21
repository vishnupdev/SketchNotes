"use client";

import { MAX_TEXT_SIZE, MIN_TEXT_SIZE, TEXT_SIZES } from "@/engine/constants";
import { clamp } from "@/engine/geometry";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

/** Text-size chooser: type a custom value, nudge, or pick a preset. */
export function TextSizePicker() {
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);

  const step = (delta: number) =>
    setFontSize(clamp(Math.round(fontSize + delta), MIN_TEXT_SIZE, MAX_TEXT_SIZE));

  return (
    <div data-text-style className="flex w-[224px] flex-col gap-1.5">
      {/* Custom size: type any value, or nudge with the steppers. */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Decrease size"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => step(-2)}
          disabled={fontSize <= MIN_TEXT_SIZE}
          className="tint grid size-[34px] flex-none place-items-center rounded-xl text-[18px] leading-none text-text disabled:opacity-30"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_TEXT_SIZE}
            max={MAX_TEXT_SIZE}
            value={fontSize}
            aria-label="Text size in pixels"
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n)) setFontSize(clamp(n, MIN_TEXT_SIZE, MAX_TEXT_SIZE));
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-[34px] w-full rounded-xl bg-accent-soft/40 pl-3 pr-8 text-[14px] font-semibold tabular-nums text-text outline-none focus:ring-2 focus:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-soft">
            px
          </span>
        </div>
        <button
          type="button"
          aria-label="Increase size"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => step(2)}
          disabled={fontSize >= MAX_TEXT_SIZE}
          className="tint grid size-[34px] flex-none place-items-center rounded-xl text-[18px] leading-none text-text disabled:opacity-30"
        >
          +
        </button>
      </div>

      {/* Quick presets. */}
      <div className="grid grid-cols-6 gap-1">
        {TEXT_SIZES.map((sz) => (
          <button
            key={sz}
            type="button"
            aria-label={`Size ${sz}`}
            aria-pressed={sz === fontSize}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setFontSize(sz)}
            className={cx(
              "grid h-[30px] place-items-center rounded-lg text-[12px] font-semibold tabular-nums",
              sz === fontSize ? "bg-accent-soft text-accent" : "tint text-text",
            )}
          >
            {sz}
          </button>
        ))}
      </div>
    </div>
  );
}
