"use client";

import { useId, useState } from "react";
import {
  EXPORT_FORMATS,
  downloadText,
  formatPalette,
  type ExportFormat,
} from "@/lib/ColorLens/export";
import { CopyButton } from "@/components/ColorLens/atoms/CopyButton";
import { DownloadIcon } from "@/components/SketchNotes/atoms/icons";
import type { PaletteEntry } from "@/lib/ColorLens/types";

interface ExportBarProps {
  palette: PaletteEntry[];
  /** Basis for the downloaded filename. */
  imageName: string | null;
}

/** Strip the extension off a filename so ours can be appended cleanly. */
function baseName(name: string | null): string {
  if (!name) return "palette";
  const stem = name.replace(/\.[^.]+$/, "").trim();
  // Keep it filesystem-safe across platforms.
  return stem.replace(/[^\w-]+/g, "-").slice(0, 40) || "palette";
}

/** Copy or save the extracted palette in the format the user works in. */
export function ExportBar({ palette, imageName }: ExportBarProps) {
  const selectId = useId();
  const [format, setFormat] = useState<ExportFormat>("hex");

  const spec = EXPORT_FORMATS.find((f) => f.id === format)!;
  const text = formatPalette(palette, format);

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Export as
        </label>
        <select
          id={selectId}
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="w-full rounded-[9px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[13.5px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        >
          {EXPORT_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5 pb-0.5">
        <CopyButton
          value={text}
          label={`palette as ${spec.label}`}
          size={17}
          className="border-border bg-paper"
        />
        <button
          type="button"
          onClick={() => downloadText(text, `${baseName(imageName)}.${spec.ext}`, spec.mime)}
          aria-label={`Download the palette as ${spec.label}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2 text-[13px] font-semibold text-text hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <DownloadIcon size={15} />
          Save
        </button>
      </div>
    </div>
  );
}
