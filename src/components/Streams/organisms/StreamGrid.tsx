"use client";

import type { ReactNode } from "react";
import { useStreams } from "@/hooks/useStreams";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { OfflineNotice } from "@/components/Offline/OfflineNotice";
import { VideoCard } from "@/components/Streams/molecules/VideoCard";
import { LiveIcon } from "@/components/Streams/atoms/icons";
import type { StreamKind } from "@/lib/Streams/types";

/** Cards shown while the first request for a query is in flight. */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-panel">
          <div className="aspect-video w-full animate-pulse bg-ink-soft/15" />
          <div className="flex flex-col gap-2.5 p-3.5">
            <div className="h-4 w-11/12 animate-pulse rounded bg-ink-soft/20" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-ink-soft/15" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StreamGridProps {
  /** What to ask YouTube for. Empty means "nothing asked yet". */
  query: string;
  kind: StreamKind;
  /** Shown in place of a grid before the first search on the Search tab. */
  idle?: ReactNode;
}

/**
 * The results for one station or search: its own loading, offline, error and
 * empty states, so the panels above it stay about layout.
 *
 * Streaming is the one thing in the workspace that cannot happen without a
 * connection - the video itself comes from YouTube - so the offline state says
 * that plainly rather than presenting it as a failure.
 */
export function StreamGrid({ query, kind, idle }: StreamGridProps) {
  const { data, isLoading, isError, refetch } = useStreams(query, kind);
  const { online } = useNetworkStatus();

  if (!query.trim()) return <>{idle ?? null}</>;
  if (isLoading) return <GridSkeleton />;

  if (isError && !online) {
    return (
      <OfflineNotice
        title="This needs a connection"
        action={{ label: "Try again", onClick: () => void refetch() }}
      >
        Streams come from YouTube, so both finding and playing them need a live network. Stations
        you opened while online still list what they found.
      </OfflineNotice>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <LiveIcon size={32} className="text-ink-soft" />
        <p className="text-[14px] font-semibold">Couldn&apos;t reach YouTube.</p>
        <p className="max-w-[320px] text-[12.5px] text-ink-soft">
          The search didn&apos;t come back. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <LiveIcon size={32} className="text-ink-soft" />
        <p className="text-[14px] font-semibold">
          {kind === "live" ? "Nothing is live for this right now." : "No results for this."}
        </p>
        <p className="max-w-[320px] text-[12.5px] text-ink-soft">
          {kind === "live"
            ? "Live channels come and go through the day — try another station or check back later."
            : "Try another station, or search for something more specific."}
        </p>
      </div>
    );
  }

  return (
    <>
      {!online && (
        <OfflineNotice title="Offline" variant="inline" className="mb-3.5">
          this is the last list saved on your device, and playing needs a connection
        </OfflineNotice>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </>
  );
}
