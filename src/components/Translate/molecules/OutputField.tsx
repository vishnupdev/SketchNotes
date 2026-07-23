"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, GlobeIcon } from "@/components/SketchNotes/atoms/icons";
import type { TranslateEngine } from "@/lib/Translate/types";
import { cx } from "@/lib/utils";

interface OutputFieldProps {
  text: string;
  isLoading: boolean;
  error: string | null;
  engine?: TranslateEngine;
  /** Accessible name for the region (the target language). */
  label: string;
  /** True once the user has typed something (drives the empty vs idle copy). */
  hasInput: boolean;
}

/** Small "On-device" glyph — a chip outline, contrasting the online globe. */
const DeviceGlyph = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
  </svg>
);

/**
 * The translated-text panel: shows the result with a copy button and a badge
 * saying which engine produced it (on-device vs online), plus loading and error
 * states. Result text uses `aria-live` so assistive tech announces updates.
 */
export function OutputField({ text, isLoading, error, engine, label, hasInput }: OutputFieldProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  return (
    <div className="relative flex min-h-[180px] flex-col rounded-2xl border border-border bg-accent-soft/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        {engine && text ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
            {engine === "offline" ? DeviceGlyph : <GlobeIcon size={13} />}
            {engine === "offline" ? "On-device" : "Online"}
          </span>
        ) : (
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
            Translation
          </span>
        )}
        {text && !isLoading && (
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy translation"}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <div
        aria-live="polite"
        aria-label={`Translation (${label})`}
        className="flex-1 whitespace-pre-wrap text-[16px] leading-relaxed text-text"
      >
        {error ? (
          <p className="text-[14px] text-danger">{error}</p>
        ) : isLoading ? (
          <span className="inline-flex items-center gap-2 text-ink-soft">
            <span
              className={cx(
                "size-4 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none",
              )}
            />
            Translating…
          </span>
        ) : text ? (
          text
        ) : (
          <span className="text-ink-soft">
            {hasInput ? "Waiting for text…" : "Translation will appear here."}
          </span>
        )}
      </div>
    </div>
  );
}
