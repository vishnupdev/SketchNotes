"use client";

import { useMemo } from "react";
import { countByLabel, summarise, type Detection } from "@/lib/Detect/detections";
import { countPhrase } from "@/lib/Detect/labels";

interface DetectionListProps {
  detections: readonly Detection[];
  /**
   * Announce changes to assistive tech. On for the live view, where the canvas
   * is the only other output; off for a still, where the reader can simply read
   * the list.
   */
  announce?: boolean;
  /** Shown in place of the list when nothing was found. */
  emptyNote: string;
}

/**
 * What was found, as words.
 *
 * Not a caption under the picture — the *other half* of it. The overlay is a
 * canvas, which is to say invisible to a screen reader and to anything else
 * parsing the page, so this list is the app's actual output and the boxes are
 * the illustration. Writing it that way round is also what keeps the live view
 * usable when the phone is held at arm's length and the labels on the frame are
 * too small to read.
 */
export function DetectionList({ detections, announce = false, emptyNote }: DetectionListProps) {
  const rows = useMemo(() => {
    const counts = countByLabel(detections);
    const best = new Map<string, number>();
    for (const d of detections) best.set(d.label, Math.max(best.get(d.label) ?? 0, d.score));
    return [...counts]
      .map(([label, count]) => ({ label, count, best: best.get(label) ?? 0 }))
      .sort((a, b) => b.count - a.count || b.best - a.best || a.label.localeCompare(b.label));
  }, [detections]);

  const sentence = useMemo(() => summarise(detections), [detections]);

  return (
    <div className="flex flex-col gap-2">
      {/* The announcement. Visually hidden because the list below says the same
          thing in a form a sighted reader can scan; `polite` so it waits for a
          gap rather than interrupting, and it only changes when the set of
          labels does — the caller throttles it, not this component. */}
      {announce && (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {sentence}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-[12px] border border-border bg-panel px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          {emptyNote}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-3 rounded-[12px] border border-border bg-panel px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                {countPhrase(row.label, row.count)}
              </span>

              {/* The confidence, as a bar and as a number. The bar is the quick
                  read; the number is what someone deciding whether to believe
                  it actually needs. */}
              <span
                aria-hidden="true"
                className="h-1.5 w-16 flex-none overflow-hidden rounded-full bg-border"
              >
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.round(row.best * 100)}%` }}
                />
              </span>
              <span className="flex-none font-mono text-[11.5px] tabular-nums text-ink-soft">
                {Math.round(row.best * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
