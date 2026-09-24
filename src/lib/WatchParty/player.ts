import { nearestRate, type PlayerEngine } from "./sync";

/**
 * One interface over the two kinds of player a room uses, so the code that
 * keeps them in step (`usePlaybackSync`) never has to know which it is holding.
 *
 * - A `<video>` element — media links, the host's files, a guest's own copy.
 * - YouTube's embed, driven through its IFrame API. The API script is loaded
 *   only when a YouTube item actually plays, from YouTube's own domain, and the
 *   player uses the privacy-enhanced `youtube-nocookie.com` host.
 */

export interface PlayerHandle {
  engine: PlayerEngine;
  time(): number;
  duration(): number | null;
  paused(): boolean;
  ended(): boolean;
  buffering(): boolean;
  /** Rejects with a `NotAllowedError` when the browser wants a tap first. */
  play(): Promise<void>;
  pause(): void;
  seek(to: number): void;
  setRate(rate: number): void;
  setVolume(volume: number, muted: boolean): void;
}

export function elementHandle(el: HTMLMediaElement): PlayerHandle {
  return {
    engine: "element",
    time: () => el.currentTime,
    duration: () => (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null),
    paused: () => el.paused,
    ended: () => el.ended,
    buffering: () => !el.paused && el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA,
    play: () => el.play(),
    pause: () => el.pause(),
    seek: (to) => {
      el.currentTime = to;
    },
    setRate: (rate) => {
      if (Math.abs(el.playbackRate - rate) > 0.001) el.playbackRate = rate;
    },
    setVolume: (volume, muted) => {
      el.volume = Math.min(1, Math.max(0, volume));
      el.muted = muted;
    },
  };
}

/* -------------------------------- YouTube -------------------------------- */

export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
  /** Not in the documented API, but present for years; read defensively. */
  getVideoData?: () => { title?: string } | undefined;
}

interface YTPlayerOptions {
  videoId: string;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number; target: YTPlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | null = null;

/** YouTube's IFrame API, loaded once and only when first needed. */
export function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  api ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      api = null;
      script.remove();
      reject(new Error("YouTube couldn't be reached."));
    };
    document.head.appendChild(script);
  });
  return api;
}

/** Make a YouTube player inside `container`, which this owns until `destroy()`. */
export async function createYouTubePlayer(
  container: HTMLElement,
  videoId: string,
  events: NonNullable<YTPlayerOptions["events"]>,
): Promise<YTPlayer> {
  const YT = await loadYouTube();
  // The API replaces the element it is given with an iframe, so it gets one
  // React knows nothing about rather than a node React might reconcile.
  const target = document.createElement("div");
  container.replaceChildren(target);
  return new YT.Player(target, {
    videoId,
    host: "https://www.youtube-nocookie.com",
    playerVars: {
      // The room's own controls drive the player; YouTube's would let one
      // person pause only themselves and fall out of step.
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      iv_load_policy: 3,
      playsinline: 1,
      origin: window.location.origin,
    },
    events,
  });
}

export function youtubeHandle(player: YTPlayer): PlayerHandle {
  const state = () => player.getPlayerState();
  return {
    engine: "youtube",
    time: () => player.getCurrentTime() || 0,
    duration: () => {
      const d = player.getDuration();
      return d > 0 ? d : null;
    },
    paused: () => state() !== YT_STATE.PLAYING && state() !== YT_STATE.BUFFERING,
    ended: () => state() === YT_STATE.ENDED,
    buffering: () => state() === YT_STATE.BUFFERING,
    play: async () => player.playVideo(),
    pause: () => player.pauseVideo(),
    seek: (to) => player.seekTo(to, true),
    setRate: (rate) => {
      const target = nearestRate(rate, player.getAvailablePlaybackRates());
      if (player.getPlaybackRate() !== target) player.setPlaybackRate(target);
    },
    setVolume: (volume, muted) => {
      player.setVolume(Math.round(Math.min(1, Math.max(0, volume)) * 100));
      if (muted) player.mute();
      else player.unMute();
    },
  };
}

/** Why YouTube refused a video, in words. */
export function youtubeError(code: number): string {
  if (code === 101 || code === 150) return "its owner doesn't allow it to be played outside YouTube";
  if (code === 100) return "it has been removed or made private";
  if (code === 2) return "the link is not a valid video";
  return "YouTube couldn't play it";
}
