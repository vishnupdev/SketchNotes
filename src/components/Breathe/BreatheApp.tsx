"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { BREATHE_TOOLS, useBreatheStore, type BreatheTool } from "@/store/useBreatheStore";
import { BreathePanel } from "@/components/Breathe/organisms/BreathePanel";
import { PatternsPanel } from "@/components/Breathe/organisms/PatternsPanel";
import { HistoryPanel } from "@/components/Breathe/organisms/HistoryPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import { AppsIcon, BarChartIcon, BreatheIcon, SlidersIcon } from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<BreatheTool>[] = [
  {
    id: "breathe",
    label: "Breathe",
    hint: "Follow the orb",
    icon: <BreatheIcon size={19} />,
    controls: "breathe-panel-breathe",
  },
  {
    id: "patterns",
    label: "Patterns",
    hint: "Box, 4-7-8, coherent — or your own",
    icon: <SlidersIcon size={19} />,
    controls: "breathe-panel-patterns",
  },
  {
    id: "history",
    label: "History",
    hint: "Streak, minutes and the last two weeks",
    icon: <BarChartIcon size={19} />,
    controls: "breathe-panel-history",
  },
];

/**
 * Breathe — paced breathing, led by an orb that fills and empties with you.
 *
 * The animation is the instruction here rather than decoration: you breathe in
 * while it swells, hold while it rests, and out while it shrinks, so the whole
 * screen is drawn from one clock (`lib/Breathe/patterns.ts`). Tones and
 * vibration carry the same cues for eyes that are closed, and a screen reader
 * hears each phase as it begins.
 */
export function BreatheApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useBreatheStore((s) => s.tool);
  const setTool = useBreatheStore((s) => s.setTool);
  const hydrate = useBreatheStore((s) => s.hydrate);
  const release = useBreatheStore((s) => s.release);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Leaving the app unmounts it (see `AppFrame`). A session in progress is
  // logged for what it was, and the tones are silenced.
  useEffect(() => release, [release]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName)))
        return;
      const s = useBreatheStore.getState();
      if (s.tool !== "breathe") return;
      e.preventDefault();
      if (s.status === "running") s.pause();
      else if (s.status === "paused") s.resume();
      else s.start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<BreatheIcon size={24} />}
            name="Breathe"
            tagline="in as it grows, out as it fades"
            onLeave={release}
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[720px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={BREATHE_TOOLS} id={`breathe-panel-${tool}`} role="tabpanel">
          {tool === "breathe" ? <BreathePanel /> : tool === "patterns" ? <PatternsPanel /> : <HistoryPanel />}
        </NavView>
      </main>

      <BottomNav label="Breathe tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
