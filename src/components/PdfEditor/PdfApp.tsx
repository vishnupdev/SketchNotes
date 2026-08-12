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
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

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
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  const Active = pdfTool ? TOOL_COMPONENTS[pdfTool] : null;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-end justify-between gap-4">
          {/* Goes to the workspace home, like every other app's masthead. The
              tool grid stays one click away from inside a tool via ToolFrame's
              "← All tools". */}
          <AppBrand
            icon={
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
            }
            name="PDF Editor"
            tagline="every PDF tool, on one sheet"
          />

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
        {/* Opening a tool from the grid animates inward and going back out
            animates outward, so the two directions of this navigation are told
            apart without reading the heading. */}
        <NavView viewKey={pdfTool ?? "home"} motion={pdfTool ? "deeper" : "shallower"}>
          {Active ? <Active /> : <PdfHome />}
        </NavView>
      </main>

      <AppFooter />
    </div>
  );
}
