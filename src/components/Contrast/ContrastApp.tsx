"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { CONTRAST_TOOLS, useContrastStore, type ContrastTool } from "@/store/useContrastStore";
import { CheckPanel } from "@/components/Contrast/organisms/CheckPanel";
import { RampPanel } from "@/components/Contrast/organisms/RampPanel";
import { VisionPanel } from "@/components/Contrast/organisms/VisionPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  ContrastIcon,
  EyeIcon,
  LayersIcon,
  SwatchIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<ContrastTool>[] = [
  {
    id: "check",
    label: "Check",
    hint: "Grade a colour pair against every WCAG level",
    icon: <ContrastIcon size={19} />,
    controls: "contrast-panel-check",
  },
  {
    id: "ramp",
    label: "Ramp",
    hint: "Build a 50–950 scale and export it as tokens",
    icon: <LayersIcon size={19} />,
    controls: "contrast-panel-ramp",
  },
  {
    id: "vision",
    label: "Vision",
    hint: "Preview a palette under colour-vision deficiency",
    icon: <EyeIcon size={19} />,
    controls: "contrast-panel-vision",
  },
];

/**
 * Contrast — the three colour questions that decide whether an interface is
 * usable, rather than what colour something is.
 *
 * Color Lens *reads* colour: point it at a photo and get the code. This app is the
 * other direction — you already have the colours, and you need to know whether
 * they work. Will anyone be able to read this text. What does the rest of the
 * scale look like. Do two of these become the same colour for one reader in twelve.
 *
 * Entirely local, and deliberately built on the same `lib/color.ts` primitives the
 * workspace's own theme picker grades with, so a verdict here and a verdict there
 * can never disagree.
 */
export function ContrastApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useContrastStore((s) => s.tool);
  const setTool = useContrastStore((s) => s.setTool);
  const hydrate = useContrastStore((s) => s.hydrate);

  // Adopt the saved colours once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<SwatchIcon size={24} />}
            name="Contrast"
            tagline="can everyone actually read this"
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[760px] flex-1 px-5 pt-[22px]">
        <NavView
          viewKey={tool}
          order={CONTRAST_TOOLS}
          id={`contrast-panel-${tool}`}
          role="tabpanel"
        >
          {tool === "check" ? <CheckPanel /> : tool === "ramp" ? <RampPanel /> : <VisionPanel />}
        </NavView>
      </main>

      <BottomNav
        label="Contrast tools"
        items={TABS}
        value={tool}
        onChange={setTool}
        maxWidth={360}
      />

      <AppFooter />
    </div>
  );
}
