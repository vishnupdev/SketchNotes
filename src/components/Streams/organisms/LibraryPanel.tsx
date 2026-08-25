"use client";

import { useStreamsStore } from "@/store/useStreamsStore";
import { VideoCard } from "@/components/Streams/molecules/VideoCard";
import { BookmarkIcon, LibraryIcon } from "@/components/Streams/atoms/icons";
import type { StreamVideo } from "@/lib/Streams/types";

function Section({
  title,
  blurb,
  videos,
  action,
}: {
  title: string;
  blurb: string;
  videos: StreamVideo[];
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-extrabold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">{blurb}</p>
        </div>
        {action && videos.length > 0 && (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {action.label}
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[12.5px] text-ink-soft">
          Nothing here yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * What this device has kept: the videos bookmarked from a card or the player,
 * and a short trail of what was played.
 *
 * Both lists live in this browser and nowhere else — the workspace has no
 * account and no server to sync them to — so they are also the one part of the
 * app that still shows something with no connection, even though playing from
 * it does not. Recents are a trail, not a history: two dozen entries, clearable
 * in one press.
 */
export function LibraryPanel() {
  const saved = useStreamsStore((s) => s.saved);
  const recent = useStreamsStore((s) => s.recent);
  const clearRecent = useStreamsStore((s) => s.clearRecent);

  if (saved.length === 0 && recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <LibraryIcon size={32} className="text-ink-soft" />
        <p className="text-[14px] font-semibold">Your library is empty.</p>
        <p className="max-w-[330px] text-[12.5px] text-ink-soft">
          Press <BookmarkIcon size={13} className="inline align-[-2px]" aria-hidden /> on any card to
          keep it here. Whatever you play shows up under Recent.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Saved"
        blurb="Kept on this device, and never uploaded."
        videos={saved}
      />
      <Section
        title="Recent"
        blurb="The last two dozen things you played here."
        videos={recent}
        action={{ label: "Clear", onClick: clearRecent }}
      />
    </div>
  );
}
