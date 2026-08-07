"use client";

import { Swatch } from "@/components/ColorLens/atoms/Swatch";
import type { PaletteEntry } from "@/lib/ColorLens/types";

interface PaletteGridProps {
  palette: PaletteEntry[];
  selectedHex: string | null;
  onSelect: (hex: string) => void;
}

/** Dominant colours of the image, most-used first, each with its share. */
export function PaletteGrid({ palette, selectedHex, onSelect }: PaletteGridProps) {
  return (
    <ul
      role="list"
      className="grid grid-cols-2 gap-2.5 min-[440px]:grid-cols-3 lg:grid-cols-4"
    >
      {palette.map((entry, i) => {
        const percent = Math.round(entry.share * 1000) / 10;
        return (
          <li key={`${entry.hex}-${i}`}>
            <Swatch
              hex={entry.hex}
              onSelect={onSelect}
              selected={entry.hex === selectedHex}
              context={`${percent}% of the image`}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold uppercase text-text">
                  {entry.hex}
                </span>
                <span className="font-mono text-[10px] text-ink-soft">{percent}%</span>
              </span>
            </Swatch>
          </li>
        );
      })}
    </ul>
  );
}
