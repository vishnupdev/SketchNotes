"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWalkaroundStore } from "@/store/useWalkaroundStore";
import { ViewTabs, WALK_TAB_ORDER } from "@/components/Walkaround/molecules/ViewTabs";
import { PickPanel } from "@/components/Walkaround/organisms/PickPanel";
import { TourPanel } from "@/components/Walkaround/organisms/TourPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { AppsIcon, WalkaroundIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Walkaround — a guided tour of any app in the workspace.
 *
 * The problem it exists for: twenty-five apps, each with a handful of things
 * that are genuinely useful and not visible on arrival. The Assistant answers a
 * question you already know to ask; the launcher tells you an app exists. Neither
 * shows you round one.
 *
 * Two decisions shape it:
 *
 *  - **It tours a drawing, not the app.** Each stop points at a schematic of the
 *    app's screen rather than at a real element in it. Highlighting real controls
 *    would mean this app knowing selectors inside all the others — the coupling
 *    rule #5 exists to prevent, and a thing that breaks silently the first time
 *    any app moves a button. A schematic can only ever be *out of date*, which
 *    `walkaround.test.ts` checks and a reader can see.
 *  - **The tooltip is never the only copy.** Every stop's text also appears in
 *    the list below the stage, in full, because a tooltip on a diagram is a poor
 *    place for the only version of anything — for a screen reader, for a find on
 *    the page, or for someone who would rather read straight through.
 */
export function WalkaroundApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const view = useWalkaroundStore((s) => s.view);
  const setView = useWalkaroundStore((s) => s.setView);
  const hydrate = useWalkaroundStore((s) => s.hydrate);

  // Adopt the saved pick and progress once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<WalkaroundIcon size={24} />}
            name="Walkaround"
            tagline="a guided tour of any app here"
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[860px] flex-1 px-5 pt-[22px]">
        <NavView
          viewKey={view}
          order={WALK_TAB_ORDER}
          id={`walk-panel-${view}`}
          role="tabpanel"
        >
          {view === "apps" ? <PickPanel /> : <TourPanel />}
        </NavView>
      </main>

      <ViewTabs view={view} onView={setView} />

      <AppFooter />
    </div>
  );
}
