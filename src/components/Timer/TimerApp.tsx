"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTimerStore } from "@/store/useTimerStore";
import { ModeTabs } from "@/components/Timer/molecules/ModeTabs";
import { CountdownPanel } from "@/components/Timer/organisms/CountdownPanel";
import { StopwatchPanel } from "@/components/Timer/organisms/StopwatchPanel";
import { PomodoroPanel } from "@/components/Timer/organisms/PomodoroPanel";
import { AppsIcon, TimerIcon } from "@/components/SketchNotes/atoms/icons";

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
      <header className="border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]">
              <TimerIcon size={26} />
            </span>
            <div>
              <div className="text-[27px] font-extrabold leading-none tracking-tight">Timer</div>
              <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                countdown, stopwatch &amp; pomodoro
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">by Vishnu P</div>
            </div>
          </div>

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

      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-[80px] pt-[22px]">
        <div className="flex flex-col gap-5">
          <ModeTabs mode={mode} onMode={setMode} />
          {mode === "countdown" ? (
            <CountdownPanel />
          ) : mode === "stopwatch" ? (
            <StopwatchPanel />
          ) : (
            <PomodoroPanel />
          )}
        </div>
      </main>
    </div>
  );
}
