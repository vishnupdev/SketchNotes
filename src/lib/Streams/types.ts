/**
 * Shared vocabulary for the Streams app — the shape a YouTube result takes once
 * the server route has normalised it. Imported by the route, the client data
 * layer and every component, so a field is described in exactly one place.
 */

/** What a search is asking for, which is also which YouTube filter is applied. */
export type StreamKind = "music" | "live" | "video";

/** One playable result. Everything here is display-ready — no nested renderers. */
export interface StreamVideo {
  /** YouTube video id — the key, and what the embed plays. */
  id: string;
  title: string;
  /** Channel name, e.g. "Lofi Girl". */
  channel: string;
  /** Channel id, so the card can link to the channel. Null when absent. */
  channelId: string | null;
  /** Whether this is a live broadcast rather than a recording. */
  live: boolean;
  /** Runtime as YouTube writes it ("3:52"), or null for a live stream. */
  duration: string | null;
  /** One context line: "12,935 watching", or "1.2M views · 3 years ago". */
  meta: string | null;
}

/** Shape of a successful `/api/streams` response. */
export interface StreamSearchResponse {
  query: string;
  kind: StreamKind;
  videos: StreamVideo[];
}

/**
 * Thumbnail for a video id.
 *
 * Derived rather than parsed out of the search payload: YouTube's own result
 * thumbnails carry a signed, expiring query string that differs on every
 * request, so caching them offline is pointless and they are far larger than a
 * card needs. `mqdefault` is a fixed 320x180 URL that exists for every video,
 * which is exactly one cache entry per video and the size the grid draws.
 */
export const thumbnailUrl = (id: string): string => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** Watch page for a video, for the "open on YouTube" action. */
export const watchUrl = (id: string): string => `https://www.youtube.com/watch?v=${id}`;

/**
 * The privacy-enhanced embed URL the player loads. `youtube-nocookie.com` is
 * YouTube's own domain for embeds that must not set tracking cookies until
 * playback starts, which is the right default for a workspace that stores
 * nothing about you elsewhere.
 */
export const embedUrl = (id: string): string =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
