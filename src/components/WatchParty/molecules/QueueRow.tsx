"use client";

import type { ReactNode } from "react";
import type { MediaItem } from "@/lib/WatchParty/types";
import { formatTime, sourceLabel, youtubeThumb } from "@/lib/WatchParty/media";
import { FilmIcon, LinkIcon, MusicNoteIcon, ScreenShareIcon } from "@/components/SketchNotes/atoms/icons";

/** A small picture for a queued thing — YouTube's still, or a glyph for the kind. */
function Thumb({ item }: { item: MediaItem }) {
  if (item.kind === "youtube") {
    return (
      // YouTube serves its stills at a fixed 320×180, so the box is sized up
      // front and nothing shifts when it arrives. A remote image with no
      // optimisation to gain, hence a plain <img>.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={youtubeThumb(item.src)}
        alt=""
        width={96}
        height={54}
        loading="lazy"
        decoding="async"
        className="hidden h-[54px] w-24 flex-none rounded-lg border border-border bg-paper object-cover min-[420px]:block"
      />
    );
  }
  const Icon = item.audio ? MusicNoteIcon : item.kind === "screen" ? ScreenShareIcon : item.kind === "url" ? LinkIcon : FilmIcon;
  return (
    <span className="hidden h-[54px] w-24 flex-none place-items-center rounded-lg border border-border bg-paper text-ink-soft min-[420px]:grid">
      <Icon size={22} />
    </span>
  );
}

/** One queued, playing or played item, with whatever actions this viewer has. */
export function QueueRow({ item, actions, current = false }: { item: MediaItem; actions?: ReactNode; current?: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-2.5" aria-current={current || undefined}>
      <Thumb item={item} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{item.title}</p>
        <p className="truncate text-[11.5px] text-ink-soft">
          {sourceLabel(item)}
          {item.duration ? ` · ${formatTime(item.duration)}` : ""} · {item.addedBy}
        </p>
      </div>
      {actions && <div className="flex flex-none items-center gap-1">{actions}</div>}
    </li>
  );
}
