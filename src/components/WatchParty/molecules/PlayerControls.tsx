"use client";

import { useState } from "react";
import { formatTime } from "@/lib/WatchParty/media";
import { RATES } from "@/lib/WatchParty/sync";
import {
  FullscreenIcon,
  MuteIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  SeekBackIcon,
  SeekForwardIcon,
  SubtitlesIcon,
  VolumeIcon,
} from "@/components/SketchNotes/atoms/icons";

const CTRL_BASE =
  "grid flex-none place-items-center rounded-full transition-[color,background-color,filter] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-35";
const CTRL = `${CTRL_BASE} size-10 text-ink-soft hover:bg-accent-soft hover:text-accent`;
const CTRL_ON = `${CTRL_BASE} size-10 text-accent hover:bg-accent-soft`;
/** The one filled button — its own class, so no hover colour competes with the fill. */
const PLAY = `${CTRL_BASE} size-11 bg-accent text-on-accent hover:brightness-110 focus-visible:ring-offset-2 focus-visible:ring-offset-paper`;

/**
 * The room's transport. Play and pause show the *room's* state, not this
 * device's player — a guest who pauses locally would otherwise see a play
 * button while the film carries on everywhere else.
 *
 * Without control rights the transport is still drawn (the playhead is how you
 * know where the film is) but the buttons that would move it are disabled, and
 * say who holds them.
 */
export function PlayerControls({
  playing,
  position,
  duration,
  live,
  canControl,
  rate,
  volume,
  muted,
  captions,
  onPlayPause,
  onSeek,
  onRate,
  onVolume,
  onMute,
  onCaptions,
  onPip,
  onFullscreen,
}: {
  playing: boolean;
  position: number;
  duration: number | null;
  /** A live source (a shared screen): no seeking, no speed. */
  live: boolean;
  canControl: boolean;
  rate: number;
  volume: number;
  muted: boolean;
  /** Null when there are no subtitles; otherwise whether they are showing. */
  captions: boolean | null;
  onPlayPause: () => void;
  onSeek: (position: number) => void;
  onRate: (rate: number) => void;
  onVolume: (volume: number) => void;
  onMute: () => void;
  onCaptions: () => void;
  onPip?: () => void;
  onFullscreen?: () => void;
}) {
  const seekable = canControl && !live && duration != null;
  const lockedHint = canControl ? undefined : "The host has playback controls";
  const end = duration ?? 0;

  return (
    <div className="flex flex-col gap-1.5 pt-2">
      {!live && (
        <div className="flex items-center gap-2.5">
          <span className="w-12 flex-none text-right font-mono text-[11px] tabular-nums text-ink-soft">
            {formatTime(position)}
          </span>
          {/* Screen readers get the same numbers from the slider's value text. */}
          <SeekBar position={position} end={end} disabled={!seekable} title={lockedHint} onSeek={onSeek} />
          <span className="w-12 flex-none font-mono text-[11px] tabular-nums text-ink-soft">
            {formatTime(duration)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onSeek(Math.max(0, position - 10))}
          disabled={!seekable}
          aria-label="Back 10 seconds"
          title={lockedHint ?? "Back 10 seconds (←)"}
          className={CTRL}
        >
          <SeekBackIcon size={18} />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!canControl || live}
          aria-label={playing ? "Pause for everyone" : "Play for everyone"}
          title={lockedHint ?? (playing ? "Pause (Space)" : "Play (Space)")}
          className={PLAY}
        >
          {playing ? <PauseIcon size={19} /> : <PlayIcon size={19} />}
        </button>
        <button
          type="button"
          onClick={() => onSeek(Math.min(end || Infinity, position + 10))}
          disabled={!seekable}
          aria-label="Forward 10 seconds"
          title={lockedHint ?? "Forward 10 seconds (→)"}
          className={CTRL}
        >
          <SeekForwardIcon size={18} />
        </button>

        {!live && (
          <label className="ml-1 flex items-center" title={lockedHint ?? "Playback speed for everyone"}>
            <span className="sr-only">Playback speed</span>
            <select
              value={rate}
              disabled={!canControl}
              onChange={(e) => onRate(Number(e.target.value))}
              className="h-9 rounded-full border border-border bg-panel px-2 font-mono text-[11.5px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
          </label>
        )}

        <span className="flex-1" />

        <button
          type="button"
          onClick={onMute}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          title={muted ? "Unmute (M)" : "Mute (M) — only on this device"}
          className={CTRL}
        >
          {muted || volume === 0 ? <MuteIcon size={18} /> : <VolumeIcon size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((muted ? 0 : volume) * 100)}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          aria-label="Volume on this device"
          className="hidden h-6 w-20 cursor-pointer accent-accent min-[480px]:block"
        />
        {captions !== null && (
          <button
            type="button"
            onClick={onCaptions}
            aria-label={captions ? "Hide subtitles" : "Show subtitles"}
            aria-pressed={captions}
            title="Subtitles (C)"
            className={captions ? CTRL_ON : CTRL}
          >
            <SubtitlesIcon size={18} />
          </button>
        )}
        {onPip && (
          <button type="button" onClick={onPip} aria-label="Picture in picture" title="Picture in picture" className={CTRL}>
            <PipIcon size={18} />
          </button>
        )}
        {onFullscreen && (
          <button type="button" onClick={onFullscreen} aria-label="Full screen" title="Full screen (F)" className={CTRL}>
            <FullscreenIcon size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The seek slider. While it is being dragged it shows where the thumb is and
 * says nothing to the room; the seek is sent once, on release — otherwise one
 * drag across a film would be a hundred seeks landing on every screen.
 */
function SeekBar({
  position,
  end,
  disabled,
  title,
  onSeek,
}: {
  position: number;
  end: number;
  disabled: boolean;
  title?: string;
  onSeek: (position: number) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const max = Math.max(end, 1);
  const shown = Math.min(drag ?? position, max);
  const commit = () => {
    if (drag != null) onSeek(drag);
    setDrag(null);
  };
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={0.5}
      value={shown}
      disabled={disabled}
      onChange={(e) => setDrag(Number(e.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      onBlur={commit}
      aria-label="Seek"
      aria-valuetext={`${formatTime(shown)} of ${formatTime(end || null)}`}
      title={title}
      className="h-6 min-w-0 flex-1 cursor-pointer accent-accent disabled:cursor-default"
    />
  );
}
