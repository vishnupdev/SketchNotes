"use client";

import { useState } from "react";
import { useStreamsStore } from "@/store/useStreamsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { thumbnailUrl, watchUrl, type StreamVideo } from "@/lib/Streams/types";
import { cx, trackSpot } from "@/lib/utils";
import { ExternalLinkIcon, PlayIcon } from "@/components/SketchNotes/atoms/icons";
import { BookmarkFilledIcon, BookmarkIcon, MusicIcon } from "@/components/Streams/atoms/icons";

/**
 * One playable result.
 *
 * The whole card is the play control - a full-bleed button layered under the
 * artwork and the title, which is what makes the large, obvious tap target a
 * phone needs. The two secondary actions (save, open on YouTube) sit above it in
 * the stacking order rather than nested inside it, because a button inside a
 * button is invalid markup and breaks keyboard traversal.
 *
 * The thumbnail is a remote request, so it is skipped entirely with no
 * connection or on a metered or 2g-class link, and a load that fails anyway
 * falls back to the same placeholder rather than a broken image - the card keeps
 * its shape either way, so nothing shifts (rule #7).
 */
export function VideoCard({ video }: { video: StreamVideo }) {
  const play = useStreamsStore((s) => s.play);
  const toggleSaved = useStreamsStore((s) => s.toggleSaved);
  const nowPlayingId = useStreamsStore((s) => s.nowPlaying?.id);
  const saved = useStreamsStore((s) => s.saved.some((v) => v.id === video.id));

  const { online, slow } = useNetworkStatus();
  const [artBroken, setArtBroken] = useState(false);
  const art = !online || slow || artBroken ? null : thumbnailUrl(video.id);
  const playing = nowPlayingId === video.id;

  return (
    <article
      onPointerMove={trackSpot}
      className={cx(
        "hover-lift hover-spot group relative flex flex-col overflow-hidden rounded-2xl border bg-panel",
        playing ? "border-accent" : "border-border hover:border-accent",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-paper">
        {art ? (
          /* Plain <img>: the size is fixed by the 16:9 box, lazy so a grid
             below the fold costs nothing until it is scrolled to. */
          <img
            src={art}
            alt=""
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setArtBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center text-ink-soft" aria-hidden>
            <MusicIcon size={26} />
          </span>
        )}

        {video.live ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-on-accent">
            <span aria-hidden className="size-1.5 rounded-full bg-on-accent motion-safe:animate-pulse" />
            Live
          </span>
        ) : (
          video.duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-paper/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text">
              {video.duration}
            </span>
          )
        )}

        <span
          aria-hidden
          className={cx(
            "absolute inset-0 grid place-items-center bg-paper/45 transition-opacity",
            playing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <span className="grid size-12 place-items-center rounded-full bg-accent text-on-accent shadow-panel">
            <PlayIcon size={22} />
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug text-text">
          {video.title}
        </h3>
        <p className="truncate text-[12.5px] font-semibold text-accent">{video.channel}</p>
        {video.meta && <p className="mt-auto truncate text-[11.5px] text-ink-soft">{video.meta}</p>}
      </div>

      {/* The card-wide play target. Last in the flow so it layers over the
          artwork and text, and below the two action buttons. */}
      <button
        type="button"
        onClick={() => play(video)}
        aria-label={`Play ${video.title} from ${video.channel}`}
        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      <div className="absolute right-2 top-2 z-10 flex gap-1.5">
        <button
          type="button"
          onClick={() => toggleSaved(video)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${video.title} from saved` : `Save ${video.title}`}
          title={saved ? "Saved" : "Save"}
          className={cx(
            "grid size-8 place-items-center rounded-full border border-border bg-paper/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            saved ? "text-accent" : "text-ink-soft hover:text-accent",
          )}
        >
          {saved ? <BookmarkFilledIcon size={15} /> : <BookmarkIcon size={15} />}
        </button>
        <a
          href={watchUrl(video.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${video.title} on YouTube`}
          title="Open on YouTube"
          className="grid size-8 place-items-center rounded-full border border-border bg-paper/90 text-ink-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ExternalLinkIcon size={14} />
        </a>
      </div>
    </article>
  );
}
