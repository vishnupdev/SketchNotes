"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useStreamsStore } from "@/store/useStreamsStore";
import { useStreams } from "@/hooks/useStreams";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { AppsIcon, RefreshIcon } from "@/components/SketchNotes/atoms/icons";
import { StreamsIcon } from "@/components/Streams/atoms/icons";
import { STREAMS_TAB_ORDER, StreamsTabs } from "@/components/Streams/molecules/StreamsTabs";
import { NowPlaying } from "@/components/Streams/organisms/NowPlaying";
import { StationPanel } from "@/components/Streams/organisms/StationPanel";
import { SearchPanel } from "@/components/Streams/organisms/SearchPanel";
import { LibraryPanel } from "@/components/Streams/organisms/LibraryPanel";
import { stationById } from "@/lib/Streams/catalog";
import { cx } from "@/lib/utils";

/**
 * Streams — music and live channels from YouTube, inside the workspace.
 *
 * Four sections. **Music** and **Live** are curated stations: each chip is a
 * saved search rather than a pinned video, so a station keeps working as
 * broadcasts start and end. **Search** is the same thing unconstrained, with the
 * same three filters. **Library** is what this device kept — saved videos and a
 * short trail of what was played, both stored locally and never uploaded.
 *
 * Finding is done by this site's own `/api/streams` route (the browser cannot
 * read youtube.com directly); playing is done by YouTube's own embed, on
 * YouTube's domain, so views count for the creator and their terms apply
 * unchanged. Nothing here is downloaded, proxied or re-hosted.
 *
 * The player, and only the player, is pinned to the top of the scroll: it can
 * shrink to a bar and keep playing while a long station scrolls underneath,
 * while the brand header scrolls away with the list so a phone screen is not
 * mostly chrome. Leaving the app unmounts the frame and stops the sound, so
 * music never follows you into another app.
 */
export function StreamsApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useStreamsStore((s) => s.tab);
  const setTab = useStreamsStore((s) => s.setTab);
  const hydrate = useStreamsStore((s) => s.hydrate);

  // Adopt the saved library and station choices once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Refresh acts on whatever the visible tab is showing, so the button means the
  // same thing everywhere: "ask again for this list".
  const musicStation = useStreamsStore((s) => s.musicStation);
  const liveStation = useStreamsStore((s) => s.liveStation);
  const query = useStreamsStore((s) => s.query);
  const searchKind = useStreamsStore((s) => s.searchKind);
  const { online } = useNetworkStatus();

  const visible =
    tab === "music"
      ? { query: stationById("music", musicStation)?.query ?? "", kind: "music" as const }
      : tab === "live"
        ? { query: stationById("live", liveStation)?.query ?? "", kind: "live" as const }
        : { query, kind: searchKind };

  const { isFetching, refetch } = useStreams(visible.query, visible.kind);
  const canRefresh = online && tab !== "library" && visible.query.trim().length > 0;

  return (
    <div className="flex min-h-full flex-col">
      {/* Only the player is sticky. The brand header scrolls away with the
          list: pinning both meant ~455px of a 640px-tall phone was permanently
          spoken for, and the station underneath scrolled through a sliver. The
          player alone needs no offset, so nothing hard-codes a height. */}
      <header className="border-b border-border px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<StreamsIcon size={24} />}
            name="Streams"
            tagline="music and live, straight from YouTube"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={!canRefresh}
              title={online ? "Refresh this list" : "Offline — the last saved list is shown"}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text"
            >
              <RefreshIcon size={15} className={cx(isFetching && "motion-safe:animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={openLauncher}
              title="Switch app"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
            >
              <AppsIcon size={15} />
              <span className="hidden sm:inline">Apps</span>
            </button>
          </div>
        </div>
      </header>

      <NowPlaying />

      <main className="bottom-nav-clear mx-auto w-full max-w-[900px] flex-1 px-5 pt-5">
        <NavView
          viewKey={tab}
          order={STREAMS_TAB_ORDER}
          id={`streams-panel-${tab}`}
          role="tabpanel"
        >
          {tab === "music" ? (
            <StationPanel kind="music" />
          ) : tab === "live" ? (
            <StationPanel kind="live" />
          ) : tab === "search" ? (
            <SearchPanel />
          ) : (
            <LibraryPanel />
          )}
        </NavView>
      </main>

      <StreamsTabs tab={tab} onTab={setTab} />

      <AppFooter />
    </div>
  );
}
