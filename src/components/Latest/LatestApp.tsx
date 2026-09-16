"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { LATEST_TABS, useLatestStore, type LatestTab } from "@/store/useLatestStore";
import { NewPanel } from "@/components/Latest/organisms/NewPanel";
import { BrandsPanel } from "@/components/Latest/organisms/BrandsPanel";
import { SheetPanel } from "@/components/Latest/organisms/SheetPanel";
import { SavedPanel } from "@/components/Latest/organisms/SavedPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  BookmarkIcon,
  BrandsIcon,
  NewReleaseIcon,
  SpecSheetIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<LatestTab>[] = [
  {
    id: "new",
    label: "New",
    hint: "The latest of each kind — phones, laptops, TVs, monitors, graphics and more",
    icon: <NewReleaseIcon size={19} />,
    controls: "latest-panel-new",
  },
  {
    id: "brands",
    label: "Brands",
    hint: "Everything arranged by who makes it",
    icon: <BrandsIcon size={19} />,
    controls: "latest-panel-brands",
  },
  {
    id: "sheet",
    label: "Details",
    hint: "The full specification of the product you opened",
    icon: <SpecSheetIcon size={19} />,
    controls: "latest-panel-sheet",
  },
  {
    id: "saved",
    label: "Saved",
    hint: "Search the catalogue, and the shortlist you are deciding from",
    icon: <BookmarkIcon size={19} />,
    controls: "latest-panel-saved",
  },
];

/**
 * Latest Tech — what just came out, by kind and by maker, with the whole
 * specification.
 *
 * ## The question this answers, and how it differs from Spec Analyser
 *
 * Spec Analyser, elsewhere in this workspace, starts from a name you already
 * have: you type "Galaxy S25 Ultra" and it reads whatever an encyclopedia
 * article states. This app starts from *nothing* — "show me the newest
 * monitors", "what has LG shipped this year" — which is a different question
 * and cannot be reached through a search box at all. Neither app imports the
 * other (rule #5); they share an upstream and nothing else.
 *
 * ## Two halves, kept visibly apart
 *
 * The catalogue is **curated**: read off each manufacturer's own published
 * specification page, with that page linked from every sheet, because it is the
 * only way to give televisions and monitors a complete sheet — nothing
 * enumerates them (the measurements are in `lib/Latest/categories.ts`). A
 * curated list has a clock running against it, so beside it runs a **live**
 * feed of the encyclopedia's "introduced in <year>" categories, which keeps
 * surfacing releases nobody here has typed in.
 *
 * Those two halves are typed differently, drawn differently and labelled
 * differently, and that is the app's central commitment: a row presented as a
 * product has a full sheet behind it, and a row that only has a description is
 * presented as a link. The catalogue also states the date it was last reviewed
 * on every screen that shows it — a recency feature that cannot say how recent
 * it is has the one failure a recency feature cannot survive.
 */
export function LatestApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useLatestStore((s) => s.tab);
  const setTab = useLatestStore((s) => s.setTab);
  const hydrate = useLatestStore((s) => s.hydrate);

  // Adopt the saved category, maker and shortlist once, after mount — doing it
  // during render would disagree with the server's HTML.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<NewReleaseIcon size={24} />}
            name="Latest Tech"
            tagline="what just came out, in full"
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
        <NavView viewKey={tab} order={LATEST_TABS} id={`latest-panel-${tab}`} role="tabpanel">
          {tab === "new" ? (
            <NewPanel />
          ) : tab === "brands" ? (
            <BrandsPanel />
          ) : tab === "sheet" ? (
            <SheetPanel />
          ) : (
            <SavedPanel />
          )}
        </NavView>
      </main>

      <BottomNav label="Latest Tech tools" items={TABS} value={tab} onChange={setTab} maxWidth={420} />

      <AppFooter />
    </div>
  );
}
