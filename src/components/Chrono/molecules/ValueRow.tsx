"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * A labelled read-only value with a copy button.
 *
 * Every one of Chrono's answers is something you are about to paste somewhere
 * else — into a config file, a query, a message — so copy is the primary action
 * on every row rather than a feature of some of them. Keeping it in one component
 * is what makes the whole app copyable without thirty copies of the same handler.
 */
export function ValueRow({
  label,
  value,
  note,
  mono = true,
}: {
  label: string;
  value: string;
  note?: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard refused — the value is selectable */
    }
  };

  return (
    <div className="flex items-start gap-2 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">{label}</div>
        <div
          className={
            mono
              ? "mt-0.5 break-all font-mono text-[12.5px] text-text"
              : "mt-0.5 text-[13.5px] font-semibold text-text"
          }
        >
          {value}
        </div>
        {note && <div className="mt-0.5 text-[11.5px] text-ink-soft">{note}</div>}
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy ${label}`}
        className="tint mt-3 grid size-7 flex-none place-items-center rounded-lg text-ink-soft hover:text-accent"
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      </button>
    </div>
  );
}
