"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { describeHex } from "@/lib/ColorLens/detail";
import { CheckIcon } from "@/components/SketchNotes/atoms/icons";

interface SwatchProps {
  hex: string;
  /** Marked as the colour currently being reported on. */
  selected?: boolean;
  onSelect: (hex: string) => void;
  /** Extra detail for the accessible name, e.g. "24% of the image". */
  context?: string;
  /** Height of the colour block. */
  size?: "sm" | "md" | "lg";
  /** Caption rendered under the block. */
  children?: ReactNode;
  className?: string;
}

const BLOCK_HEIGHT = { sm: "h-9", md: "h-14", lg: "h-20" } as const;

/**
 * One colour, pickable. The block itself is painted with an inline style
 * because the colour *is* the data — it comes from the user's photo, not from
 * the theme — while every frame, ring and label around it uses theme tokens.
 *
 * The accessible name spells out the nearest colour name and the hex, so the
 * swatch is meaningful to a screen reader (and to anyone who can't distinguish
 * the two swatches beside it) rather than being an unlabelled colour chip.
 */
export function Swatch({
  hex,
  selected = false,
  onSelect,
  context,
  size = "md",
  children,
  className,
}: SwatchProps) {
  const detail = describeHex(hex);

  return (
    <button
      type="button"
      onClick={() => onSelect(hex)}
      aria-pressed={selected}
      aria-label={`${detail.name.name}, ${hex}${context ? `, ${context}` : ""}`}
      className={cx(
        "group block w-full rounded-xl border text-left transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        selected
          ? "border-accent ring-2 ring-accent"
          : "border-border hover:-translate-y-0.5 hover:border-accent",
        className,
      )}
    >
      <span
        className={cx(
          "grid w-full place-items-center rounded-t-[11px] transition-[height] duration-150",
          BLOCK_HEIGHT[size],
          !children && "rounded-b-[11px]",
        )}
        style={{ background: hex }}
      >
        {selected && (
          <span aria-hidden style={{ color: detail.bestText }}>
            <CheckIcon size={size === "sm" ? 14 : 18} />
          </span>
        )}
      </span>
      {children && <span className="block px-2 py-1.5">{children}</span>}
    </button>
  );
}
