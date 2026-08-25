import type { StreamVideo } from "./types";

/**
 * Turn a YouTube results page into plain video records.
 *
 * YouTube has no free, key-less search API, but every results page ships the
 * data the page is built from as a JSON blob (`ytInitialData`) inside a script
 * tag. This module reads that blob and keeps only the handful of fields a card
 * shows. It runs server-side in `/api/streams`, where there is no DOMParser, so
 * everything here is string and object work with no DOM and no dependencies.
 *
 * The blob is someone else's internal shape, so every read is defensive: a field
 * that moved, changed type or vanished costs that one field, never a crash. A
 * result missing the two things that make it playable — an id and a title — is
 * dropped instead of being rendered as an empty card.
 */

/* ----------------------------- extraction ------------------------------- */

/**
 * Slice the balanced `{...}` starting at `start`.
 *
 * A non-greedy regex is not enough here: the payload contains `};` inside string
 * values (titles, descriptions), so matching up to the first `};</script>`
 * truncates it. Counting braces while tracking string state is what makes the
 * boundary exact.
 */
function sliceBalanced(src: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** Parse the `ytInitialData` blob out of a results page, or null if absent. */
export function extractInitialData(html: string): unknown | null {
  const marker = html.indexOf("ytInitialData");
  if (marker === -1) return null;
  const start = html.indexOf("{", marker);
  if (start === -1) return null;

  const json = sliceBalanced(html, start);
  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* ------------------------------- reading -------------------------------- */

type Node = Record<string, unknown>;

const isNode = (v: unknown): v is Node => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Every value stored under `key`, anywhere in the tree, in document order.
 *
 * The results list is nested differently depending on whether the page returned
 * a plain list, a shelf, or an ad-carrying section, so walking for the renderer
 * itself is more durable than following a fixed path through the wrappers.
 */
function collect(root: unknown, key: string, limit: number): unknown[] {
  const out: unknown[] = [];

  const walk = (node: unknown): void => {
    if (out.length >= limit) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!isNode(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (out.length >= limit) return;
      if (k === key) out.push(v);
      else walk(v);
    }
  };

  walk(root);
  return out;
}

/**
 * Flatten one of YouTube's two text shapes - `{simpleText}` or `{runs:[{text}]}`
 * - into a string. Anything else reads as empty.
 */
function text(value: unknown): string {
  if (!isNode(value)) return "";
  if (typeof value.simpleText === "string") return value.simpleText;
  if (Array.isArray(value.runs)) {
    return value.runs
      .map((run) => (isNode(run) && typeof run.text === "string" ? run.text : ""))
      .join("")
      .trim();
  }
  return "";
}

/** The channel id behind a byline run, when the payload carries one. */
function bylineChannelId(byline: unknown): string | null {
  if (!isNode(byline) || !Array.isArray(byline.runs)) return null;
  for (const run of byline.runs) {
    if (!isNode(run)) continue;
    const endpoint = isNode(run.navigationEndpoint) ? run.navigationEndpoint : null;
    const browse = endpoint && isNode(endpoint.browseEndpoint) ? endpoint.browseEndpoint : null;
    const id = browse?.browseId;
    if (typeof id === "string" && id.startsWith("UC")) return id;
  }
  return null;
}

/**
 * Whether a result is live right now.
 *
 * Checked two ways because YouTube marks it in two places and not always both:
 * a `LIVE` metadata badge beside the title, and the view count reading
 * "N watching" rather than "N views".
 */
function isLive(renderer: Node): boolean {
  const badges = Array.isArray(renderer.badges) ? renderer.badges : [];
  for (const badge of badges) {
    if (!isNode(badge)) continue;
    const meta = isNode(badge.metadataBadgeRenderer) ? badge.metadataBadgeRenderer : null;
    if (!meta) continue;
    if (meta.style === "BADGE_STYLE_TYPE_LIVE_NOW") return true;
    const icon = isNode(meta.icon) ? meta.icon : null;
    if (icon?.iconType === "LIVE") return true;
  }
  return /\bwatching\b/i.test(text(renderer.viewCountText));
}

/** The context line under a card: viewers while live, views and age otherwise. */
function metaLine(renderer: Node, live: boolean): string | null {
  if (live) return text(renderer.viewCountText) || null;
  const views = text(renderer.shortViewCountText) || text(renderer.viewCountText);
  const age = text(renderer.publishedTimeText);
  const parts = [views, age].filter(Boolean);
  return parts.length ? parts.join(" \u00b7 ") : null;
}

/** Normalise one `videoRenderer`, or null when it is not something playable. */
function toVideo(value: unknown): StreamVideo | null {
  if (!isNode(value)) return null;
  const id = value.videoId;
  if (typeof id !== "string" || !id) return null;

  const title = text(value.title);
  if (!title) return null;

  const live = isLive(value);
  const byline = value.longBylineText ?? value.ownerText ?? value.shortBylineText;

  return {
    id,
    title,
    channel: text(byline) || "YouTube",
    channelId: bylineChannelId(value.longBylineText) ?? bylineChannelId(value.ownerText),
    live,
    // A live stream has no runtime, and YouTube omits the field rather than
    // sending a zero - so an absent length is the signal, not a fallback.
    duration: live ? null : text(value.lengthText) || null,
    meta: metaLine(value, live),
  };
}

/* -------------------------------- public -------------------------------- */

/**
 * Every playable video on a results page, in the order YouTube ranked them and
 * with duplicates removed (the same video can appear in both a shelf and the
 * main list). Shorts, playlists and channels are left out: this app plays one
 * video at a time, and the other renderer types are not that.
 */
export function parseSearchResults(html: string, limit: number): StreamVideo[] {
  const data = extractInitialData(html);
  if (!data) return [];
  return videosFromData(data, limit);
}

/** The same read, from already-parsed data. Split out so it can be tested. */
export function videosFromData(data: unknown, limit: number): StreamVideo[] {
  // Over-collect a little: some renderers drop out below (no id, no title, a
  // duplicate), and asking for exactly `limit` would return short.
  const renderers = collect(data, "videoRenderer", limit * 2);
  const seen = new Set<string>();
  const videos: StreamVideo[] = [];

  for (const renderer of renderers) {
    const video = toVideo(renderer);
    if (!video || seen.has(video.id)) continue;
    seen.add(video.id);
    videos.push(video);
    if (videos.length >= limit) break;
  }
  return videos;
}
