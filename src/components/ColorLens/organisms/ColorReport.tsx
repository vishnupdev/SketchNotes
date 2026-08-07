"use client";

import { useEffect, useId, useState } from "react";
import { describeHex } from "@/lib/ColorLens/detail";
import { isHex } from "@/lib/ColorLens/convert";
import { ColorHero } from "@/components/ColorLens/molecules/ColorHero";
import { CodeGrid } from "@/components/ColorLens/molecules/CodeGrid";
import { ContrastPanel } from "@/components/ColorLens/molecules/ContrastPanel";
import { HarmonyList } from "@/components/ColorLens/molecules/HarmonyList";

interface ColorReportProps {
  hex: string;
  onSelect: (hex: string) => void;
}

/** Normalise typed input to `#rrggbb`, or null when it isn't a colour yet. */
function parseTyped(value: string): string | null {
  if (!isHex(value)) return null;
  const body = value.trim().replace(/^#/, "").toLowerCase();
  const full = body.length === 3 ? body.replace(/./g, (c) => c + c) : body;
  return `#${full}`;
}

/**
 * The full report for one colour. Also accepts a hex typed by hand, so the app
 * is useful for a colour someone already has — not only one read off a photo.
 */
export function ColorReport({ hex, onSelect }: ColorReportProps) {
  const inputId = useId();
  const [typed, setTyped] = useState(hex);

  // The field mirrors whatever is currently picked, so tapping the image (or a
  // swatch) leaves it showing that colour, ready to edit from.
  useEffect(() => setTyped(hex), [hex]);

  const detail = describeHex(hex);
  const typedValid = parseTyped(typed);

  return (
    <div className="flex flex-col gap-4">
      <ColorHero detail={detail} />

      <div className="flex items-end gap-2 rounded-2xl border border-border bg-panel px-4 py-3 shadow-panel">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Or enter a colour
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typedValid) onSelect(typedValid);
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="#3a86ff"
            aria-invalid={typed.length > 0 && !typedValid}
            aria-describedby={`${inputId}-hint`}
            className="w-full rounded-[9px] border-[1.5px] border-border bg-paper px-2.5 py-2 font-mono text-[14px] uppercase text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <button
          type="button"
          onClick={() => typedValid && onSelect(typedValid)}
          disabled={!typedValid}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          Read
        </button>
      </div>
      <p id={`${inputId}-hint`} className="sr-only">
        Enter a three or six digit hex colour, with or without the leading hash.
      </p>

      <CodeGrid detail={detail} />
      <ContrastPanel detail={detail} />
      <HarmonyList hex={hex} onSelect={onSelect} />
    </div>
  );
}
