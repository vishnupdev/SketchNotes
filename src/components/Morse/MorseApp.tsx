"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useMorseStore } from "@/store/useMorseStore";
import { ModeTabs } from "@/components/Morse/molecules/ModeTabs";
import { PlaybackBar } from "@/components/Morse/molecules/PlaybackBar";
import { LearnPanel } from "@/components/Morse/organisms/LearnPanel";
import { PracticePanel } from "@/components/Morse/organisms/PracticePanel";
import { TranslatePanel } from "@/components/Morse/organisms/TranslatePanel";
import { KeyPanel } from "@/components/Morse/organisms/KeyPanel";
import { AppsIcon, MorseIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Morse Code — four tools over one shared signal engine: a chart to Learn from,
 * a Practice drill that tracks each character, a Translator, and a straight Key
 * you send with yourself.
 *
 * Everything is synthesized in the browser (Web Audio for the tone, the same
 * timeline for the lamp and haptics), so the whole app works offline and no
 * audio files ship with it. Speed, pitch and per-character mastery persist
 * locally via {@link useMorseStore}.
 */
export function MorseApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const mode = useMorseStore((s) => s.mode);
  const setMode = useMorseStore((s) => s.setMode);
  const hydrate = useMorseStore((s) => s.hydrate);
  const stop = useMorseStore((s) => s.stop);

  // Merge saved settings and progress once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Never leave a message playing into another app.
  useEffect(() => stop, [stop]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          {/* Stops any playing message on the way out — a tone must not follow
              the user into another app. */}
          <AppBrand
            icon={<MorseIcon size={24} />}
            name="Morse Code"
            tagline="learn, practise & send"
            heading
            onLeave={stop}
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

      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-[80px] pt-[22px]">
        <div className="flex flex-col gap-4">
          <ModeTabs mode={mode} onMode={setMode} />
          <PlaybackBar />
          <div id={`morse-panel-${mode}`} role="tabpanel">
            {mode === "learn" ? (
              <LearnPanel />
            ) : mode === "practice" ? (
              <PracticePanel />
            ) : mode === "translate" ? (
              <TranslatePanel />
            ) : (
              <KeyPanel />
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
