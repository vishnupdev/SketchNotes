"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { createYouTubePlayer, YT_STATE, youtubeError, type YTPlayer } from "@/lib/WatchParty/player";

/** Browsers name the capture method differently (Firefox prefixes it). */
type Capturable = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

const store = () => useWatchPartyStore.getState();

/*
 * The players below are deliberately bare: no native controls (the room's own
 * transport drives them, so one person cannot pause only themselves) and no
 * caption track, because subtitles are drawn by the stage from data the host
 * sends — there is no track file to attach.
 */

/**
 * A `<video>` element — a media link, a host's file, or a guest's own copy.
 *
 * On the host, a file is also *captured* as it plays and handed to the room as
 * the stream guests watch; the capture follows the element, so pausing or
 * seeking the host's player is what every streaming guest sees.
 */
export function ElementPlayer({
  src,
  capture,
  onElement,
}: {
  src: string;
  /** Stream this element to guests (the host playing one of its files). */
  capture: boolean;
  onElement: (el: HTMLVideoElement | null) => void;
}) {
  const role = useWatchPartyStore((s) => s.role);
  const elRef = useRef<HTMLVideoElement | null>(null);
  const captured = useRef<MediaStream | null>(null);

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      elRef.current = el;
      onElement(el);
    },
    [onElement],
  );

  // Whatever this element was streaming stops with it.
  useEffect(() => {
    if (!capture) return;
    return () => {
      captured.current = null;
      store().setOutgoing(null);
    };
  }, [capture]);

  const startCapture = () => {
    const el = elRef.current as Capturable | null;
    if (!capture || !el || role !== "host") return;
    if (!captured.current) {
      const stream = el.captureStream?.() ?? el.mozCaptureStream?.();
      if (!stream) {
        store().notify("This browser can't stream a file to guests. They can play their own copy instead.");
        return;
      }
      captured.current = stream;
      // A capture swaps its tracks when the element's source settles; the room
      // is told each time so guests always get the live ones.
      const refresh = () => store().setOutgoing(stream);
      stream.addEventListener("addtrack", refresh);
      stream.addEventListener("removetrack", refresh);
    }
    store().setOutgoing(captured.current);
  };

  return (
    <video
      ref={setRef}
      src={src}
      playsInline
      preload="auto"
      className="size-full bg-party-stage object-contain"
      onLoadedMetadata={(e) => {
        const el = e.currentTarget;
        if (role === "host") {
          const patch: { duration?: number; audio?: boolean } = {};
          if (Number.isFinite(el.duration) && el.duration > 0) patch.duration = el.duration;
          if (el.videoWidth === 0) patch.audio = true;
          store().patchNow(patch);
        }
        startCapture();
      }}
      onPlaying={startCapture}
      onEnded={() => {
        if (role === "host") store().hostEnded();
      }}
      onError={() => {
        if (role === "host") store().hostBroken("it couldn't be played in this browser");
        else store().notify("This couldn't be played on this device.");
      }}
    />
  );
}

/**
 * YouTube's own embed, driven through its API. A transparent sheet covers it so
 * a tap on the video cannot pause one person's copy behind the room's back —
 * the room's transport is the only way to move it.
 */
export function YouTubePlayer({
  videoId,
  onPlayer,
}: {
  videoId: string;
  onPlayer: (player: YTPlayer | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = box.current;
    if (!container) return;
    let player: YTPlayer | null = null;
    let cancelled = false;

    const learnTitle = (p: YTPlayer) => {
      if (store().role !== "host") return;
      const title = p.getVideoData?.()?.title;
      if (title && store().room?.now?.title === "YouTube video") store().patchNow({ title });
    };

    createYouTubePlayer(container, videoId, {
      onReady: (event) => {
        if (cancelled) return;
        player = event.target;
        onPlayer(event.target);
        learnTitle(event.target);
      },
      onStateChange: (event) => {
        if (store().role !== "host") return;
        if (event.data === YT_STATE.ENDED) store().hostEnded();
        if (event.data === YT_STATE.PLAYING) learnTitle(event.target);
      },
      onError: (event) => {
        const reason = youtubeError(event.data);
        if (store().role === "host") store().hostBroken(reason);
        else store().notify(`This video can't play here — ${reason}.`);
      },
    })
      .then((p) => {
        player = p;
        if (cancelled) p.destroy();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      onPlayer(null);
      try {
        player?.destroy();
      } catch {
        /* already gone with its iframe */
      }
      container.replaceChildren();
    };
  }, [videoId, onPlayer]);

  return (
    <div className="relative size-full bg-party-stage">
      <div ref={box} className="size-full [&>iframe]:size-full [&>iframe]:border-0" />
      <div aria-hidden className="absolute inset-0" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-party-stage-ink">
          YouTube couldn&apos;t be reached. YouTube videos need an internet connection.
        </p>
      )}
    </div>
  );
}

/**
 * The host's stream, as a guest watches it — a file the host is playing, or a
 * screen the host is sharing. The picture arrives over the room's connection,
 * so there is nothing to seek here; the host's player is the one that moves.
 */
export function StreamPlayer({ stream, onElement }: { stream: MediaStream | null; onElement: (el: HTMLVideoElement | null) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    onElement(el);
    const track = stream?.getVideoTracks()[0] ?? null;
    const audio = stream?.getAudioTracks()[0] ?? null;
    // A track is "muted" until the host actually sends something down it.
    const update = () => setWaiting(!(track && !track.muted) && !(audio && !audio.muted));
    update();
    track?.addEventListener("mute", update);
    track?.addEventListener("unmute", update);
    audio?.addEventListener("mute", update);
    audio?.addEventListener("unmute", update);
    if (stream) {
      el.play().catch((error: unknown) => {
        if ((error as { name?: string } | null)?.name === "NotAllowedError") store().setNeedsTap(true);
      });
    }
    store().reportSync(null, false, "stream");
    return () => {
      track?.removeEventListener("mute", update);
      track?.removeEventListener("unmute", update);
      audio?.removeEventListener("mute", update);
      audio?.removeEventListener("unmute", update);
      onElement(null);
    };
  }, [stream, onElement]);

  return (
    <div className="relative size-full bg-party-stage">
      <video ref={ref} playsInline autoPlay className="size-full object-contain" />
      {waiting && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-party-stage-ink/85">
          {stream ? "Waiting for the host's picture…" : "Connecting to the host's stream…"}
        </p>
      )}
    </div>
  );
}

/** The host's own view of the screen it is sharing — muted, so it never echoes. */
export function ScreenPreview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
    store().reportSync(null, false, "stream");
  }, [stream]);
  return <video ref={ref} muted playsInline autoPlay className="size-full bg-party-stage object-contain" />;
}
