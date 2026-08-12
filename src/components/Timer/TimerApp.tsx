"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTimerStore } from "@/store/useTimerStore";
import { ModeTabs, TIMER_MODE_ORDER } from "@/components/Timer/molecules/ModeTabs";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { CountdownPanel } from "@/components/Timer/organisms/CountdownPanel";
import { StopwatchPanel } from "@/components/Timer/organisms/StopwatchPanel";
import { PomodoroPanel } from "@/components/Timer/organisms/PomodoroPanel";
import { AppsIcon, TimerIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Timer — a three-in-one time tool: multi-countdown timers, a lap stopwatch and
 * a pomodoro focus cycle. All timing is driven by the shared {@link useTimerStore}
 * engine (absolute timestamps + a singleton ticker), so timers keep running and
 * still alert even while another app is on screen. Rendered natively; theme comes
 * from the shared <body>.
 */
export function TimerApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const mode = useTimerStore((s) => s.mode);
  const setMode = useTimerStore((s) => s.setMode);
  const hydrate = useTimerStore((s) => s.hydrate);

  // Merge persisted state and start the wall-clock on mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<TimerIcon size={26} />}
            name="Timer"
            tagline="countdown, stopwatch & pomodoro"
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

      {/* ModeTabs is the floating bottom bar — outside the content flow, with
          `bottom-nav-clear` keeping the panel scrollable out from under it. */}
      <main className="bottom-nav-clear mx-auto w-full max-w-[720px] flex-1 px-5 pt-[22px]">
        {/* Switching tools slides the new panel in from the side its tab sits
            on, so the change reads as a move along the bar. */}
        <NavView viewKey={mode} order={TIMER_MODE_ORDER} className="flex flex-col gap-5">
          {mode === "countdown" ? (
            <CountdownPanel />
          ) : mode === "stopwatch" ? (
            <StopwatchPanel />
          ) : (
            <PomodoroPanel />
          )}
        </NavView>
      </main>

      <ModeTabs mode={mode} onMode={setMode} />

      <AppFooter />
    </div>
  );
}
