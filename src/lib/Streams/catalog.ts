import type { StreamKind } from "./types";

/**
 * The Streams app's stations - the single source of truth for the chips the
 * Music and Live tabs offer and the YouTube search each one stands for.
 *
 * A station is only ever a saved query, never a fixed video id. Live streams end
 * and playlists get taken down, so pinning ids would leave the app full of dead
 * links within weeks; asking YouTube the same question each time means a station
 * keeps working as long as anyone is broadcasting for it.
 *
 * Imported by the client (chip labels, the default station) and by the server
 * route that runs the search, so a station id can never drift between the two.
 */

export interface Station {
  /** Stable id, used in the chip bar, the query key and the `?station=` param. */
  id: string;
  /** Chip label - one or two words, sized to fit a chip on a 360px screen. */
  label: string;
  /** What is actually asked of YouTube. */
  query: string;
}

/**
 * Music stations. Deliberately broad and long-running - genres and language
 * scenes rather than individual artists - so the same chip is still worth
 * tapping in a year.
 */
export const MUSIC_STATIONS: Station[] = [
  { id: "lofi", label: "Lo-fi", query: "lofi hip hop radio beats to relax study to" },
  { id: "hits", label: "Top hits", query: "top hits playlist" },
  { id: "bollywood", label: "Bollywood", query: "bollywood hit songs playlist" },
  { id: "malayalam", label: "Malayalam", query: "malayalam hit songs playlist" },
  { id: "tamil", label: "Tamil", query: "tamil hit songs playlist" },
  { id: "chill", label: "Chill", query: "chill music mix" },
  { id: "instrumental", label: "Instrumental", query: "instrumental study music" },
  { id: "classical", label: "Classical", query: "classical music playlist" },
  { id: "jazz", label: "Jazz", query: "jazz music playlist" },
  { id: "rock", label: "Rock", query: "rock classics playlist" },
  { id: "edm", label: "EDM", query: "edm party mix" },
  { id: "devotional", label: "Devotional", query: "devotional songs playlist" },
];

/**
 * Live stations - things that are genuinely broadcast around the clock, so the
 * tab is rarely empty whatever hour it is opened at.
 */
export const LIVE_STATIONS: Station[] = [
  { id: "radio", label: "Music radio", query: "music radio" },
  { id: "lofi", label: "Lo-fi radio", query: "lofi hip hop radio" },
  { id: "news", label: "World news", query: "world news" },
  { id: "india", label: "India news", query: "india news" },
  { id: "malayalam", label: "Malayalam news", query: "malayalam news" },
  { id: "sports", label: "Sports", query: "sports" },
  { id: "nature", label: "Nature", query: "relaxing nature scenery" },
  { id: "space", label: "Space", query: "nasa earth from space" },
  { id: "study", label: "Study with me", query: "study with me" },
  { id: "gaming", label: "Gaming", query: "gaming" },
];

export const DEFAULT_MUSIC_STATION = MUSIC_STATIONS[0].id;
export const DEFAULT_LIVE_STATION = LIVE_STATIONS[0].id;

/** Chip ids in bar order, so a panel animates in from the side its chip sits on. */
export const MUSIC_STATION_ORDER = MUSIC_STATIONS.map((s) => s.id);
export const LIVE_STATION_ORDER = LIVE_STATIONS.map((s) => s.id);

/** Look a station up within one tab's set. */
export function stationById(kind: Exclude<StreamKind, "video">, id: string): Station | undefined {
  return (kind === "live" ? LIVE_STATIONS : MUSIC_STATIONS).find((s) => s.id === id);
}

/**
 * YouTube's own result filters, as the opaque `sp` parameter its results page
 * uses. `music` narrows to videos (so a channel or a playlist page never lands
 * in a grid of playable cards) and `live` narrows to broadcasts happening now.
 * `video` is an unfiltered search - what the Search tab sends unless asked
 * otherwise.
 */
export const KIND_FILTERS: Record<StreamKind, string> = {
  music: "EgIQAQ%3D%3D",
  live: "EgJAAQ%3D%3D",
  video: "",
};

/** Longest query the route will run - a guard on what reaches YouTube. */
export const MAX_QUERY_LENGTH = 120;

/** Results kept per search. Two full pages of the grid on a desktop width. */
export const MAX_RESULTS = 24;
