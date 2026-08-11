"use client";

import { Flag } from "@/components/WorldClock/atoms/Flag";
import { CityBrief } from "@/components/WorldClock/molecules/CityBrief";
import {
  ChevronDownIcon,
  MoonIcon,
  PinOffIcon,
  SunIcon,
  SunriseIcon,
} from "@/components/SketchNotes/atoms/icons";
import {
  callWindow,
  clockFace,
  dayDelta,
  dayDeltaLabel,
  dayPhase,
  shortOffsetLabel,
  zoneAbbreviation,
  zonedTime,
  zoneOffsetMinutes,
  type ZonedTime,
} from "@/lib/WorldClock/time";
import type { PlaceWithCountry } from "@/lib/WorldClock/types";
import { cx, trackSpot } from "@/lib/utils";

interface ClockCardProps {
  entry: PlaceWithCountry;
  /** The instant to display — already includes any time-slider offset. */
  now: Date;
  /** The same instant in the visitor's own zone, for the day/offset comparison. */
  here: ZonedTime;
  /** The visitor's own UTC offset in minutes, for the relative offset chip. */
  hereOffset: number;
  hour12: boolean;
  showSeconds: boolean;
  /** Whether this card's news-and-facts peek is open. */
  expanded: boolean;
  /** Toggle the peek. */
  onToggle: (placeId: string) => void;
  /** Open this card's country in the full details tab. */
  onOpenCountry: (code: string) => void;
  /** Open this card's country in the full news tab. */
  onOpenNews: (code: string) => void;
  /** Remove the card from the board. */
  onUnpin: (placeId: string) => void;
}

/** The glyph for a time of day — the fastest read on the whole card. */
const PHASE_ICON = {
  night: MoonIcon,
  dawn: SunriseIcon,
  day: SunIcon,
  dusk: SunriseIcon,
} as const;

/**
 * One pinned city on the clock board.
 *
 * Built around the three questions a world clock actually gets asked: what time
 * is it there, is that the same day as here, and can I call right now. So the
 * time is the largest thing on the card, a "Tomorrow"/"Yesterday" badge appears
 * the moment the date diverges, and a sun/moon glyph plus a working-hours line
 * answer the third at a glance without any date arithmetic by the reader.
 *
 * Tapping the card unfolds a peek at the country behind it — its key facts,
 * what it's known for and its latest headlines. That peek is mounted only while
 * open, which is what keeps a board of twenty cities from firing twenty news
 * requests nobody asked for.
 *
 * The unpin control is a *sibling* button rather than a nested one, so the
 * markup stays valid and both stay reachable by keyboard.
 */
export function ClockCard({
  entry,
  now,
  here,
  hereOffset,
  hour12,
  showSeconds,
  expanded,
  onToggle,
  onOpenCountry,
  onOpenNews,
  onUnpin,
}: ClockCardProps) {
  const { place, country } = entry;
  const there = zonedTime(now, place.zone);
  const face = clockFace(there, hour12);
  const delta = dayDelta(here, there);
  const dayLabel = dayDeltaLabel(delta);
  const phase = dayPhase(there.hour);
  const PhaseIcon = PHASE_ICON[phase];
  const call = callWindow(there.hour);
  const relative = shortOffsetLabel(zoneOffsetMinutes(now, place.zone) - hereOffset);
  const abbr = zoneAbbreviation(now, place.zone);
  const panelId = `worldclock-brief-${place.id}`;

  return (
    <li
      className={cx(
        // The surface lives on the <li> so the peek shares one card with the
        // clock rather than reading as a second box stuck underneath it.
        "relative rounded-2xl border transition-colors",
        // Daylight hours get the warm accent wash; night stays on plain panel
        // glass, so the board reads as a day/night map at a glance.
        phase === "night" ? "border-border bg-panel" : "border-accent/40 bg-accent-soft",
        expanded && "border-accent",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(place.id)}
        onPointerMove={trackSpot}
        aria-expanded={expanded}
        aria-controls={panelId}
        title={`${place.city} — ${expanded ? "hide" : "show"} country facts and news`}
        className="hover-spot flex w-full flex-col gap-3 rounded-2xl p-4 pr-11 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Flag code={country.code} width={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold leading-tight tracking-[.1px]">
              {place.city}
            </span>
            <span className="block truncate text-[11.5px] leading-tight text-ink-soft">
              {country.name}
            </span>
          </span>
        </span>

        <span className="flex items-end gap-1.5">
          <span className="text-[30px] font-extrabold leading-none tracking-tight tabular-nums">
            {face.time}
          </span>
          {showSeconds && (
            <span className="text-[15px] font-bold leading-none text-ink-soft tabular-nums">
              :{String(there.second).padStart(2, "0")}
            </span>
          )}
          {face.suffix && (
            <span className="pb-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[.1em] text-ink-soft">
              {face.suffix}
            </span>
          )}
          <PhaseIcon
            size={17}
            aria-hidden
            className={cx("mb-0.5 ml-auto", phase === "night" ? "text-ink-soft" : "text-accent")}
          />
        </span>

        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-soft">
          {dayLabel && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-accent">
              {dayLabel}
            </span>
          )}
          <span className="font-mono tabular-nums">{relative}</span>
          {abbr && (
            <>
              <span aria-hidden className="text-border">•</span>
              <span className="font-mono">{abbr}</span>
            </>
          )}
          <span aria-hidden className="text-border">•</span>
          {/* A "don't call" warning in the accent colour would read as a
              positive highlight; the caution token says what it means. */}
          <span className={cx("truncate", call.ok ? "text-ink-soft" : "font-semibold text-prio-med")}>
            {call.label}
          </span>
          <ChevronDownIcon
            size={15}
            aria-hidden
            className={cx(
              "ml-auto flex-none transition-transform duration-200",
              expanded ? "rotate-180 text-accent" : "text-ink-soft",
            )}
          />
        </span>

        {/* The full, unabbreviated reading — the visual card is a shorthand of
            it, so assistive tech gets the sentence rather than the fragments. */}
        <span className="sr-only">
          {place.city}, {country.name}: {face.time}
          {face.suffix ? ` ${face.suffix}` : ""}
          {dayLabel ? `, ${dayLabel}` : ""}. {call.label}.
        </span>
      </button>

      <button
        type="button"
        onClick={() => onUnpin(place.id)}
        aria-label={`Remove ${place.city} from the clock board`}
        title={`Remove ${place.city}`}
        className="hover-pop absolute right-2 top-2 grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-panel hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <PinOffIcon size={15} />
      </button>

      {/* Mounted only while open — that is what defers the news request. */}
      {expanded && (
        <div id={panelId} className="px-4 pb-4">
          <CityBrief
            country={country}
            onOpenCountry={() => onOpenCountry(country.code)}
            onOpenNews={() => onOpenNews(country.code)}
          />
        </div>
      )}
    </li>
  );
}
