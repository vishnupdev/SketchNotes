"use client";

import { cx } from "@/lib/utils";
import { spoken } from "@/lib/Morse/alphabet";
import { SignalPattern } from "@/components/Morse/atoms/SignalPattern";

interface CharTileProps {
  char: string;
  code: string;
  selected: boolean;
  /** True while this tile's signal is being sent. */
  playing: boolean;
  /** 0–1 practice accuracy, or null if never drilled. */
  mastery: number | null;
  onSelect: () => void;
}

/**
 * One character in the reference chart: the letter, its pattern drawn to scale,
 * and a mastery bar earned in Practice. Tapping it plays the signal and opens
 * the detail card, so the chart is the primary way to explore the code.
 */
export function CharTile({ char, code, selected, playing, mastery, onSelect }: CharTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${char}, ${spoken(code)}`}
      className={cx(
        "hover-lift group relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border px-1 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected || playing
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-panel text-text hover:border-accent",
      )}
    >
      <span aria-hidden className="font-mono text-[17px] font-bold leading-none">
        {char}
      </span>
      <SignalPattern code={code} size="sm" className="opacity-80" />
      {mastery !== null && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-border">
          <span
            className={cx("block h-full", mastery >= 0.8 ? "bg-success" : mastery >= 0.5 ? "bg-prio-med" : "bg-prio-high")}
            style={{ width: `${Math.round(mastery * 100)}%` }}
          />
        </span>
      )}
    </button>
  );
}
