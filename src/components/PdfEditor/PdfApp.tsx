"use client";

import type { ComponentType } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PdfHome } from "@/components/PdfEditor/PdfHome";
import { MergeTool } from "@/components/PdfEditor/tools/MergeTool";
import { SplitTool } from "@/components/PdfEditor/tools/SplitTool";
import { OrganizeTool } from "@/components/PdfEditor/tools/OrganizeTool";
import { CreateTool } from "@/components/PdfEditor/tools/CreateTool";
import { ImagesTool } from "@/components/PdfEditor/tools/ImagesTool";
import { ExportImagesTool } from "@/components/PdfEditor/tools/ExportImagesTool";
import { WatermarkTool } from "@/components/PdfEditor/tools/WatermarkTool";
import { PageNumbersTool } from "@/components/PdfEditor/tools/PageNumbersTool";
import { MetadataTool } from "@/components/PdfEditor/tools/MetadataTool";
import { EditTool } from "@/components/PdfEditor/tools/EditTool";

const TOOL_COMPONENTS: Record<string, ComponentType> = {
  edit: EditTool,
  merge: MergeTool,
  split: SplitTool,
  organize: OrganizeTool,
  create: CreateTool,
  img: ImagesTool,
  toimg: ExportImagesTool,
  wm: WatermarkTool,
  num: PageNumbersTool,
  meta: MetadataTool,
};

/**
 * The PDF editor, rendered natively (no iframe). Masthead + the active tool
 * (or the home grid) + footer. Theme comes from the shared <body data-theme>.
 */
export function PdfApp() {
  const pdfTool = useWorkspaceStore((s) => s.pdfTool);
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  const Active = pdfTool ? TOOL_COMPONENTS[pdfTool] : null;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px] md:static">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-end justify-between gap-4">
          <button
            type="button"
            onClick={() => setPdfTool(null)}
            title="Back to all tools"
            className="-m-1.5 flex items-center gap-3.5 rounded-2xl p-1.5 text-left transition-colors hover:bg-accent-soft"
          >
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]">
              <svg
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 3.5h6.2L18 8.3V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z" />
                <path d="M13 3.6V8.5H17.9" />
                <path d="M8.6 12.5h6.8M8.6 15.4h6.8M8.6 18.2h4.2" />
              </svg>
            </span>
            <span>
              <span className="block text-[27px] font-extrabold leading-none tracking-tight">PDF Editor</span>
              <span className="mt-1 block font-serif text-[15px] italic text-ink-soft">
                every PDF tool, on one sheet
              </span>
              <span className="mt-1.5 block font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">
                by Vishnu P
              </span>
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openLauncher}
              title="Switch app"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="4" width="7" height="7" rx="1.6" />
                <rect x="13" y="4" width="7" height="7" rx="1.6" />
                <rect x="4" y="13" width="7" height="7" rx="1.6" />
                <rect x="13" y="13" width="7" height="7" rx="1.6" />
              </svg>
              Apps
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-[7px] font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
              <span className="size-[7px] rounded-full bg-[#57c98d]" />
              100% local · files never leave this device
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-[70px] pt-[30px]">
        {Active ? <Active /> : <PdfHome />}
      </main>

      <footer className="border-t border-border px-5 py-[22px] text-center font-mono text-[10.5px] tracking-[.1em] text-ink-soft">
        <div className="font-serif text-[14.5px] not-italic tracking-normal">
          Crafted by <b className="font-semibold text-accent">Vishnu P</b> ·{" "}
          <a href="tel:7510334431" className="font-mono text-accent no-underline hover:underline">
            ☎ 7510334431
          </a>
        </div>
      </footer>
    </div>
  );
}
