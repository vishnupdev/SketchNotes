import type { MediaItem } from "./types";

/**
 * Turning what someone pasted into something the room can play.
 *
 * Two kinds of link are accepted, because only two kinds can be played *in
 * step* on every device: a YouTube video (through YouTube's own embed, on its
 * own domain) and a direct link to a media file that a `<video>` element can
 * open. Anything else — a web page, a streaming service's watch page — would
 * load on nobody's screen, so it is refused here with a reason rather than
 * queued as something that silently fails for the whole room.
 */

const VIDEO_EXT = ["mp4", "m4v", "webm", "ogv", "mov", "mkv"];
const AUDIO_EXT = ["mp3", "m4a", "aac", "wav", "flac", "ogg", "oga", "opus", "weba"];

/** An 11-character YouTube video id. */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export type ParsedLink =
  | { ok: true; kind: "youtube"; src: string; title: string }
  | { ok: true; kind: "url"; src: string; title: string; audio: boolean }
  | { ok: false; reason: string };

/** The video id in any of the shapes a YouTube link comes in, or null. */
export function youtubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID.test(id) ? id : null;
  }
  if (!YT_HOSTS.has(host)) return null;
  const v = url.searchParams.get("v");
  if (v && YT_ID.test(v)) return v;
  // /shorts/ID, /embed/ID, /live/ID, /v/ID
  const [, section, id] = url.pathname.split("/");
  if (["shorts", "embed", "live", "v"].includes(section) && id && YT_ID.test(id)) return id;
  return null;
}

/** "Holiday.Movie.2024.mp4" → "Holiday Movie 2024". */
export function titleFromName(name: string): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  const spaced = base.replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced || name;
}

const extensionOf = (path: string): string => {
  const match = /\.([A-Za-z0-9]{1,5})$/.exec(path);
  return match ? match[1].toLowerCase() : "";
};

export function parseLink(raw: string): ParsedLink {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "Paste a link first." };

  // A bare video id is what "copy video id" tools hand out.
  if (YT_ID.test(text) && !text.includes(".")) {
    return { ok: true, kind: "youtube", src: text, title: "YouTube video" };
  }

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: "That isn't a link." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "Only web links (https://…) can be played." };
  }

  const id = youtubeId(url);
  if (id) return { ok: true, kind: "youtube", src: id, title: "YouTube video" };
  if (YT_HOSTS.has(url.hostname.toLowerCase()) || url.hostname === "youtu.be") {
    return { ok: false, reason: "That YouTube link doesn't point at a single video." };
  }

  const ext = extensionOf(url.pathname);
  if (ext === "m3u8" || ext === "mpd") {
    return {
      ok: false,
      reason: "Live-stream playlists (.m3u8, .mpd) only play in some browsers, so they can't be shared in a room.",
    };
  }
  if (!VIDEO_EXT.includes(ext) && !AUDIO_EXT.includes(ext)) {
    return {
      ok: false,
      reason:
        "Paste a YouTube link, or a direct link to a video or audio file (.mp4, .webm, .mp3 …). Web pages and streaming-service links can't be played in a room.",
    };
  }

  const name = decodeURIComponent(url.pathname.split("/").pop() ?? "") || url.hostname;
  return {
    ok: true,
    kind: "url",
    src: url.toString(),
    title: titleFromName(name),
    audio: AUDIO_EXT.includes(ext),
  };
}

/** Whether a file is sound only, judged by type and then by name. */
export function isAudioFile(file: { type: string; name: string }): boolean {
  if (file.type) return file.type.startsWith("audio/");
  return AUDIO_EXT.includes(extensionOf(file.name));
}

/** Whether a picked file is worth trying in a `<video>` element at all. */
export function isMediaFile(file: { type: string; name: string }): boolean {
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return true;
  const ext = extensionOf(file.name);
  return VIDEO_EXT.includes(ext) || AUDIO_EXT.includes(ext);
}

/** 65 → "1:05", 3723 → "1:02:03". */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "–:––";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** YouTube's own still for a video — a fixed 320×180, so it can be sized up front. */
export const youtubeThumb = (id: string): string => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** A short line saying where an item comes from, for queue rows. */
export function sourceLabel(item: Pick<MediaItem, "kind" | "src" | "audio">): string {
  switch (item.kind) {
    case "youtube":
      return "YouTube";
    case "screen":
      return "Shared screen";
    case "file":
      return item.audio ? "Host's music file" : "Host's video file";
    case "url":
      try {
        return new URL(item.src).hostname.replace(/^www\./, "");
      } catch {
        return "Link";
      }
  }
}
