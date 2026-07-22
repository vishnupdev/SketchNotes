"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";
import type { SystemReport } from "@/lib/SystemInfo/types";
import { reportToText } from "@/lib/SystemInfo/format";
import { CheckIcon, CopyIcon, DownloadIcon, RotateIcon } from "@/components/SketchNotes/atoms/icons";

interface ReportToolbarProps {
  report: SystemReport;
  fetching: boolean;
  onRescan: () => void;
}

/** Trigger a client-side file download from a text blob. */
function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Re-scan, copy-as-text and export-as-JSON actions for the report. */
export function ReportToolbar({ report, fetching, onRescan }: ReportToolbarProps) {
  const [copied, setCopied] = useState(false);

  const flatSummary = report.summary as unknown as Record<string, string>;

  const copy = async () => {
    const text = reportToText({ ...report, summary: flatSummary });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      download("system-report.txt", text, "text/plain");
    }
  };

  const exportJson = () => {
    download("system-report.json", JSON.stringify(report, null, 2), "application/json");
  };

  const btn = "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onRescan} disabled={fetching} className={btn}>
        <RotateIcon size={15} className={cx(fetching && "animate-spin")} />
        {fetching ? "Scanning…" : "Re-scan"}
      </button>
      <button type="button" onClick={copy} className={btn}>
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button type="button" onClick={exportJson} className={btn}>
        <DownloadIcon size={15} />
        JSON
      </button>
    </div>
  );
}
