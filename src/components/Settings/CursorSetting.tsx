"use client";

import type { ReactNode } from "react";
import {
  CURSORS,
  CURSOR_INKS,
  CURSOR_SCALES,
  CUSTOM_CURSOR_ID,
  cursorCss,
  cursorImage,
  cursorInk,
  cursorPx,
  customCursorPx,
} from "@/lib/cursors";
import { useCursor, useCursorColors } from "@/hooks/useCursor";
import { cx } from "@/lib/utils";
import { CheckIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";
import { CustomCursorPicker } from "@/components/Settings/CustomCursorPicker";

/** A labelled row of mutually-exclusive choices. */
function Choices({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[12.5px] font-semibold">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {children}
      </div>
      {hint && <span className="text-[11.5px] text-ink-soft">{hint}</span>}
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-accent bg-accent text-on-accent"
          : "border-border text-ink-soft hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Settings → Pointer. Thirteen drawn presets plus a bring-your-own slot, with
 * size and colour on top — so the same shape can be a discreet grey dot or a
 * huge magenta arrow.
 *
 * Each tile paints the *actual* bitmap it selects, built from the live theme
 * tokens, and sets that bitmap as its own cursor — so hovering a tile previews
 * the pointer before you commit to it.
 */
export function CursorSetting() {
  const { settings, update } = useCursor();
  const colors = useCursorColors();
  const ink = colors && cursorInk(settings, colors);
  const custom = settings.custom;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Mouse pointer"
        className="grid grid-cols-3 gap-2 min-[440px]:grid-cols-4"
      >
        {CURSORS.map((c) => {
          const active = c.id === settings.id;
          const isCustom = c.id === CUSTOM_CURSOR_ID;
          const px = isCustom ? customCursorPx(settings.scale) : cursorPx(c, settings.scale);
          const paint = ink && colors ? { ink: ink.arrow, paper: colors.paper, px } : null;

          // Presets paint themselves; the custom tile shows the stored bitmap.
          const preview = isCustom
            ? custom && `url("${custom.src}")`
            : paint && cursorImage(c, paint);
          const hoverCursor = isCustom ? undefined : paint && cursorCss(c, paint, "arrow");

          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={active}
              aria-label={`${c.label} — ${c.hint}`}
              // The custom slot can't be selected until there's an image in it;
              // pressing it then jumps to the picker that fills it.
              aria-disabled={isCustom && !custom}
              onClick={() => {
                if (isCustom && !custom) {
                  document.getElementById("custom-cursor-picker")?.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                  });
                  return;
                }
                update({ id: c.id });
              }}
              style={hoverCursor ? { cursor: hoverCursor } : undefined}
              className={cx(
                "relative flex flex-col items-center gap-1.5 rounded-xl border bg-paper p-2 transition-all",
                active
                  ? "border-accent ring-2 ring-accent"
                  : "border-border hover:-translate-y-0.5 hover:shadow-panel",
                isCustom && !custom && "opacity-70",
              )}
            >
              <span
                aria-hidden="true"
                className="grid h-9 w-full place-items-center rounded-lg bg-grid/40"
                style={
                  preview
                    ? {
                        backgroundImage: preview,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        // Cap the preview so Huge doesn't burst out of the tile.
                        backgroundSize: `${Math.min(px, 34)}px`,
                      }
                    : undefined
                }
              >
                {isCustom && !custom && <PlusIcon size={16} className="text-ink-soft" />}
                {c.id === "system" && (
                  <span className="text-[11px] font-semibold text-ink-soft">Default</span>
                )}
              </span>
              <span className="flex w-full items-center justify-center gap-1">
                <span className="truncate text-[11.5px] font-bold text-text">{c.label}</span>
                {active && (
                  <span className="grid size-3.5 flex-none place-items-center rounded-full bg-accent text-on-accent">
                    <CheckIcon size={9} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Choices label="Size">
        {CURSOR_SCALES.map((s) => (
          <Chip
            key={s.id}
            active={s.id === settings.scale}
            disabled={settings.id === "system"}
            onClick={() => update({ scale: s.id })}
          >
            {s.label}
          </Chip>
        ))}
      </Choices>

      <Choices
        label="Colour"
        hint={settings.id === CUSTOM_CURSOR_ID ? "Your own image keeps its own colours." : undefined}
      >
        {CURSOR_INKS.map((i) => (
          <Chip
            key={i.id}
            active={i.id === settings.ink}
            disabled={settings.id === "system" || settings.id === CUSTOM_CURSOR_ID}
            onClick={() => update({ ink: i.id })}
          >
            {i.label}
          </Chip>
        ))}
        {settings.ink === "custom" && (
          <input
            type="color"
            aria-label="Pointer colour"
            value={settings.color}
            disabled={settings.id === "system" || settings.id === CUSTOM_CURSOR_ID}
            onChange={(e) => update({ color: e.target.value })}
            className="h-7.5 w-11 cursor-pointer rounded-full border border-border bg-panel p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          />
        )}
      </Choices>

      <div id="custom-cursor-picker" className="border-t border-border pt-3.5">
        <h4 className="mb-2 text-[12.5px] font-semibold">Your own pointer</h4>
        <CustomCursorPicker settings={settings} update={update} />
      </div>
    </div>
  );
}
