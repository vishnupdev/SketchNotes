"use client";

import { useState } from "react";
import { readPayload } from "@/lib/qr/payload";
import { QR_KIND_LABEL } from "@/lib/qr/types";
import { CheckIcon, CloseIcon, CopyIcon, ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * What a scanned code turned out to be.
 *
 * Two rules here, both about the code being untrusted input — anyone can print
 * a QR sticker and put it over another one:
 *
 *  - the destination is always shown in full as text, so a link can be read
 *    before it is followed;
 *  - only `http(s)`, `mailto:` and `tel:` are ever clickable, and the link
 *    carries `rel="noopener noreferrer"`.
 */
export function ScanResult({ text, onClear }: { text: string; onClear: () => void }) {
  const reading = readPayload(text);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the text is on screen and selectable anyway */
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
            {QR_KIND_LABEL[reading.kind]}
          </p>
          <p className="mt-0.5 text-[14px] font-bold leading-snug">{reading.label}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Dismiss this result"
          className="tint -mr-1 -mt-1 grid size-8 flex-none place-items-center rounded-[10px] text-ink-soft hover:text-text"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <dl className="flex flex-col gap-1.5">
        {reading.fields.map((field) => (
          <div key={field.name} className="flex flex-wrap gap-x-2 text-[12.5px]">
            <dt className="font-semibold text-ink-soft">{field.name}</dt>
            <dd className="min-w-0 flex-1 wrap-break-word">{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        {reading.action && (
          <a
            href={reading.action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ExternalLinkIcon size={15} />
            {reading.action.label}
          </a>
        )}
        <button type="button" onClick={() => void copy()} className={BTN}>
          {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
