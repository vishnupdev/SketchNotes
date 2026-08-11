"use client";

import { useState } from "react";
import { Flag } from "@/components/WorldClock/atoms/Flag";
import { CityBrief } from "@/components/WorldClock/molecules/CityBrief";
import {
  ChevronDownIcon,
  ClockIcon,
  MoonIcon,
  SunIcon,
  SunriseIcon,
} from "@/components/SketchNotes/atoms/icons";
import type { PlaceWithCountry } from "@/lib/WorldClock/types";
import {
  clockFace,
  dayPhase,
  isDaylightSaving,
  offsetLabel,
  zoneAbbreviation,
  zoneDisplayName,
  zonedDateLabel,
  type ZonedTime,
} from "@/lib/WorldClock/time";
import { cx } from "@/lib/utils";

interface LocalClockProps {
  zone: string;
  /** The catalog city matching the visitor's zone, when we hold one. */
  home?: PlaceWithCountry | null;
  /** The instant shown — already includes any time-slider offset. */
  now: Date;
  here: ZonedTime;
  offsetMinutes: number;
  hour12: boolean;
  showSeconds: boolean;
  /** True while the time slider is moved off "now". */
  scrubbed: boolean;
  onHour12: (hour12: boolean) => void;
  onShowSeconds: (show: boolean) => void;
  /** Open your own country in the full details tab. */
  onOpenCountry: (code: string) => void;
  /** Open your own country in the full news tab. */
  onOpenNews: (code: string) => void;
}

const PHASE_ICON = { night: MoonIcon, dawn: SunriseIcon, day: SunIcon, dusk: SunriseIcon } as const;

/**
 * The visitor's own clock, and the reference every other card is measured
 * against — so it leads the board at full size rather than sitting in the grid.
 *
 * It also carries the two display switches (12/24-hour, seconds), because this
 * is the clock a reader is looking at when they decide they want them changed.
 */
export function LocalClock({
  zone,
  home,
  now,
  here,
  offsetMinutes,
  hour12,
  showSeconds,
  scrubbed,
  onHour12,
  onShowSeconds,
  onOpenCountry,
  onOpenNews,
}: LocalClockProps) {
  const [briefOpen, setBriefOpen] = useState(false);
  const face = clockFace(here, hour12);
  const PhaseIcon = PHASE_ICON[dayPhase(here.hour)];
  const abbr = zoneAbbreviation(now, zone);
  const dst = isDaylightSaving(now, zone);

  const toggle =
    "rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <section
      aria-label="Your local time"
      className="rounded-2xl border border-border bg-panel p-5 shadow-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-accent">
            <ClockIcon size={13} aria-hidden />
            {scrubbed ? "Your time (shifted)" : "Your time"}
          </p>
          {/* Name the place when the visitor's zone matches a city we hold —
              "Kochi, India" orients far faster than "Asia / Kolkata" does. */}
          {home ? (
            <p className="mt-1 flex items-center gap-2">
              <Flag code={home.country.code} width={22} />
              <span className="truncate text-[13px] font-semibold">
                {home.place.city}, {home.country.name}
              </span>
            </p>
          ) : (
            <p className="mt-1 truncate text-[13px] text-ink-soft">{zoneDisplayName(zone)}</p>
          )}
        </div>
        <PhaseIcon size={22} aria-hidden className="flex-none text-accent" />
      </div>

      <p className="mt-3 flex items-end gap-2">
        <span className="text-[clamp(44px,13vw,64px)] font-extrabold leading-none tracking-tight tabular-nums">
          {face.time}
        </span>
        {showSeconds && (
          <span className="pb-1 text-[24px] font-bold leading-none text-ink-soft tabular-nums">
            :{String(here.second).padStart(2, "0")}
          </span>
        )}
        {face.suffix && (
          <span className="pb-1.5 font-mono text-[13px] font-bold uppercase tracking-[.1em] text-ink-soft">
            {face.suffix}
          </span>
        )}
      </p>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-soft">
        <span className="font-semibold text-text">{zonedDateLabel(now, zone)}</span>
        <span aria-hidden className="text-border">•</span>
        <span className="font-mono tabular-nums">{offsetLabel(offsetMinutes)}</span>
        {abbr && (
          <>
            <span aria-hidden className="text-border">•</span>
            <span className="font-mono">{abbr}</span>
          </>
        )}
        {dst && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            DST
          </span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onHour12(!hour12)}
          aria-pressed={!hour12}
          className={cx(toggle, "border-border bg-paper text-ink-soft hover:border-accent hover:text-accent")}
        >
          {hour12 ? "12-hour" : "24-hour"}
        </button>
        <button
          type="button"
          onClick={() => onShowSeconds(!showSeconds)}
          aria-pressed={showSeconds}
          className={cx(
            toggle,
            showSeconds
              ? "border-accent bg-accent text-on-accent"
              : "border-border bg-paper text-ink-soft hover:border-accent hover:text-accent",
          )}
        >
          Seconds
        </button>

        {/* Your own country gets the same peek as every other clock — it would
            be odd for the one place you're in to be the one you can't check. */}
        {home && (
          <button
            type="button"
            onClick={() => setBriefOpen((v) => !v)}
            aria-expanded={briefOpen}
            aria-controls="worldclock-brief-home"
            className={cx(
              toggle,
              "ml-auto inline-flex items-center gap-1.5",
              briefOpen
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-paper text-ink-soft hover:border-accent hover:text-accent",
            )}
          >
            News &amp; facts
            <ChevronDownIcon
              size={13}
              aria-hidden
              className={cx("transition-transform duration-200", briefOpen && "rotate-180")}
            />
          </button>
        )}
      </div>

      {home && briefOpen && (
        <div id="worldclock-brief-home" className="mt-4">
          <CityBrief
            country={home.country}
            onOpenCountry={() => onOpenCountry(home.country.code)}
            onOpenNews={() => onOpenNews(home.country.code)}
          />
        </div>
      )}
    </section>
  );
}
