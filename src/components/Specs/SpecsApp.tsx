"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SPECS_TABS, useSpecsStore, type SpecsTab } from "@/store/useSpecsStore";
import { FindPanel } from "@/components/Specs/organisms/FindPanel";
import { SheetPanel } from "@/components/Specs/organisms/SheetPanel";
import { PricesPanel } from "@/components/Specs/organisms/PricesPanel";
import { SimilarPanel } from "@/components/Specs/organisms/SimilarPanel";
import { RatingPanel } from "@/components/Specs/organisms/RatingPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  GaugeIcon,
  SearchIcon,
  SpecSheetIcon,
  TagIcon,
  StackIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<SpecsTab>[] = [
  {
    id: "find",
    label: "Find",
    hint: "Search for a product, or reopen one you looked at before",
    icon: <SearchIcon size={19} />,
    controls: "specs-panel-find",
  },
  {
    id: "sheet",
    label: "Sheet",
    hint: "Every specification the source states, grouped",
    icon: <SpecSheetIcon size={19} />,
    controls: "specs-panel-sheet",
  },
  {
    id: "prices",
    label: "Prices",
    hint: "Where to buy it, in your country — and what it cost at launch",
    icon: <TagIcon size={19} />,
    controls: "specs-panel-prices",
  },
  {
    id: "similar",
    label: "Similar",
    hint: "What it replaced, what replaced it, and a side-by-side comparison",
    icon: <StackIcon size={19} />,
    controls: "specs-panel-similar",
  },
  {
    id: "rating",
    label: "Rating",
    hint: "The spec score measure by measure, and your own rating",
    icon: <GaugeIcon size={19} />,
    controls: "specs-panel-rating",
  },
];

/**
 * Spec Analyser — the full specification of any product, what sits beside it, and
 * what the numbers add up to.
 *
 * The four tabs are one path through a single question, in the order it is
 * actually asked: *find* the thing, read what it **is**, see what it sits
 * **beside**, decide what it is **worth**. They are tabs rather than a wizard
 * because the last three all describe the same open product, so going back to
 * the sheet after a comparison must not mean starting again.
 *
 * Two commitments run through the whole app and are repeated in its copy,
 * because they are what make it trustworthy rather than merely useful:
 *
 *  - **Every figure is quoted, and the source is one tap away.** The app reads
 *    encyclopedia articles (`lib/Specs/source.ts`); it never asserts a spec of
 *    its own, and each sheet carries the time it was read.
 *  - **The score is arithmetic, not judgement.** It places stated measures on
 *    published bands (`lib/Specs/score.ts`), says how many of them the sheet
 *    actually answered, and refuses to score categories where no honest scale
 *    exists. Anything a reader wants to add beyond that goes in their own
 *    rating, which stays on their device.
 */
export function SpecsApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useSpecsStore((s) => s.tab);
  const setTab = useSpecsStore((s) => s.setTab);
  const hydrate = useSpecsStore((s) => s.hydrate);

  // Adopt the saved recents, ratings and comparison once, after mount — doing
  // it during render would disagree with the server's HTML.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<SpecSheetIcon size={24} />}
            name="Spec Analyser"
            tagline="what a product is actually made of"
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
        <NavView viewKey={tab} order={SPECS_TABS} id={`specs-panel-${tab}`} role="tabpanel">
          {tab === "find" ? (
            <FindPanel />
          ) : tab === "sheet" ? (
            <SheetPanel />
          ) : tab === "prices" ? (
            <PricesPanel />
          ) : tab === "similar" ? (
            <SimilarPanel />
          ) : (
            <RatingPanel />
          )}
        </NavView>
      </main>

      <BottomNav label="Spec Analyser tools" items={TABS} value={tab} onChange={setTab} maxWidth={460} />

      <AppFooter />
    </div>
  );
}
