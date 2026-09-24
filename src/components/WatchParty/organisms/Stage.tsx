"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { selectCanControl, selectSilenceLocal, useWatchPartyStore } from "@/store/useWatchPartyStore";
import { useWatchPartySync, usePlayhead } from "@/hooks/useWatchPartySync";
import { elementHandle, youtubeHandle, type YTPlayer } from "@/lib/WatchParty/player";
import { cueAt } from "@/lib/WatchParty/subtitles";
import type { MediaItem, Role } from "@/lib/WatchParty/types";
import { ElementPlayer, ScreenPreview, StreamPlayer, YouTubePlayer } from "@/components/WatchParty/molecules/Players";
import { PlayerControls } from "@/components/WatchParty/molecules/PlayerControls";
import { FloaterLayer, MusicVisual, SubtitleOverlay } from "@/components/WatchParty/molecules/StageOverlays";
import { PlayIcon, QueueIcon, UsersIcon, WatchPartyIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

type View =
  | { type: "idle" }
  | { type: "youtube"; id: string }
  | { type: "element"; src: string; capture: boolean }
  | { type: "stream" }
  | { type: "preview" };

/** Which player this device uses for what is playing. */
function viewFor(item: MediaItem | null, role: Role | null, ownUrl: string | null, fileUrl: string | null): View {
  if (!item) return { type: "idle" };
  switch (item.kind) {
    case "youtube":
      return { type: "youtube", id: item.src };
    case "url":
      return { type: "element", src: item.src, capture: false };
    case "file":
      if (role === "host") return fileUrl ? { type: "element", src: fileUrl, capture: true } : { type: "idle" };
      return ownUrl ? { type: "element", src: ownUrl, capture: false } : { type: "stream" };
    case "screen":
      return role === "host" ? { type: "preview" } : { type: "stream" };
  }
}

/**
 * The sound of what is playing here, as a stream the extra outputs can play —
 * published to the store only while at least one is chosen, since capturing a
 * player costs a decoder's worth of work for nobody.
 *
 * - A `<video>` element is captured; the capture ignores the element's own
 *   volume and mute, so the system speaker can be silenced without silencing
 *   the headphones. Only the audio tracks are kept.
 * - A stream from the host, or the host's shared screen, is already a stream.
 * - YouTube's embed plays inside its own frame and cannot be tapped at all.
 */
function useOutputTap(
  type: View["type"],
  el: HTMLVideoElement | null,
  remote: MediaStream | null,
  screen: MediaStream | null,
  active: boolean,
): MediaStream | null {
  const setTap = useWatchPartyStore((s) => s.setTap);
  const [captured, setCaptured] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!active || type !== "element" || !el) return;
    // Firefox's prefixed capture takes the sound away from the element, which
    // would silence this device's speaker, so only the standard one is used.
    const capture = (el as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
    if (typeof capture !== "function") return;
    let source: MediaStream;
    try {
      source = capture.call(el);
    } catch {
      return; // media from another site that doesn't allow it
    }
    // The capture's tracks are swapped whenever the source settles; a fresh
    // stream each time tells the mixer to pick up the new ones.
    const sync = () => setCaptured(new MediaStream(source.getAudioTracks()));
    source.addEventListener("addtrack", sync);
    source.addEventListener("removetrack", sync);
    sync();
    return () => {
      source.removeEventListener("addtrack", sync);
      source.removeEventListener("removetrack", sync);
      setCaptured(null);
    };
  }, [active, type, el]);

  const tap = !active
    ? null
    : type === "element"
      ? captured
      : type === "stream"
        ? remote
        : type === "preview" && screen?.getAudioTracks().length
          ? screen
          : null;

  useEffect(() => {
    setTap(tap);
    return () => setTap(null);
  }, [tap, setTap]);

  return tap;
}

/** Keys pressed while typing, or on a focused control, belong to that control. */
function ownsKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

/**
 * The screen everyone is watching, and its transport.
 *
 * Mounted once for the life of the room and kept at the top of every tab, so
 * switching to the chat or the queue never tears down the player — the film
 * keeps playing above whatever you are doing, the way a phone's video apps
 * keep the video pinned above their comments.
 */
export function Stage() {
  const item = useWatchPartyStore((s) => s.room?.now ?? null);
  const playback = useWatchPartyStore((s) => s.room?.playback ?? null);
  const role = useWatchPartyStore((s) => s.role);
  const remoteMedia = useWatchPartyStore((s) => s.remote.media);
  const screen = useWatchPartyStore((s) => s.screen);
  const ownCopy = useWatchPartyStore((s) => s.ownCopy);
  const prefs = useWatchPartyStore((s) => s.prefs);
  const subs = useWatchPartyStore((s) => s.subs);
  const needsTap = useWatchPartyStore((s) => s.needsTap);
  const floaters = useWatchPartyStore((s) => s.floaters);
  const canControl = useWatchPartyStore(selectCanControl);
  const control = useWatchPartyStore((s) => s.control);
  const setPrefs = useWatchPartyStore((s) => s.setPrefs);
  const setNeedsTap = useWatchPartyStore((s) => s.setNeedsTap);
  const fileUrl = useWatchPartyStore((s) => s.fileUrl);

  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [yt, setYt] = useState<YTPlayer | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const ownUrl = ownCopy && item && ownCopy.itemId === item.id ? ownCopy.url : null;
  const hostFile = role === "host" && item?.kind === "file" ? fileUrl(item.id) : null;
  const view = viewFor(item, role, ownUrl, hostFile);

  // Only a player this device drives in step gets a handle; a stream has none.
  const handle = useMemo(() => {
    if (view.type === "element" && el) return elementHandle(el);
    if (view.type === "youtube" && yt) return youtubeHandle(yt);
    return null;
  }, [view.type, el, yt]);

  useWatchPartySync(handle);
  const head = usePlayhead(handle);

  const tap = useOutputTap(view.type, el, remoteMedia, screen, prefs.outputs.length > 0);
  // Only sound that reaches the extra outputs may be taken off this one.
  const silenceLocal = useWatchPartyStore(selectSilenceLocal) && !!tap;

  // Volume is this device's own business and never touches the room.
  useEffect(() => {
    const muted = prefs.muted || silenceLocal;
    if (handle) handle.setVolume(prefs.volume, muted);
    else if (el) {
      el.volume = prefs.volume;
      el.muted = muted;
    }
  }, [handle, el, prefs.volume, prefs.muted, silenceLocal]);

  const idle = !item;
  const reportSync = useWatchPartyStore((s) => s.reportSync);
  useEffect(() => {
    if (idle) reportSync(null, false, "idle");
  }, [idle, reportSync]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void frameRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const playing = playback?.status === "playing";
  const live = item?.kind === "screen";

  const playPause = useCallback(() => {
    if (!item || !canControl || live) return;
    if (playing) control({ action: "pause", position: handle?.time() });
    else control({ action: "play" });
  }, [item, canControl, live, playing, control, handle]);

  const seek = useCallback(
    (position: number) => {
      if (!canControl || live) return;
      control({ action: "seek", position: Math.max(0, position) });
    },
    [canControl, live, control],
  );

  const hasSubs = !!subs && !!item && subs.itemId === item.id;
  const subText = hasSubs && prefs.captions ? cueAt(subs.cues, head.position - prefs.subOffset) : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || ownsKeys(e.target)) return;
      const s = useWatchPartyStore.getState();
      if (e.key === " ") playPause();
      else if (e.key === "ArrowLeft") seek(head.position - 10);
      else if (e.key === "ArrowRight") seek(head.position + 10);
      else if (e.key === "m" || e.key === "M") s.setPrefs({ muted: !s.prefs.muted });
      else if ((e.key === "f" || e.key === "F") && document.fullscreenEnabled) toggleFullscreen();
      else if ((e.key === "c" || e.key === "C") && hasSubs) s.setPrefs({ captions: !s.prefs.captions });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playPause, seek, head.position, toggleFullscreen, hasSubs]);

  const tapToStart = () => {
    setNeedsTap(false);
    if (handle) void handle.play().catch(() => setNeedsTap(true));
    else if (el) void el.play().catch(() => setNeedsTap(true));
  };

  const pipAvailable =
    !!el &&
    (view.type === "element" || view.type === "stream") &&
    !item?.audio &&
    typeof document !== "undefined" &&
    document.pictureInPictureEnabled;

  const onElement = useCallback((node: HTMLVideoElement | null) => setEl(node), []);
  const onPlayer = useCallback((player: YTPlayer | null) => setYt(player), []);

  return (
    <section
      aria-label="Player"
      // Pinned only while something plays, just under the app's pinned header:
      // an empty stage stuck to the top of a phone would just push the invite
      // and the queue below the fold.
      className={cx(
        "z-20 -mx-5 border-b border-border bg-paper px-5 pb-1.5 pt-3 min-[1024px]:mx-0 min-[1024px]:border-b-0 min-[1024px]:px-0 min-[1024px]:pt-5",
        item ? "sticky top-(--party-header-h,0px)" : "relative",
      )}
    >
      {/* Capped by the viewport's height as well as the column's width. Stacked
          over the tabs it stays under 40% of the screen, so what is below it is
          still usable; in the wide two-column layout it can take most of it. */}
      <div
        ref={frameRef}
        className="mx-auto w-full max-w-[calc(40svh*16/9)] min-[1024px]:max-w-[calc(66svh*16/9)] [&:fullscreen]:flex [&:fullscreen]:max-w-none [&:fullscreen]:flex-col [&:fullscreen]:bg-paper [&:fullscreen]:p-3"
      >
        <div
          className={cx(
            "@container relative w-full overflow-hidden rounded-xl bg-party-stage",
            fullscreen ? "min-h-0 flex-1" : item ? "aspect-video" : "aspect-[16/6] min-h-36",
          )}
        >
          {view.type === "idle" && <IdleStage role={role} waiting={!!item} />}
          {view.type === "youtube" && <YouTubePlayer key={item!.id} videoId={view.id} onPlayer={onPlayer} />}
          {view.type === "element" && (
            <ElementPlayer key={`${item!.id}:${view.src}`} src={view.src} capture={view.capture} onElement={onElement} />
          )}
          {view.type === "stream" && <StreamPlayer stream={remoteMedia} onElement={onElement} />}
          {view.type === "preview" && <ScreenPreview stream={screen} />}

          {item?.audio && (view.type === "element" || view.type === "stream") && (
            <MusicVisual title={item.title} playing={playing} />
          )}
          <SubtitleOverlay text={subText} raised={false} />
          <FloaterLayer floaters={floaters} />

          {needsTap && item && (
            <button
              type="button"
              onClick={tapToStart}
              className="absolute inset-0 grid place-items-center bg-party-stage/70 text-party-stage-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
            >
              <span className="flex flex-col items-center gap-2">
                <span className="grid size-14 place-items-center rounded-full bg-accent text-on-accent">
                  <PlayIcon size={24} />
                </span>
                <span className="text-[13.5px] font-semibold">Tap to start watching</span>
                <span className="max-w-64 text-center text-[11.5px] opacity-85">
                  This browser waits for a tap before it plays sound.
                </span>
              </span>
            </button>
          )}
        </div>

        {item && playback && (
          <PlayerControls
            playing={playing}
            position={head.position}
            duration={head.duration}
            live={live}
            canControl={canControl}
            rate={playback.rate}
            volume={prefs.volume}
            muted={prefs.muted}
            captions={hasSubs ? prefs.captions : null}
            onPlayPause={playPause}
            onSeek={seek}
            onRate={(rate) => control({ action: "rate", rate })}
            onVolume={(volume) => setPrefs({ volume, muted: volume === 0 })}
            onMute={() => setPrefs({ muted: !prefs.muted })}
            onCaptions={() => setPrefs({ captions: !prefs.captions })}
            onPip={pipAvailable ? () => void el!.requestPictureInPicture().catch(() => {}) : undefined}
            onFullscreen={typeof document !== "undefined" && document.fullscreenEnabled ? toggleFullscreen : undefined}
          />
        )}
      </div>
    </section>
  );
}

/** Nothing playing yet — say what to do about it. */
function IdleStage({ role, waiting }: { role: Role | null; waiting: boolean }) {
  const setTab = useWatchPartyStore((s) => s.setTab);
  const pill =
    "inline-flex min-h-10 items-center gap-2 rounded-full bg-party-stage-ink/12 px-3.5 py-2 text-[12.5px] font-semibold text-party-stage-ink transition-colors hover:bg-party-stage-ink/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <div className="absolute inset-0 grid place-items-center p-4 text-center text-party-stage-ink">
      <div className="flex flex-col items-center gap-2.5">
        <WatchPartyIcon size={34} className="opacity-80" />
        <p className="text-[clamp(13px,3cqw,17px)] font-bold">
          {waiting ? "Getting it ready…" : "Nothing playing yet"}
        </p>
        {!waiting && (
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setTab("queue")} className={pill}>
              <QueueIcon size={15} />
              {role === "host" ? "Choose something" : "Suggest something"}
            </button>
            {role === "host" && (
              <button type="button" onClick={() => setTab("people")} className={pill}>
                <UsersIcon size={15} />
                Invite people
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
