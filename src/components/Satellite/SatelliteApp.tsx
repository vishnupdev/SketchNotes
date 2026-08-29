"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SATELLITE_TABS, useSatelliteStore, type SatelliteTab } from "@/store/useSatelliteStore";
import { MapStage } from "@/components/Satellite/organisms/MapStage";
import { FindPanel } from "@/components/Satellite/organisms/FindPanel";
import { LayersPanel } from "@/components/Satellite/organisms/LayersPanel";
import { LivePanel } from "@/components/Satellite/organisms/LivePanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  LayersIcon,
  PulseIcon,
  SearchIcon,
  SatelliteIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<SatelliteTab>[] = [
  {
    id: "find",
    label: "Find",
    hint: "Search a place, paste coordinates, or keep somewhere",
    icon: <SearchIcon size={19} />,
    controls: "satellite-panel-find",
  },
  {
    id: "layers",
    label: "Layers",
    hint: "Choose the imagery, the labels and the live overlay",
    icon: <LayersIcon size={19} />,
    controls: "satellite-panel-layers",
  },
  {
    id: "live",
    label: "Live",
    hint: "Your position, and how fresh the weather overlay is",
    icon: <PulseIcon size={19} />,
    controls: "satellite-panel-live",
  },
];

/**
 * Satellite Map — look at anywhere on Earth from above, with what is happening
 * over it right now drawn on top.
 *
 * The map is the app, so it stays on screen at every tab: the three panels
 * underneath change what you can *do* to it — find a place, change what it is
 * made of, or read the live layer — and never take it away. Switching tabs while
 * watching a rain band move would otherwise mean losing the thing you were
 * watching.
 *
 * The honest framing is load-bearing here and is repeated in the Live tab: the
 * imagery is a photograph of the ground, months or years old, because no public
 * satellite service streams the Earth live. The live parts are the weather over
 * it and the device's own position, both stamped with the minute they were read.
 */
export function SatelliteApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useSatelliteStore((s) => s.tab);
  const setTab = useSatelliteStore((s) => s.setTab);
  const hydrate = useSatelliteStore((s) => s.hydrate);

  // Adopt the saved view and places once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<SatelliteIcon size={24} />}
            name="Satellite Map"
            tagline="the ground from above, and the weather over it now"
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

      <main className="bottom-nav-clear mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-5 px-5 pt-[22px]">
        <MapStage />

        <NavView
          viewKey={tab}
          order={SATELLITE_TABS}
          id={`satellite-panel-${tab}`}
          role="tabpanel"
        >
          {tab === "find" ? <FindPanel /> : tab === "layers" ? <LayersPanel /> : <LivePanel />}
        </NavView>
      </main>

      <BottomNav
        label="Satellite Map tools"
        items={TABS}
        value={tab}
        onChange={setTab}
        maxWidth={360}
      />

      <AppFooter />
    </div>
  );
}
