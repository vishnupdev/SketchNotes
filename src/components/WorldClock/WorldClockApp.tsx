"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useWorldClockStore } from "@/store/useWorldClockStore";
import { ModeTabs, WORLDCLOCK_MODE_ORDER } from "@/components/WorldClock/molecules/ModeTabs";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { ClockBoard } from "@/components/WorldClock/organisms/ClockBoard";
import { CountryPanel } from "@/components/WorldClock/organisms/CountryPanel";
import { CountryNewsPanel } from "@/components/WorldClock/organisms/CountryNewsPanel";
import { AppsIcon, WorldClockIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * World Clock — live times around the world, and the country behind each one.
 *
 * Three views over one selection. **Clocks** is a board of pinned cities with
 * your own time leading it and a slider that shifts every clock at once for
 * planning a call. Tapping any clock puts that country in focus, and
 * **Country** and **News** then answer "what is this place?" and "what's
 * happening there?" without asking the reader to pick it again.
 *
 * Everything except the headlines is bundled and computed locally — zones come
 * from `Intl`, so daylight saving is the platform's own rules, and the country
 * catalog ships with the app. That makes the clocks and every country detail
 * work with no connection at all.
 */
export function WorldClockApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const mode = useWorldClockStore((s) => s.mode);
  const setMode = useWorldClockStore((s) => s.setMode);
  const selectedCountry = useWorldClockStore((s) => s.selectedCountry);
  const selectCountry = useWorldClockStore((s) => s.selectCountry);
  const hydrate = useWorldClockStore((s) => s.hydrate);
  const resetScrub = useWorldClockStore((s) => s.resetScrub);

  // Merge the saved board and display preferences in once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Never leave the board frozen at a shifted time — coming back to a clock
  // that silently isn't "now" is the one failure a world clock can't afford.
  useEffect(() => resetScrub, [resetScrub]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<WorldClockIcon size={24} />}
            name="World Clock"
            tagline="live times, countries & their news"
            heading
            onLeave={resetScrub}
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      {/* ModeTabs is the floating bottom bar, so it's rendered outside the
          content flow and `bottom-nav-clear` keeps the last panel scrollable
          out from under it. */}
      <main className="bottom-nav-clear mx-auto w-full max-w-[820px] flex-1 px-5 pt-[22px]">
        {/* Switching views slides the new panel in from the side its tab sits
            on, so the change reads as a move along the bar. */}
        <NavView
          viewKey={mode}
          order={WORLDCLOCK_MODE_ORDER}
          id={`worldclock-panel-${mode}`}
          role="tabpanel"
        >
          {mode === "clocks" ? (
            <ClockBoard
              onOpenCountry={(code) => selectCountry(code)}
              onOpenNews={(code) => selectCountry(code, "news")}
            />
          ) : mode === "country" ? (
            <CountryPanel
              code={selectedCountry}
              onSelect={(code) => selectCountry(code)}
              onReadNews={() => setMode("news")}
            />
          ) : (
            <CountryNewsPanel
              code={selectedCountry}
              onSelect={(code) => selectCountry(code, "news")}
            />
          )}
        </NavView>
      </main>

      <ModeTabs mode={mode} onMode={setMode} />

      <AppFooter />
    </div>
  );
}
