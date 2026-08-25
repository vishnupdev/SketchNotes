"use client";

import { useStreamsStore } from "@/store/useStreamsStore";
import { embedUrl, watchUrl } from "@/lib/Streams/types";
import { cx } from "@/lib/utils";
import { CloseIcon, ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";
import {
  BookmarkFilledIcon,
  BookmarkIcon,
  CollapseIcon,
  ExpandIcon,
} from "@/components/Streams/atoms/icons";

/**
 * The player.
 *
 * Playback is YouTube's own embed on YouTube's own domain, which is the only
 * way a web app may play a video from it: the creator's view is counted, their
 * terms apply exactly as they do on youtube.com, and this app never touches a
 * media stream. The privacy-enhanced `youtube-nocookie.com` host is used so
 * nothing is set on the device until you actually press play.
 *
 * Two sizes, one frame. Expanded, the video fills the column; collapsed, it
 * shrinks to a thumbnail beside the title so a long scroll through a station is
 * not spent looking past a video. The collapse deliberately changes only class
 * names on an unchanged element tree — moving or replacing the iframe would tear
 * down the player and stop the music, which is the one thing a minimise button
 * must never do. The frame is keyed by video id, so choosing a different track
 * *does* replace it rather than pushing an entry onto the browser's history.
 */
export function NowPlaying() {
  const video = useStreamsStore((s) => s.nowPlaying);
  const expanded = useStreamsStore((s) => s.expanded);
  const setExpanded = useStreamsStore((s) => s.setExpanded);
  const stop = useStreamsStore((s) => s.stop);
  const toggleSaved = useStreamsStore((s) => s.toggleSaved);
  const saved = useStreamsStore((s) => (video ? s.saved.some((v) => v.id === video.id) : false));

  if (!video) return null;

  const action =
    "grid size-9 flex-none place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <section
      aria-label="Now playing"
      className="border-t border-border bg-paper px-[22px] py-3"
    >
      <div className={cx("mx-auto flex max-w-[900px] gap-3", expanded ? "flex-col" : "items-center")}>
        <div
          className={cx(
            "overflow-hidden rounded-xl border border-border bg-panel",
            expanded ? "w-full" : "w-[116px] flex-none",
          )}
        >
          <div className="aspect-video w-full">
            <iframe
              key={video.id}
              src={embedUrl(video.id)}
              title={`${video.title} — ${video.channel}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full border-0"
            />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0 flex-1">
            {/* Expanded there is a whole row to spare, so the title gets two
                lines; collapsed it shares that row with the frame, and a wrap
                would push the bar taller than the thumbnail beside it. */}
            <p
              className={cx(
                "text-[13.5px] font-bold leading-snug text-text",
                expanded ? "line-clamp-2" : "truncate",
              )}
            >
              {video.title}
            </p>
            <p className="truncate text-[12px] text-ink-soft">
              {video.live && (
                <span className="mr-1.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-accent">
                  Live
                </span>
              )}
              {video.channel}
            </p>
          </div>

          <button
            type="button"
            onClick={() => toggleSaved(video)}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save this"}
            title={saved ? "Saved" : "Save"}
            className={cx(action, saved && "border-accent text-accent")}
          >
            {saved ? <BookmarkFilledIcon size={16} /> : <BookmarkIcon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? "Shrink the player" : "Open the player"}
            title={expanded ? "Shrink" : "Expand"}
            className={action}
          >
            {expanded ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
          </button>
          <a
            href={watchUrl(video.id)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open on YouTube"
            title="Open on YouTube"
            className={cx(action, "hidden sm:grid")}
          >
            <ExternalLinkIcon size={15} />
          </a>
          <button
            type="button"
            onClick={stop}
            aria-label="Stop playing"
            title="Stop"
            className={action}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
