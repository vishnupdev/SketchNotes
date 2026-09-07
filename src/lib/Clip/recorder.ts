/**
 * Recording the screen or a camera, and the decisions around it.
 *
 * `MediaRecorder` does the encoding; what needs care is everything either side
 * of it, and that is what lives here — deliberately as plain functions with the
 * browser passed in, so the parts that decide *what* gets recorded can be
 * tested without a camera.
 *
 * The container question is the awkward one. No format is supported
 * everywhere: Chromium records WebM and Safari records MP4, and asking for the
 * wrong one throws or, worse, silently produces a file that will not play.
 * {@link pickMimeType} walks a preference list against the browser's own
 * `isTypeSupported`, and the app shows which one it landed on rather than
 * pretending the choice wasn't made.
 *
 * The other decision is that **recordings are not persisted.** A minute of
 * 1080p screen capture is tens of megabytes; keeping clips in the workspace's
 * storage would exhaust the origin's quota in a handful of takes and evict
 * other apps' data to do it. So a clip lives in memory until it is saved, the
 * app says so plainly, and only the *settings* are remembered.
 */

/** What is being captured. */
export type ClipSource = "screen" | "camera" | "both";

export const CLIP_SOURCES: ClipSource[] = ["screen", "camera", "both"];

export const SOURCE_LABELS: Record<ClipSource, string> = {
  screen: "Screen",
  camera: "Camera",
  both: "Screen + camera",
};

/** Where the audio comes from. Screen audio is not offered on every platform. */
export type AudioSource = "none" | "mic" | "system" | "both";

export interface ClipSettings {
  source: ClipSource;
  audio: AudioSource;
  /** Frames a second asked of the capture. */
  fps: number;
  /** Cap on the long edge; 0 means "whatever the source is". */
  maxHeight: number;
  /**
   * Seconds counted down after permission is granted, before recording starts.
   * 0 records immediately.
   */
  countdown: number;
}

export const CLIP_DEFAULTS: ClipSettings = {
  source: "screen",
  audio: "mic",
  fps: 30,
  maxHeight: 1080,
  countdown: 3,
};

export const FPS_CHOICES = [15, 24, 30, 60] as const;
export const HEIGHT_CHOICES = [0, 720, 1080, 1440] as const;
export const COUNTDOWN_CHOICES = [0, 3, 5, 10] as const;

/**
 * Clamp a stored or typed countdown to something sensible.
 *
 * The upper bound matters: the countdown runs *after* the browser's permission
 * prompt is answered, so a minute of it would look exactly like a recorder that
 * had silently failed to start.
 */
export const clampCountdown = (seconds: number): number =>
  Number.isFinite(seconds) ? Math.max(0, Math.min(10, Math.round(seconds))) : 0;

/**
 * Container and codec preferences, best first.
 *
 * VP9 before VP8 for the quality at a given size; H.264 in MP4 before bare MP4
 * because Safari needs the explicit codec string; plain `video/webm` last as
 * the "surely this" fallback.
 */
export const MIME_PREFERENCES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm",
] as const;

/** How a mime type is described in the UI. */
export function describeMime(mime: string): string {
  if (mime.includes("vp9")) return "WebM · VP9";
  if (mime.includes("vp8")) return "WebM · VP8";
  if (mime.includes("avc1") || mime.startsWith("video/mp4")) return "MP4 · H.264";
  if (mime.startsWith("video/webm")) return "WebM";
  return mime;
}

/** The file extension for a recorded mime type. */
export const extensionFor = (mime: string): string =>
  mime.startsWith("video/mp4") ? "mp4" : "webm";

/**
 * The best supported container, or null if the browser records none of them.
 *
 * `isSupported` is injected so this can be tested against each browser's answer
 * rather than only the one running the tests.
 */
export function pickMimeType(isSupported: (mime: string) => boolean): string | null {
  for (const mime of MIME_PREFERENCES) {
    try {
      if (isSupported(mime)) return mime;
    } catch {
      // A browser that throws from isTypeSupported is telling us "no".
    }
  }
  return null;
}

/** The recorder available in this browser, if any. */
export function supportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return pickMimeType((mime) => MediaRecorder.isTypeSupported(mime));
}

/** What this browser can capture at all. */
export interface ClipSupport {
  recorder: boolean;
  screen: boolean;
  camera: boolean;
  mime: string | null;
}

export function detectSupport(): ClipSupport {
  const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
  return {
    recorder: typeof MediaRecorder !== "undefined",
    // `getDisplayMedia` is absent on iOS Safari altogether — the app has to say
    // that rather than offer a button that does nothing.
    screen: typeof media?.getDisplayMedia === "function",
    camera: typeof media?.getUserMedia === "function",
    mime: supportedMimeType(),
  };
}

/** Constraints for the screen capture, from the settings. */
export function displayConstraints(settings: ClipSettings): DisplayMediaStreamOptions {
  return {
    video: {
      frameRate: { ideal: settings.fps },
      ...(settings.maxHeight > 0 ? { height: { max: settings.maxHeight } } : {}),
    },
    // Screen audio is a Chromium-on-desktop feature; asking for it where it is
    // unavailable is harmless, and the track simply doesn't arrive.
    audio: settings.audio === "system" || settings.audio === "both",
  };
}

/** Constraints for the camera and microphone. */
export function cameraConstraints(settings: ClipSettings, facing: "user" | "environment"): MediaStreamConstraints {
  return {
    video: {
      facingMode: facing,
      frameRate: { ideal: settings.fps },
      ...(settings.maxHeight > 0 ? { height: { ideal: settings.maxHeight } } : {}),
    },
    audio: settings.audio === "mic" || settings.audio === "both",
  };
}

/** A recorded clip, held in memory until it is saved. */
export interface Clip {
  id: string;
  /** The recording itself. */
  blob: Blob;
  /** Object URL for playback — revoked when the clip is discarded. */
  url: string;
  mime: string;
  bytes: number;
  /** Milliseconds, measured rather than read off the file. */
  duration: number;
  source: ClipSource;
  /** Pixel size of the video track, where the browser reported it. */
  width: number;
  height: number;
  recorded: number;
  /** True if an audio track was actually captured, not merely requested. */
  hasAudio: boolean;
}

/** `1:04` / `12:03` / `1:02:03`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * A filename that sorts chronologically and is legal everywhere.
 *
 * Local time, not UTC: a clip recorded at nine in the evening should be named
 * for the evening it was recorded in. Colons are illegal in Windows filenames
 * and are dropped rather than substituted.
 */
export function clipFilename(clip: Pick<Clip, "source" | "recorded" | "mime">): string {
  const at = new Date(clip.recorded);
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = [
    at.getFullYear(),
    pad(at.getMonth() + 1),
    pad(at.getDate()),
    "-",
    pad(at.getHours()),
    pad(at.getMinutes()),
    pad(at.getSeconds()),
  ].join("");
  return `clip-${clip.source}-${stamp}.${extensionFor(clip.mime)}`;
}

/** The name a still grabbed out of a clip is saved under. */
export function stillFilename(clip: Pick<Clip, "source" | "recorded">, at: number): string {
  const seconds = Math.floor(at / 1000);
  return `still-${clip.source}-${seconds}s.png`;
}

/**
 * Roughly how much a recording will weigh, in bytes a second.
 *
 * Used only to warn before a long take, and deliberately generous: telling
 * someone a ten-minute screen recording is about 300 MB before they start is
 * worth more than an exact figure afterwards.
 */
export function bytesPerSecond(settings: ClipSettings): number {
  const height = settings.maxHeight > 0 ? settings.maxHeight : 1080;
  // ~0.07 bits per pixel per frame at VP9's default quality, plus audio.
  const pixels = height * (height * (16 / 9));
  const video = (pixels * settings.fps * 0.07) / 8;
  const audio = settings.audio === "none" ? 0 : 16_000;
  return Math.round(video + audio);
}

/** What the audio setting asks for, in words. */
export const AUDIO_LABELS: Record<AudioSource, string> = {
  none: "No sound",
  mic: "Microphone",
  system: "Screen sound",
  both: "Both",
};

/**
 * Combine the tracks a recording needs into one stream.
 *
 * Screen and camera capture arrive as separate streams, and `MediaRecorder`
 * takes one — so the tracks are gathered here. Only the *first* audio track is
 * kept: a recorder given two produces a file whose second audio track most
 * players ignore, which sounds like the microphone silently failing.
 */
export function combineTracks(streams: MediaStream[]): MediaStream {
  const combined = new MediaStream();
  let audioAdded = false;

  for (const stream of streams) {
    for (const track of stream.getVideoTracks()) combined.addTrack(track);
    for (const track of stream.getAudioTracks()) {
      if (audioAdded) continue;
      combined.addTrack(track);
      audioAdded = true;
    }
  }

  return combined;
}

/** Stop every track on every stream — the only thing that turns the light off. */
export function stopStreams(streams: (MediaStream | null | undefined)[]): void {
  for (const stream of streams) {
    for (const track of stream?.getTracks() ?? []) track.stop();
  }
}
