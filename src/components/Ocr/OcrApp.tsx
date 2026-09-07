"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { OCR_TOOLS, useOcrStore, type OcrTool } from "@/store/useOcrStore";
import { ReadPanel } from "@/components/Ocr/organisms/ReadPanel";
import { TunePanel } from "@/components/Ocr/organisms/TunePanel";
import { BatchPanel } from "@/components/Ocr/organisms/BatchPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  ScanTextIcon,
  StackIcon,
  TuneIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<OcrTool>[] = [
  {
    id: "read",
    label: "Read",
    hint: "Open a picture and get the text, with a confidence for every word",
    icon: <ScanTextIcon size={19} />,
    controls: "ocr-panel-read",
  },
  {
    id: "tune",
    label: "Tune",
    hint: "See exactly what the engine is given — and fix a bad read",
    icon: <TuneIcon size={19} />,
    controls: "ocr-panel-tune",
  },
  {
    id: "batch",
    label: "Batch",
    hint: "A folder of pictures in one pass",
    icon: <StackIcon size={19} />,
    controls: "ocr-panel-batch",
  },
];

/**
 * OCR — text out of a picture, on the device.
 *
 * The workspace could photograph a page into a PDF (Scan), read its metadata
 * (Exif) and read its colours (Color Lens), but nothing could read its
 * *words*. This fills that in, and it is the one app here with a genuinely
 * awkward dependency: a 7 MB WebAssembly build of Tesseract plus an English
 * model, far too much to precache for every visitor of a workspace where most
 * people will never open it. So it is fetched on the first read and cached on
 * the device, which makes this the only app that needs a connection *once*.
 * Everything about that is said plainly on screen rather than discovered.
 *
 * The design conviction, everywhere: **OCR that hands you text without telling
 * you what it guessed at is dangerous.** It does not fail loudly — it returns
 * `5` where the page said `S`, in the same tone as everything it got right. So
 * per-word confidence is carried through the whole pipeline, the uncertain
 * words are markable in the text and lightable on the picture, and the verdict
 * says what to do rather than only how sure it is.
 *
 * The other conviction is that **the preprocessing is the app**. Tune is not a
 * settings screen; it is where a 60% read becomes a 95% one, and its preview is
 * the actual bitmap the engine will be handed rather than an impression of it.
 */
export function OcrApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useOcrStore((s) => s.tool);
  const setTool = useOcrStore((s) => s.setTool);
  const hydrate = useOcrStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Leaving the app frees the engine's wasm heap — tens of megabytes that a
  // workspace keeping every app mounted cannot hold for one nobody is looking
  // at. The next visit reloads it from the device's own cache, not the network.
  useEffect(
    () => () => {
      void import("@/lib/Ocr/engine").then((engine) => engine.release());
    },
    [],
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<ScanTextIcon size={24} />}
            name="OCR"
            tagline="text out of any picture"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="bottom-nav-clear mx-auto w-full max-w-[720px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={OCR_TOOLS} id={`ocr-panel-${tool}`} role="tabpanel">
          {tool === "read" ? <ReadPanel /> : tool === "tune" ? <TunePanel /> : <BatchPanel />}
        </NavView>
      </main>

      <BottomNav label="OCR tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
