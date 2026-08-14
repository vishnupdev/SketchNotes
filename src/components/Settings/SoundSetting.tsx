"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { playCue } from "@/lib/ui-sound";
import { cx } from "@/lib/utils";

/**
 * Settings → Sound. One switch for the whole workspace, plus a way to hear what
 * it controls.
 *
 * The preview button earns its place: the start-up chime is the one cue most
 * users will never hear by accident, because a browser won't play audio until
 * the page has been interacted with and a cold load hasn't been. Pressing this
 * *is* that interaction, so it plays.
 *
 * The persisted choice is hydrated here rather than in a shell component — this
 * is the only thing that renders it, and the cues themselves are gated inside
 * `@/lib/ui-sound`, which reads the same preference straight from storage.
 */
export function SoundSetting() {
  const soundOn = useWorkspaceStore((s) => s.soundOn);
  const setSoundOn = useWorkspaceStore((s) => s.setSoundOn);
  const hydrateSound = useWorkspaceStore((s) => s.hydrateSound);

  useEffect(() => {
    hydrateSound();
  }, [hydrateSound]);

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold">Interface sounds</span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
            A chime when the workspace opens, then a soft tone that rings as you arrive somewhere.
            Every app and every page inside one has its own note.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          aria-label="Interface sounds"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            // Turning them on answers "what will this sound like?" immediately —
            // and the tap is the gesture that lets it play at all.
            if (next) playCue("app");
          }}
          className={cx(
            "relative h-6 w-11 flex-none rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            soundOn ? "bg-accent" : "bg-border",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 size-5 rounded-full bg-panel shadow-panel transition-transform",
              soundOn ? "translate-x-5.5" : "translate-x-0.5",
            )}
          />
        </button>
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
        <button
          type="button"
          onClick={() => playCue("boot")}
          disabled={!soundOn}
          className="rounded-full border border-border bg-panel px-3.5 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
        >
          Play start-up chime
        </button>
        <span className="text-[11.5px] text-ink-soft">
          Browsers only allow sound once you&apos;ve interacted with the page, so the chime is
          skipped on a cold load unless you tap while it&apos;s opening.
        </span>
      </div>
    </div>
  );
}
