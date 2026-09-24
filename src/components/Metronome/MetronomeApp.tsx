"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  METRONOME_TOOLS,
  useMetronomeStore,
  type MetronomeTool,
} from "@/store/useMetronomeStore";
import { BeatPanel } from "@/components/Metronome/organisms/BeatPanel";
import { TrainerPanel } from "@/components/Metronome/organisms/TrainerPanel";
import { SongsPanel } from "@/components/Metronome/organisms/SongsPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  BookmarkIcon,
  GaugeIcon,
  MetronomeIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<MetronomeTool>[] = [
  {
    id: "beat",
    label: "Beat",
    hint: "Tempo, bar, accents and sound",
    icon: <MetronomeIcon size={19} />,
    controls: "metronome-panel-beat",
  },
  {
    id: "trainer",
    label: "Trainer",
    hint: "Speed ramp and silent bars",
    icon: <GaugeIcon size={19} />,
    controls: "metronome-panel-trainer",
  },
  {
    id: "songs",
    label: "Songs",
    hint: "Tempos kept under a name",
    icon: <BookmarkIcon size={19} />,
    controls: "metronome-panel-songs",
  },
];

/** Typing into a field, or pressing a focused control, keeps its own keys. */
function ownsKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

/**
 * Metronome — a click that keeps real time, and the two practice modes a
 * mechanical one cannot do.
 *
 * The workspace already listens (the Sound Meter reads pitch); this is the
 * other half a musician reaches for. Clicks are booked ahead on the audio
 * hardware's clock (`lib/Metronome/engine.ts`) rather than fired by a timer,
 * so a busy page cannot make it drift, and every sound is synthesised, so it
 * works offline from the first visit.
 */
export function MetronomeApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useMetronomeStore((s) => s.tool);
  const setTool = useMetronomeStore((s) => s.setTool);
  const hydrate = useMetronomeStore((s) => s.hydrate);
  const release = useMetronomeStore((s) => s.release);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Leaving the app unmounts it (see `AppFrame`), and a click that followed
  // you into another app would be a bug, not a feature.
  useEffect(() => release, [release]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || ownsKeys(e.target)) return;
      const s = useMetronomeStore.getState();
      if (e.key === " ") s.toggle();
      else if (e.key === "ArrowUp") s.nudge(e.shiftKey ? 10 : 1);
      else if (e.key === "ArrowDown") s.nudge(e.shiftKey ? -10 : -1);
      else if (e.key === "t" || e.key === "T") s.tap();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<MetronomeIcon size={24} />}
            name="Metronome"
            tagline="keep time, then keep it without the click"
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
        <NavView
          viewKey={tool}
          order={METRONOME_TOOLS}
          id={`metronome-panel-${tool}`}
          role="tabpanel"
        >
          {tool === "beat" ? <BeatPanel /> : tool === "trainer" ? <TrainerPanel /> : <SongsPanel />}
        </NavView>

        <p className="mt-5 text-[11.5px] leading-relaxed text-ink-soft">
          Keys: Space starts and stops · ↑ ↓ change the tempo by 1 (with Shift, by 10) · T taps it.
        </p>
      </main>

      <BottomNav label="Metronome tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
