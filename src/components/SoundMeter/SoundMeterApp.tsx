"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useSoundMeterStore } from "@/store/useSoundMeterStore";
import { MicControl } from "@/components/SoundMeter/molecules/MicControl";
import { TunerPanel } from "@/components/SoundMeter/organisms/TunerPanel";
import { LevelPanel } from "@/components/SoundMeter/organisms/LevelPanel";
import { ScopePanel } from "@/components/SoundMeter/organisms/ScopePanel";
import { AppsIcon, TuningForkIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Sound Meter — measures what the microphone hears: the fundamental frequency
 * and the note it lands on, loudness in dBFS, a live spectrum and a waveform.
 *
 * Analysis runs entirely in the browser via Web Audio, so the app works
 * offline and no audio is recorded, stored or sent anywhere. The microphone is
 * released whenever the app is left, so the recording indicator never lingers
 * over another app.
 */
export function SoundMeterApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const hydrate = useSoundMeterStore((s) => s.hydrate);
  const stop = useSoundMeterStore((s) => s.stop);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // The workspace unmounts an app when you switch away from it, so this is
  // also what closes the microphone on leaving: holding it open while the user
  // is drawing in Sketchnotes would be a privacy surprise and a battery drain.
  useEffect(() => () => stop(), [stop]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<TuningForkIcon size={26} />}
            name="Sound Meter"
            tagline="frequency, pitch, level & spectrum"
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

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-[80px] pt-[26px]">
        <div className="flex flex-col gap-6">
          <MicControl />
          <TunerPanel />
          <ScopePanel />
          <LevelPanel />

          <p className="text-center text-[11px] leading-relaxed text-ink-soft">
            Audio is analysed live in this browser — nothing is recorded, saved or uploaded, and
            the microphone is released as soon as you stop or switch apps. Accuracy depends on your
            microphone: laptop mics roll off below about 100 Hz and above 15 kHz.
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
