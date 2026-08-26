"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { CHRONO_TOOLS, useChronoStore, type ChronoTool } from "@/store/useChronoStore";
import { CronPanel } from "@/components/Chrono/organisms/CronPanel";
import { StampPanel } from "@/components/Chrono/organisms/StampPanel";
import { DurationPanel } from "@/components/Chrono/organisms/DurationPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  ChronoIcon,
  ClockIcon,
  RepeatIcon,
  TimerIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<ChronoTool>[] = [
  {
    id: "cron",
    label: "Cron",
    hint: "Explain an expression and show its next runs",
    icon: <RepeatIcon size={19} />,
    controls: "chrono-panel-cron",
  },
  {
    id: "stamp",
    label: "Stamp",
    hint: "Read a Unix timestamp or a date, in every form",
    icon: <ClockIcon size={19} />,
    controls: "chrono-panel-stamp",
  },
  {
    id: "duration",
    label: "Length",
    hint: "Read a duration, and add it to a moment",
    icon: <TimerIcon size={19} />,
    controls: "chrono-panel-duration",
  },
];

/**
 * Chrono — the questions about time that a clock cannot answer.
 *
 * World Clock covers *what time is it there*. This covers *when does this fire*,
 * *what instant is this number*, and *how long is that* — three questions that
 * turn up constantly while reading a log, wiring up a schedule or sizing a
 * timeout, and that otherwise mean pasting production data into someone else's
 * website. All three run entirely on the device.
 */
export function ChronoApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useChronoStore((s) => s.tool);
  const setTool = useChronoStore((s) => s.setTool);
  const hydrate = useChronoStore((s) => s.hydrate);

  // Adopt the saved inputs once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<ChronoIcon size={24} />}
            name="Chrono"
            tagline="when it fires, and how long that is"
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
        <NavView viewKey={tool} order={CHRONO_TOOLS} id={`chrono-panel-${tool}`} role="tabpanel">
          {tool === "cron" ? <CronPanel /> : tool === "stamp" ? <StampPanel /> : <DurationPanel />}
        </NavView>
      </main>

      <BottomNav label="Chrono tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
