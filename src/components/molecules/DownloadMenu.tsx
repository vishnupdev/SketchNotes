"use client";

import type { ExportFormat } from "@/engine/types";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";

interface FormatOption {
  fmt: ExportFormat;
  name: string;
  hint: string;
}

const FORMATS: FormatOption[] = [
  { fmt: "png", name: "PNG image", hint: "Crisp raster, matches theme" },
  { fmt: "jpg", name: "JPG image", hint: "Smaller file size" },
  { fmt: "webp", name: "WebP image", hint: "Modern, compact image" },
  { fmt: "svg", name: "SVG vector", hint: "Infinitely scalable, editable" },
  { fmt: "pdf", name: "PDF document", hint: "Easy to share and print" },
  { fmt: "doc", name: "Word document", hint: "Opens in Microsoft Word" },
  { fmt: "json", name: "JSON backup", hint: "Re-import into Sketchnotes later" },
];

/** Export-format chooser dropped below the header download button. */
export function DownloadMenu() {
  const { exportAs } = useEditorCommands();
  const closePopovers = useEditorStore((s) => s.closePopovers);

  return (
    <div className="max-h-[min(62vh,430px)] min-w-[220px] overflow-y-auto p-1.5">
      {FORMATS.map(({ fmt, name, hint }) => (
        <button
          key={fmt}
          type="button"
          onClick={() => {
            closePopovers();
            void exportAs(fmt);
          }}
          className="tint flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-left"
        >
          <span className="flex-none basis-[38px] rounded-[7px] bg-accent-soft py-[5px] text-center text-[10px] font-extrabold tracking-[.4px] text-accent">
            {fmt.toUpperCase()}
          </span>
          <span>
            <span className="font-semibold">{name}</span>
            <small className="mt-px block text-[11px] font-medium text-ink-soft">{hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
