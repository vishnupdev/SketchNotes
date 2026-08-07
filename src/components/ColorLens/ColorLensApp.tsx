"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useColorLensStore } from "@/store/useColorLensStore";
import { ImageStage } from "@/components/ColorLens/organisms/ImageStage";
import { ColorReport } from "@/components/ColorLens/organisms/ColorReport";
import { PalettePanel } from "@/components/ColorLens/organisms/PalettePanel";
import { HistoryStrip } from "@/components/ColorLens/molecules/HistoryStrip";
import { AppsIcon, EyedropperIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Color Lens — attach a photo or take one, tap any point, and get that colour in
 * every notation, plus how readable it is and what goes with it. The image is
 * decoded and sampled entirely in the browser, so it works offline and no
 * picture is ever uploaded. Rendered natively; theme comes from the shared
 * <body>.
 */
export function ColorLensApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const hydrate = useColorLensStore((s) => s.hydrate);
  const pickedHex = useColorLensStore((s) => s.pickedHex);
  const history = useColorLensStore((s) => s.history);
  const imageUrl = useColorLensStore((s) => s.imageUrl);
  const pick = useColorLensStore((s) => s.pick);
  const clearHistory = useColorLensStore((s) => s.clearHistory);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<EyedropperIcon size={26} />}
            name="Color Lens"
            tagline="every colour in a picture, in every code"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openLauncher}
              title="Switch app"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
            >
              <AppsIcon size={15} />
              Apps
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-[7px] font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
              <span className="size-[7px] rounded-full bg-success" />
              100% local · photos never leave this device
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 pb-[70px] pt-[26px]">
        {/* Two columns once there's room: the picture stays in view on the left
            while the report scrolls on the right. Stacked below that. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-5 lg:sticky lg:top-[132px]">
            <ImageStage />
            {imageUrl && <PalettePanel />}
            <HistoryStrip
              history={history}
              selectedHex={pickedHex}
              onSelect={pick}
              onClear={clearHistory}
            />
          </div>

          <div>
            {pickedHex ? (
              <ColorReport hex={pickedHex} onSelect={pick} />
            ) : (
              <div className="rounded-2xl border border-border bg-panel p-6 text-center shadow-panel">
                <h2 className="text-[15px] font-bold tracking-[.1px]">No colour yet</h2>
                <p className="mx-auto mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-ink-soft">
                  Load a picture and tap it — you&rsquo;ll get the hex, RGB, HSL, HSB, CMYK, LAB
                  and LCH values, the nearest colour name, WCAG contrast grades, and matching
                  colour schemes.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
