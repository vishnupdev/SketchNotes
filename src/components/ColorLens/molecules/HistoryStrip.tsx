"use client";

import { cx } from "@/lib/utils";
import { describeHex } from "@/lib/ColorLens/detail";
import { TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import type { PickRecord } from "@/lib/ColorLens/types";

interface HistoryStripProps {
  history: PickRecord[];
  selectedHex: string | null;
  onSelect: (hex: string) => void;
  onClear: () => void;
}

/**
 * Recent picks, newest first — kept on this device so colours read from one
 * photo are still to hand after loading the next one.
 */
export function HistoryStrip({ history, selectedHex, onSelect, onClear }: HistoryStripProps) {
  if (history.length === 0) return null;

  return (
    <section
      aria-labelledby="colorlens-history"
      className="rounded-2xl border border-border bg-panel p-4 shadow-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="colorlens-history" className="text-[15px] font-bold tracking-[.1px]">
          Recent picks
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <TrashSmallIcon size={13} />
          Clear
        </button>
      </div>

      <ul role="list" className="scroll-slim mt-3 flex gap-2 overflow-x-auto pb-1">
        {history.map((record) => {
          const detail = describeHex(record.hex);
          const active = record.hex === selectedHex;
          return (
            <li key={record.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(record.hex)}
                aria-pressed={active}
                aria-label={`${detail.name.name}, ${record.hex}`}
                title={`${record.hex} · ${detail.name.name}`}
                className={cx(
                  "size-11 rounded-xl border transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-accent ring-2 ring-accent"
                    : "border-border hover:-translate-y-0.5 hover:border-accent",
                )}
                style={{ background: record.hex }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
