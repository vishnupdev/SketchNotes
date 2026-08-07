"use client";

import { CopyButton } from "@/components/ColorLens/atoms/CopyButton";

interface CodeRowProps {
  label: string;
  value: string;
  /** Longer explanation of what the notation is for. */
  hint?: string;
}

/**
 * One colour notation and its value, with a copy control. Rendered as a
 * definition pair so the label/value relationship survives in a screen reader's
 * list of the report.
 */
export function CodeRow({ label, value, hint }: CodeRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-paper px-3 py-2">
      <div className="min-w-0 flex-1">
        <dt className="font-mono text-[9.5px] uppercase tracking-[.16em] text-ink-soft">
          {label}
          {hint && <span className="sr-only"> — {hint}</span>}
        </dt>
        <dd className="truncate font-mono text-[13px] font-semibold text-text" title={value}>
          {value}
        </dd>
      </div>
      <CopyButton value={value} label={label} />
    </div>
  );
}
