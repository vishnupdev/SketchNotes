"use client";

import { useState } from "react";
import { downloadText, copyText } from "@/lib/export-text";
import { FORMAT_LABEL, FORMAT_MIME, exportFilename, type ExportFormat } from "@/lib/Specs/export";
import { CheckIcon, CopyIcon, DownloadIcon, ScanDocIcon } from "@/components/SketchNotes/atoms/icons";

const FORMATS: ExportFormat[] = ["md", "csv", "json"];

/**
 * Take it with you: three formats, saved or copied.
 *
 * Copy sits beside save because the two are used in different places and
 * neither substitutes for the other — a Markdown table goes into a message or a
 * document by clipboard, and a CSV goes to disk to be opened. Making someone
 * download a file to paste three rows into a chat is the kind of small friction
 * that stops a feature being used at all.
 *
 * The copied state is only shown when the write actually succeeded: browsers
 * refuse clipboard writes outside a gesture and in some embedded views, and a
 * tick over a clipboard that is still empty is worse than no feedback.
 */
export function ExportBar({
  build,
  name,
  suffix,
  label,
}: {
  /** Renders the export in the chosen format. Called only when asked for. */
  build: (format: ExportFormat) => string;
  /** Product name, for the filename. */
  name: string;
  /** Distinguishes a comparison's file from a sheet's. */
  suffix?: string;
  /** What is being exported, for the heading and the accessible names. */
  label: string;
}) {
  const [copied, setCopied] = useState<ExportFormat | null>(null);

  const save = (format: ExportFormat) => {
    downloadText(build(format), exportFilename(name, format, suffix), FORMAT_MIME[format]);
  };

  const copy = async (format: ExportFormat) => {
    if (await copyText(build(format))) {
      setCopied(format);
      window.setTimeout(() => setCopied(null), 1600);
    }
  };

  return (
    /* Marked screen-only: the controls for getting a document out are not
       part of the document. See the print block in globals.css. */
    <section data-print="hide" className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        Take {label} with you
      </h3>

      <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3">
        {FORMATS.map((format) => (
          <div key={format} className="flex items-center gap-2">
            <span className="flex-none basis-[46px] rounded-[7px] bg-accent-soft py-[5px] text-center font-mono text-[10px] font-extrabold tracking-[.4px] text-accent">
              {format.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">
              {FORMAT_LABEL[format]}
              {format === "md" && " — paste into a document"}
              {format === "csv" && " — open in a spreadsheet"}
              {format === "json" && " — feed to something else"}
            </span>

            <button
              type="button"
              onClick={() => void copy(format)}
              title={`Copy ${label} as ${FORMAT_LABEL[format]}`}
              aria-label={`Copy ${label} as ${FORMAT_LABEL[format]}`}
              className="tint grid size-8 flex-none place-items-center rounded-[9px] border border-border text-ink-soft hover:border-accent hover:text-accent"
            >
              {copied === format ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
            <button
              type="button"
              onClick={() => save(format)}
              title={`Save ${label} as ${FORMAT_LABEL[format]}`}
              aria-label={`Save ${label} as ${FORMAT_LABEL[format]}`}
              className="tint grid size-8 flex-none place-items-center rounded-[9px] border border-border text-ink-soft hover:border-accent hover:text-accent"
            >
              <DownloadIcon size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="tint flex h-9 items-center justify-center gap-2 rounded-[10px] border border-border text-[12px] font-semibold hover:border-accent hover:text-accent"
      >
        <ScanDocIcon size={15} aria-hidden="true" />
        Print {label}
      </button>

      <p className="text-[11px] leading-snug text-ink-soft">
        Every export carries the source article&rsquo;s address and the time the sheet was read, so
        the figures stay checkable once they leave here.
      </p>
    </section>
  );
}
