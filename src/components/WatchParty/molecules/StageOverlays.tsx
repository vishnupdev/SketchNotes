"use client";

import type { Floater } from "@/store/useWatchPartyStore";
import { MusicNoteIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * What drifts over the picture: reactions rise from wherever they were thrown,
 * and other people's chat lines surface briefly in the corner — which is how a
 * chat still reaches someone watching full screen.
 *
 * Decorative copies of things that exist elsewhere (the reaction is announced
 * in no other way, but the chat is in the Chat tab), so the layer is hidden
 * from assistive tech and never takes a click.
 */
export function FloaterLayer({ floaters }: { floaters: Floater[] }) {
  const bubbles = floaters.filter((f) => f.kind === "chat").slice(-3);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {floaters
        .filter((f) => f.kind === "react")
        .map((f) => (
          <span
            key={f.id}
            className="party-float absolute bottom-[12%] text-[clamp(22px,5cqw,44px)] leading-none drop-shadow"
            style={{ left: `${f.x}%` }}
          >
            {f.text}
          </span>
        ))}
      <div className="absolute bottom-3 left-3 flex max-w-[70%] flex-col items-start gap-1.5">
        {bubbles.map((f) => (
          <p
            key={f.id}
            className="party-bubble max-w-full truncate rounded-2xl bg-party-stage/75 px-3 py-1.5 text-[clamp(11px,2cqw,15px)] text-party-stage-ink shadow"
          >
            <b className="mr-1.5">{f.name}</b>
            {f.text}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Subtitles over the picture, sized to the stage rather than the window, so
 * they are as legible in a small player as they are full screen.
 */
export function SubtitleOverlay({ text, raised }: { text: string; raised: boolean }) {
  if (!text) return null;
  return (
    <div
      className={cx(
        "pointer-events-none absolute inset-x-0 flex justify-center px-[6%]",
        raised ? "bottom-[22%]" : "bottom-[7%]",
      )}
    >
      <p
        // Polite: a screen reader user hears each line without it interrupting.
        aria-live="polite"
        className="whitespace-pre-line rounded-lg bg-party-stage/75 px-[0.6em] py-[0.25em] text-center text-[clamp(13px,3.4cqw,34px)] font-semibold leading-snug text-party-stage-ink"
      >
        {text}
      </p>
    </div>
  );
}

/**
 * Music has no picture, so it gets one: the title under a gently moving
 * equaliser while it plays, which stops (and holds still under reduced
 * motion) when it doesn't.
 */
export function MusicVisual({ title, playing }: { title: string; playing: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-party-stage p-4 text-party-stage-ink">
      <div className="flex min-w-0 flex-col items-center gap-3 text-center">
        <span className="grid size-[clamp(48px,14cqw,96px)] place-items-center rounded-full bg-party-stage-ink/10">
          <MusicNoteIcon size={36} />
        </span>
        <div className={cx("party-eq flex h-8 items-end gap-1", !playing && "[&>span]:[animation-play-state:paused]")}>
          {[0.1, 0.5, 0.25, 0.7, 0.35, 0.6, 0.15].map((delay, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-party-stage-ink/80"
              style={{ height: "100%", animationDelay: `${-delay}s` }}
            />
          ))}
        </div>
        <p className="line-clamp-2 max-w-[80cqw] text-[clamp(13px,3cqw,20px)] font-bold">{title}</p>
      </div>
    </div>
  );
}
