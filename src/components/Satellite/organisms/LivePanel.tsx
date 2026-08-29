"use client";

import { useEffect } from "react";
import { useSatelliteStore } from "@/store/useSatelliteStore";
import { useWeatherIndex } from "@/hooks/useWeatherIndex";
import { useLivePosition } from "@/hooks/useLivePosition";
import { useClockTick } from "@/hooks/useClockTick";
import { framesFor, liveFrameIndex, minutesBehind, OVERLAYS } from "@/lib/Satellite/weather";
import { formatDecimal, formatDistance } from "@/lib/Satellite/mercator";
import { FrameTimeline } from "@/components/Satellite/molecules/FrameTimeline";
import { FactRow } from "@/components/Satellite/molecules/FactRow";
import { LocationIcon, RefreshIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** One step of the animation. Slow enough to read a cell moving, fast enough to loop. */
const FRAME_MS = 550;

/** The eight points, for turning a heading in degrees into a direction. */
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * The live tab: where this device is, and how fresh the weather over it is.
 *
 * Both halves are here for the same reason — they are the only two things on
 * this map that are actually happening now. The imagery underneath is a
 * photograph taken at some point in the past few years, and saying so plainly
 * is part of the feature rather than a disclaimer bolted to it.
 */
export function LivePanel() {
  const overlay = useSatelliteStore((s) => s.overlay);
  const setOverlay = useSatelliteStore((s) => s.setOverlay);
  const frame = useSatelliteStore((s) => s.frame);
  const setFrame = useSatelliteStore((s) => s.setFrame);
  const playing = useSatelliteStore((s) => s.playing);
  const setPlaying = useSatelliteStore((s) => s.setPlaying);
  const fix = useSatelliteStore((s) => s.fix);
  const fixError = useSatelliteStore((s) => s.fixError);
  const follow = useSatelliteStore((s) => s.follow);
  const setFollow = useSatelliteStore((s) => s.setFollow);
  const setView = useSatelliteStore((s) => s.setView);

  const { supported, tracking, start, stop } = useLivePosition();
  // Radar has an index to fetch; the daily mosaic is addressed by date, so it
  // has frames without asking anyone — hence a query that only runs for one.
  const { data: index, isFetching, error, refetch } = useWeatherIndex(overlay === "radar");
  const now = useClockTick(true);

  const frames = framesFor(index, overlay, now.getTime());
  const behind = minutesBehind(frames, now.getTime());
  const overlayName = OVERLAYS.find((o) => o.id === overlay)?.name ?? "Off";
  const newest = frames.filter((f) => !f.forecast).at(-1);

  // A fresh index means new frames: sit on the newest measured one rather than
  // wherever the old index's numbering happened to leave the pointer.
  useEffect(() => {
    if (frames.length === 0) return;
    setFrame(liveFrameIndex(frames));
    // Only when the run of frames itself changes — scrubbing must not re-home.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index?.generated, overlay]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const id = window.setInterval(() => {
      const next = useSatelliteStore.getState().frame + 1;
      setFrame(next >= frames.length ? 0 : next);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [playing, frames.length, setFrame]);

  // Nothing to play while the overlay is off; leaving it running would burn a
  // timer against a map with no frames on it.
  useEffect(() => {
    if (overlay === "none" && playing) setPlaying(false);
  }, [overlay, playing, setPlaying]);

  const fixAge = fix ? Math.max(0, Math.round((now.getTime() - fix.ts) / 1000)) : null;
  const heading =
    fix?.heading != null && Number.isFinite(fix.heading)
      ? `${Math.round(fix.heading)}° ${COMPASS[Math.round(fix.heading / 45) % 8]}`
      : null;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="This device's position">
        <h2 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Where you are
        </h2>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={tracking ? stop : start}
            disabled={!supported}
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold disabled:opacity-40",
              tracking
                ? "border border-border bg-panel hover:border-danger hover:text-danger"
                : "bg-accent text-on-accent",
            )}
          >
            <LocationIcon size={15} />
            {tracking ? "Stop following the GPS" : "Locate me"}
          </button>

          {fix && (
            <>
              <button
                type="button"
                onClick={() => setView(fix, Math.max(16, useSatelliteStore.getState().zoom))}
                className="tint rounded-full border border-border bg-panel px-3.5 py-2 text-[13px] font-semibold hover:border-accent hover:text-accent"
              >
                Centre on me
              </button>
              <button
                type="button"
                onClick={() => setFollow(!follow)}
                aria-pressed={follow}
                className={cx(
                  "rounded-full border px-3.5 py-2 text-[13px] font-semibold",
                  follow
                    ? "border-accent bg-accent-soft text-accent"
                    : "tint border-border bg-panel hover:border-accent hover:text-accent",
                )}
              >
                Keep centred
              </button>
            </>
          )}
        </div>

        {!supported && (
          <p className="mt-2 text-[12.5px] text-ink-soft">
            This browser has no location service, so the rest of this section cannot work. The map
            and the live weather do not need it.
          </p>
        )}

        {fixError && (
          <p role="status" className="mt-2 text-[12.5px] leading-snug text-danger">
            {fixError}
          </p>
        )}

        {tracking && !fix && !fixError && (
          <p role="status" className="mt-2 text-[12.5px] text-ink-soft">
            Waiting for a fix — the first one outdoors takes a few seconds, indoors rather longer.
          </p>
        )}

        {fix && (
          <div className="mt-2">
            <FactRow label="Position" value={formatDecimal(fix)} />
            <FactRow
              label="Accuracy"
              value={`± ${formatDistance(fix.accuracy)}`}
              note="The radius the device is confident it is inside — the circle drawn on the map."
            />
            <FactRow
              label="Speed"
              value={
                fix.speed != null ? `${(fix.speed * 3.6).toFixed(1)} km/h` : "Not reported"
              }
            />
            <FactRow label="Heading" value={heading ?? "Not reported"} />
            <FactRow
              label="Altitude"
              value={fix.altitude != null ? `${Math.round(fix.altitude)} m` : "Not reported"}
            />
            <FactRow
              label="Last fix"
              value={fixAge === null ? "—" : fixAge < 2 ? "just now" : `${fixAge}s ago`}
              note="Speed, heading and altitude come from the device, and many report none of them while stationary."
            />
          </div>
        )}

        <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">
          Your position is never stored and never sent anywhere — it is read while this tab is open
          and dropped when you leave the app.
        </p>
      </section>

      <section aria-label="Live weather frames">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            How fresh the overlay is
          </h2>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={overlay !== "radar" || isFetching}
            className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
          >
            <RefreshIcon size={13} />
            {isFetching ? "Checking…" : "Check now"}
          </button>
        </div>

        {overlay === "none" ? (
          <div className="mt-2 rounded-[14px] border border-border bg-panel p-3">
            <p className="text-[12.5px] leading-snug">
              No live overlay is switched on, so nothing is being fetched.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOverlay("radar")}
                className="tint rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
              >
                Show rain radar
              </button>
              <button
                type="button"
                onClick={() => setOverlay("daily")}
                className="tint rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
              >
                Show today from orbit
              </button>
            </div>
          </div>
        ) : error ? (
          <p role="status" className="mt-2 text-[12.5px] leading-snug text-danger">
            {(error as Error).message}
          </p>
        ) : frames.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-ink-soft">
            {isFetching ? "Fetching the frame list…" : "No frames were published for this layer."}
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-[12.5px] leading-snug">
              {overlay === "radar" ? (
                <>
                  <b className="font-semibold">{overlayName}</b>, newest measurement{" "}
                  <b className="font-semibold text-accent">
                    {behind === null
                      ? "unknown"
                      : behind < 1
                        ? "less than a minute"
                        : `${behind} min`}
                  </b>{" "}
                  old. New frames are published about every ten minutes.
                </>
              ) : (
                <>
                  <b className="font-semibold">{overlayName}</b> — the newest complete pass is{" "}
                  <b className="font-semibold text-accent">{newest?.label ?? "—"}</b>. A day&apos;s
                  mosaic is assembled from that day&apos;s orbits and published a few hours behind
                  the satellite, so the run steps back a week rather than a couple of hours.
                </>
              )}
            </p>
            <FrameTimeline
              frames={frames}
              index={Math.min(frame, frames.length - 1)}
              playing={playing}
              onScrub={(i) => {
                setPlaying(false);
                setFrame(i);
              }}
              onTogglePlay={() => setPlaying(!playing)}
            />
          </div>
        )}
      </section>

      <p className="text-[11.5px] leading-snug text-ink-soft">
        The base imagery is a photograph months or years old, not a live feed: no public service
        streams the ground in real time. What is current here is the radar, NASA&apos;s daily global
        pass, and your own position — each stamped with when it was taken.
      </p>
    </div>
  );
}
