"use client";

import { useMemo } from "react";
import { useWorldClockStore, MAX_PINS } from "@/store/useWorldClockStore";
import { useClockTick } from "@/hooks/useClockTick";
import { ClockCard } from "@/components/WorldClock/molecules/ClockCard";
import { LocalClock } from "@/components/WorldClock/molecules/LocalClock";
import { PlaceSearch } from "@/components/WorldClock/molecules/PlaceSearch";
import { TimeScrubber } from "@/components/WorldClock/molecules/TimeScrubber";
import { ClockIcon } from "@/components/SketchNotes/atoms/icons";
import { placeForZone, resolvePlace } from "@/lib/WorldClock/places";
import { localZone, zonedTime, zoneOffsetMinutes } from "@/lib/WorldClock/time";

/**
 * The clock board: your own time, a slider that shifts every clock at once, and
 * the cities you've pinned.
 *
 * All the cards read from a single tick and a single "now", so the whole board
 * flips in one paint instead of each card running its own timer and drifting
 * apart from the others. Seconds are only ticked when they're actually on
 * screen — otherwise the board wakes once a minute (see {@link useClockTick}).
 */
interface ClockBoardProps {
  /** Open a country in the full details tab. */
  onOpenCountry: (code: string) => void;
  /** Open a country in the full news tab. */
  onOpenNews: (code: string) => void;
}

export function ClockBoard({ onOpenCountry, onOpenNews }: ClockBoardProps) {
  const pins = useWorldClockStore((s) => s.pins);
  const hour12 = useWorldClockStore((s) => s.hour12);
  const showSeconds = useWorldClockStore((s) => s.showSeconds);
  const scrubMinutes = useWorldClockStore((s) => s.scrubMinutes);
  const pin = useWorldClockStore((s) => s.pin);
  const unpin = useWorldClockStore((s) => s.unpin);
  const setScrub = useWorldClockStore((s) => s.setScrub);
  const resetScrub = useWorldClockStore((s) => s.resetScrub);
  const setHour12 = useWorldClockStore((s) => s.setHour12);
  const setShowSeconds = useWorldClockStore((s) => s.setShowSeconds);

  // Which cards have their country peek open. Several may be open at once —
  // auto-closing one card because another was opened would fight a reader
  // comparing two places, which is the whole point of a board.
  const openBriefs = useWorldClockStore((s) => s.openBriefs);
  const toggleBrief = useWorldClockStore((s) => s.toggleBrief);
  const openSet = useMemo(() => new Set(openBriefs), [openBriefs]);

  const tick = useClockTick(showSeconds);
  const zone = useMemo(localZone, []);
  // The visitor's own city, when their zone is one we hold a place for.
  const home = useMemo(() => {
    const place = placeForZone(zone);
    return place ? resolvePlace(place.id) : null;
  }, [zone]);

  // One instant for the whole board, shifted by the slider.
  const now = scrubMinutes === 0 ? tick : new Date(tick.getTime() + scrubMinutes * 60_000);
  const here = zonedTime(now, zone);
  const hereOffset = zoneOffsetMinutes(now, zone);

  // Stale ids (a city dropped from the catalog) are filtered rather than
  // rendered as blanks; the store normalises them away on the next write.
  const entries = pins.map(resolvePlace).filter((e) => e !== null);

  return (
    <div className="flex flex-col gap-4">
      <LocalClock
        zone={zone}
        home={home}
        now={now}
        here={here}
        offsetMinutes={hereOffset}
        hour12={hour12}
        showSeconds={showSeconds}
        scrubbed={scrubMinutes !== 0}
        onHour12={setHour12}
        onShowSeconds={setShowSeconds}
        onOpenCountry={onOpenCountry}
        onOpenNews={onOpenNews}
      />

      <TimeScrubber value={scrubMinutes} onChange={setScrub} onReset={resetScrub} />

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-panel px-5 py-14 text-center">
          <ClockIcon size={32} aria-hidden className="text-ink-soft" />
          <p className="text-[14px] font-semibold">No cities pinned yet.</p>
          <p className="max-w-[320px] text-[12.5px] leading-relaxed text-ink-soft">
            Search below to add one — its live time, the day it's on and whether it's a
            reasonable hour to call all appear on the board. Tap a clock for that country's
            key facts and latest news.
          </p>
        </div>
      ) : (
        <>
          <h3 className="sr-only">Pinned cities</h3>
          {/* items-start: an expanded card must not stretch its row partner to
              match, which would leave the collapsed one full of dead space. */}
          <ul role="list" className="grid grid-cols-1 items-start gap-3 min-[520px]:grid-cols-2">
            {entries.map((entry) => (
              <ClockCard
                key={entry.place.id}
                entry={entry}
                now={now}
                here={here}
                hereOffset={hereOffset}
                hour12={hour12}
                showSeconds={showSeconds}
                expanded={openSet.has(entry.place.id)}
                onToggle={toggleBrief}
                onOpenCountry={onOpenCountry}
                onOpenNews={onOpenNews}
                onUnpin={unpin}
              />
            ))}
          </ul>
        </>
      )}

      <PlaceSearch
        now={now}
        hour12={hour12}
        pinned={pins}
        full={pins.length >= MAX_PINS}
        onAdd={pin}
      />
    </div>
  );
}
