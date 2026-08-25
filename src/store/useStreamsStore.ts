"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import {
  DEFAULT_LIVE_STATION,
  DEFAULT_MUSIC_STATION,
  LIVE_STATIONS,
  MUSIC_STATIONS,
} from "@/lib/Streams/catalog";
import type { StreamKind, StreamVideo } from "@/lib/Streams/types";

const SAVED_KEY = "sknotes:streams:saved";
const RECENT_KEY = "sknotes:streams:recent";
const PREFS_KEY = "sknotes:streams:prefs";

/** A short trail of what was played, not a listening history. */
const MAX_RECENT = 24;
/** Enough for a personal shortlist; past this the tab stops being scannable. */
const MAX_SAVED = 60;

export type StreamsTab = "music" | "live" | "search" | "library";

interface StreamsPrefs {
  musicStation: string;
  liveStation: string;
  /** Which filter the Search tab last used. */
  searchKind: StreamKind;
}

const DEFAULT_PREFS: StreamsPrefs = {
  musicStation: DEFAULT_MUSIC_STATION,
  liveStation: DEFAULT_LIVE_STATION,
  searchKind: "video",
};

interface StreamsState extends StreamsPrefs {
  tab: StreamsTab;
  /** What the Search tab has been asked for; empty until a search is submitted. */
  query: string;
  /** The video the player is showing, or null when nothing is playing. */
  nowPlaying: StreamVideo | null;
  /** Whether the player is showing the full frame or the compact bar. */
  expanded: boolean;
  saved: StreamVideo[];
  recent: StreamVideo[];

  setTab: (tab: StreamsTab) => void;
  setMusicStation: (id: string) => void;
  setLiveStation: (id: string) => void;
  setSearchKind: (kind: StreamKind) => void;
  setQuery: (query: string) => void;
  /** Start playing a video, and record it as recently played. */
  play: (video: StreamVideo) => void;
  stop: () => void;
  setExpanded: (expanded: boolean) => void;
  /** Add to, or remove from, the saved list. */
  toggleSaved: (video: StreamVideo) => void;
  isSaved: (id: string) => boolean;
  clearRecent: () => void;
  /** Adopt saved list, recents and preferences after mount (avoids SSR mismatch). */
  hydrate: () => void;
}

/** Shape-check one stored video; anything malformed is dropped, not repaired. */
function parseVideo(raw: unknown): StreamVideo | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<StreamVideo>;
  if (typeof v.id !== "string" || !v.id || typeof v.title !== "string") return null;
  return {
    id: v.id,
    title: v.title,
    channel: typeof v.channel === "string" ? v.channel : "YouTube",
    channelId: typeof v.channelId === "string" ? v.channelId : null,
    live: v.live === true,
    duration: typeof v.duration === "string" ? v.duration : null,
    meta: typeof v.meta === "string" ? v.meta : null,
  };
}

function parseList(raw: string | null, max: number): StreamVideo[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map(parseVideo)
      .filter((v): v is StreamVideo => v !== null)
      .slice(0, max);
  } catch {
    return null;
  }
}

const hasStation = (list: { id: string }[], id: unknown): id is string =>
  typeof id === "string" && list.some((s) => s.id === id);

/**
 * Streams app state: which tab and station are showing, what is playing, and the
 * two lists worth keeping between visits.
 *
 * Only ids and titles are stored - never anything about *when* something was
 * watched beyond its position in a short list - and it stays on the device like
 * everything else in the workspace, clearable from the app itself.
 */
export const useStreamsStore = create<StreamsState>((set, get) => ({
  ...DEFAULT_PREFS,
  tab: "music",
  query: "",
  nowPlaying: null,
  expanded: true,
  saved: [],
  recent: [],

  setTab: (tab) => set({ tab }),
  setMusicStation: (musicStation) => {
    set({ musicStation });
    persistPrefs(get());
  },
  setLiveStation: (liveStation) => {
    set({ liveStation });
    persistPrefs(get());
  },
  setSearchKind: (searchKind) => {
    set({ searchKind });
    persistPrefs(get());
  },
  setQuery: (query) => set({ query }),

  // Playing something always opens the frame: a compact bar left over from the
  // last track would hide the video that was just asked for.
  play: (video) => {
    const recent = [video, ...get().recent.filter((v) => v.id !== video.id)].slice(0, MAX_RECENT);
    set({ nowPlaying: video, expanded: true, recent });
    void sSet(RECENT_KEY, JSON.stringify(recent));
  },
  stop: () => set({ nowPlaying: null }),
  setExpanded: (expanded) => set({ expanded }),

  toggleSaved: (video) => {
    const saved = get().saved;
    const next = saved.some((v) => v.id === video.id)
      ? saved.filter((v) => v.id !== video.id)
      : [video, ...saved].slice(0, MAX_SAVED);
    set({ saved: next });
    void sSet(SAVED_KEY, JSON.stringify(next));
  },
  isSaved: (id) => get().saved.some((v) => v.id === id),

  clearRecent: () => {
    set({ recent: [] });
    void sSet(RECENT_KEY, "[]");
  },

  hydrate: async () => {
    const [rawSaved, rawRecent, rawPrefs] = await Promise.all([
      sGet(SAVED_KEY),
      sGet(RECENT_KEY),
      sGet(PREFS_KEY),
    ]);

    const saved = parseList(rawSaved, MAX_SAVED);
    if (saved) set({ saved });
    const recent = parseList(rawRecent, MAX_RECENT);
    if (recent) set({ recent });

    if (rawPrefs) {
      try {
        const p = JSON.parse(rawPrefs) as Partial<StreamsPrefs>;
        set({
          // A station that has since been retired falls back to the default
          // rather than leaving the tab pointed at a chip that isn't there.
          musicStation: hasStation(MUSIC_STATIONS, p.musicStation)
            ? p.musicStation
            : DEFAULT_PREFS.musicStation,
          liveStation: hasStation(LIVE_STATIONS, p.liveStation)
            ? p.liveStation
            : DEFAULT_PREFS.liveStation,
          searchKind:
            p.searchKind === "music" || p.searchKind === "live" || p.searchKind === "video"
              ? p.searchKind
              : DEFAULT_PREFS.searchKind,
        });
      } catch {
        /* corrupt value - keep the defaults */
      }
    }
  },
}));

function persistPrefs(s: StreamsState) {
  const prefs: StreamsPrefs = {
    musicStation: s.musicStation,
    liveStation: s.liveStation,
    searchKind: s.searchKind,
  };
  void sSet(PREFS_KEY, JSON.stringify(prefs));
}
