"use client";

import { useMemo, useState } from "react";
import { useTextKitStore } from "@/store/useTextKitStore";
import { collapseUnchanged, diffLines } from "@/lib/TextKit/diff";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { cx } from "@/lib/utils";
import { SwapIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Comparing two versions of something.
 *
 * Shown as one unified list rather than two columns: on a phone two columns of
 * code are unreadable, and the thing being looked for is *which lines changed*,
 * which a single ordered list answers better anyway.
 */
export function DiffPanel() {
  const text = useTextKitStore((s) => s.text);
  const compare = useTextKitStore((s) => s.compare);
  const setText = useTextKitStore((s) => s.setText);
  const setCompare = useTextKitStore((s) => s.setCompare);
  const swap = useTextKitStore((s) => s.swap);
  const [onlyChanges, setOnlyChanges] = useState(true);

  const result = useMemo(() => diffLines(text, compare), [text, compare]);
  const rows = useMemo(
    () => (onlyChanges ? collapseUnchanged(result.rows) : result.rows),
    [onlyChanges, result.rows],
  );

  const identical = result.added === 0 && result.removed === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 min-[720px]:flex-row">
        <TextField label="Original" value={text} onChange={setText} rows={8} counts={false} />
        <TextField label="Changed" value={compare} onChange={setCompare} rows={8} counts={false} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={swap} className={BTN}>
          <SwapIcon size={15} />
          Swap sides
        </button>
        <label className="flex items-center gap-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={onlyChanges}
            onChange={(e) => setOnlyChanges(e.target.checked)}
            className="size-4 accent-accent"
          />
          Only changed lines
        </label>
        <span className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft">
          +{result.added} −{result.removed}
        </span>
      </div>

      {result.truncated && (
        <p className="text-[12px] leading-relaxed text-ink-soft">
          These are large enough that a full line-by-line comparison would freeze the tab, so this
          shows the block that differs rather than every matched line.
        </p>
      )}

      {text === "" && compare === "" ? (
        <p className="text-[12.5px] text-ink-soft">
          Paste two versions of something above — a config, a list, a paragraph — and the
          differences appear here. Nothing is uploaded.
        </p>
      ) : identical ? (
        <p className="text-[12.5px] text-accent">The two sides are identical.</p>
      ) : (
        <ol className="scroll-slim max-h-[26rem] overflow-auto rounded-xl border border-border bg-panel font-mono text-[12px]">
          {rows.map((row, i) => (
            <li
              key={`${row.kind}-${row.left ?? "x"}-${row.right ?? "x"}-${i}`}
              className={cx(
                "flex gap-2 border-l-2 px-2 py-0.5",
                row.kind === "added" && "border-l-success bg-success/10",
                row.kind === "removed" && "border-l-danger bg-danger/10",
                row.kind === "same" && "border-l-transparent text-ink-soft",
              )}
            >
              <span aria-hidden className="w-8 shrink-0 text-right tabular-nums text-ink-soft">
                {row.left ?? ""}
              </span>
              <span aria-hidden className="w-8 shrink-0 text-right tabular-nums text-ink-soft">
                {row.right ?? ""}
              </span>
              <span aria-hidden className="w-3 shrink-0">
                {row.kind === "added" ? "+" : row.kind === "removed" ? "−" : " "}
              </span>
              {/* The prefix characters are decorative; the row's meaning is
                  announced here so a screen reader hears it once, not twice. */}
              <span className="min-w-0 whitespace-pre-wrap wrap-anywhere">
                <span className="sr-only">
                  {row.kind === "added"
                    ? "Added: "
                    : row.kind === "removed"
                      ? "Removed: "
                      : "Unchanged: "}
                </span>
                {row.text || " "}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
