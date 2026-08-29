"use client";

import type { WeatherFrame } from "@/lib/Satellite/weather";
import { PauseIcon, PlayIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * The player for a run of weather frames: two hours of observations, then
 * whatever the nowcast projects ahead.
 *
 * The seam between the two is the only thing on this control that really
 * matters. Everything left of it happened and was measured; everything right of
 * it is a guess with a clock on it, and a player that showed them identically
 * would be inviting people to plan an afternoon around a forecast they had been
 * told was a radar picture. So forecast ticks are drawn differently, and the
 * current frame says which kind it is in words.
 */
export function FrameTimeline({
  frames,
  index,
  playing,
  onScrub,
  onTogglePlay,
}: {
  frames: WeatherFrame[];
  index: number;
  playing: boolean;
  onScrub: (index: number) => void;
  onTogglePlay: () => void;
}) {
  const active = frames[index];
  const last = frames.length - 1;
  const projected = frames.filter((f) => f.forecast).length;
  const measured = frames.length - projected;

  return (
    <div className="rounded-[14px] border border-border bg-panel p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause the animation" : "Play the animation"}
          className="grid size-10 flex-none place-items-center rounded-full bg-accent text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {playing ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[15px] font-semibold tabular-nums">
              {active ? active.label : "—"}
            </span>
            <span
              className={cx(
                "font-mono text-[10px] uppercase tracking-[.12em]",
                active?.forecast ? "text-danger" : "text-ink-soft",
              )}
            >
              {active?.forecast ? "Forecast" : "Observed"}
            </span>
          </div>

          <label className="sr-only" htmlFor="satellite-frame">
            Frame time
          </label>
          <input
            id="satellite-frame"
            type="range"
            min={0}
            max={Math.max(0, last)}
            step={1}
            value={Math.min(index, Math.max(0, last))}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-valuetext={
              active
                ? `${active.label}, ${active.forecast ? "forecast" : "observed"}`
                : "no frames"
            }
            className="mt-1 w-full accent-accent"
          />

          {/* The seam, drawn: observed ticks solid, forecast ticks hollow. */}
          <div aria-hidden className="mt-1 flex gap-[2px]">
            {frames.map((frame, i) => (
              <span
                key={`${frame.time}-${i}`}
                className={cx(
                  "h-1 flex-1 rounded-full",
                  i === index
                    ? "bg-accent"
                    : frame.forecast
                      ? "bg-danger/35"
                      : "bg-ink-soft/30",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">
        {frames.length} frames — {measured} measured
        {projected > 0 ? `, ${projected} projected ahead` : ", none projected ahead"}.
      </p>
    </div>
  );
}
