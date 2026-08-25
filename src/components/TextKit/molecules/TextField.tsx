"use client";

import { useState } from "react";
import { measure } from "@/lib/TextKit/transform";
import { cx, formatBytes } from "@/lib/utils";
import { CheckIcon, CopyIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The text box every Text Kit panel is built around: label, counts, copy, clear.
 *
 * One component rather than six, so the counts read the same everywhere and
 * "copy" behaves identically whether it is an input or a result — which is what
 * makes the app feel like one tool rather than six mini-sites.
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  readOnly = false,
  mono = true,
  counts = true,
  actions,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  /** Monospace by default: most of what goes in here is data, not prose. */
  mono?: boolean;
  counts?: boolean;
  /** Extra controls for the header row. */
  actions?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const stats = counts ? measure(value) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard refused — the field is selectable */
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          {actions}
          {value && (
            <button
              type="button"
              onClick={() => void copy()}
              aria-label={`Copy ${label}`}
              className="tint grid size-7 place-items-center rounded-lg text-ink-soft hover:text-accent"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
          )}
          {value && onChange && !readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label={`Clear ${label}`}
              className="tint grid size-7 place-items-center rounded-lg text-ink-soft hover:text-danger"
            >
              <TrashSmallIcon size={14} />
            </button>
          )}
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly || !onChange}
        rows={rows}
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        className={cx(
          "w-full resize-y rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[13px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25",
          mono && "font-mono text-[12.5px]",
          (readOnly || !onChange) && "bg-panel",
        )}
      />

      {stats && (
        <p className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
          {stats.characters} chars · {stats.words} words · {stats.lines} lines ·{" "}
          {formatBytes(stats.bytes)}
        </p>
      )}
    </div>
  );
}
