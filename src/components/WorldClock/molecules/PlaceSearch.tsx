"use client";

import { useMemo, useState } from "react";
import { Flag } from "@/components/WorldClock/atoms/Flag";
import { CheckIcon, CloseIcon, PinIcon, SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { searchPlaces } from "@/lib/WorldClock/places";
import { clockFace, zonedTime } from "@/lib/WorldClock/time";
import { cx } from "@/lib/utils";

interface PlaceSearchProps {
  /** The instant used to preview each result's current time. */
  now: Date;
  hour12: boolean;
  /** Ids already on the board, shown as added rather than offered again. */
  pinned: string[];
  /** True once the board is full — results stay visible but can't be added. */
  full: boolean;
  onAdd: (placeId: string) => void;
}

/**
 * Search for a city to add to the board.
 *
 * Matching runs across city names, former names, the country, its capital, its
 * ISO code and the IANA zone (see `searchPlaces`), so "bombay", "IN" and
 * "asia/kolkata" all find Mumbai — people look for a place by whatever they
 * happen to call it.
 *
 * Each result previews the time there before you commit to pinning it, which
 * is often the whole reason for the search in the first place.
 */
export function PlaceSearch({ now, hour12, pinned, full, onAdd }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchPlaces(query, 12), [query]);
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

  return (
    <section aria-label="Add a city" className="rounded-2xl border border-border bg-panel p-4">
      <div className="relative">
        <SearchIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a city — Tokyo, Kerala, +5:30, GB…"
          aria-label="Search for a city to add to the clock board"
          className="w-full rounded-xl border border-border bg-paper py-2.5 pl-10 pr-10 text-[14px] text-text placeholder:text-ink-soft focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear the search"
            className="hover-pop absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CloseIcon size={15} />
          </button>
        )}
      </div>

      {/* Announced politely so a screen-reader user hears the result count
          settle rather than every intermediate keystroke. */}
      <p role="status" className="sr-only">
        {query ? `${results.length} cities match ${query}` : ""}
      </p>

      {full && (
        <p className="mt-3 text-[12px] text-ink-soft">
          The board is full — remove a city to add another.
        </p>
      )}

      {query && results.length === 0 && (
        <p className="mt-3 text-[12.5px] text-ink-soft">
          No city matches “{query}”. Try a country, a capital or a two-letter code.
        </p>
      )}

      {results.length > 0 && (
        <ul role="list" className="mt-3 flex flex-col gap-1.5">
          {results.map(({ place, country }) => {
            const already = pinnedSet.has(place.id);
            const face = clockFace(zonedTime(now, place.zone), hour12);
            return (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => onAdd(place.id)}
                  disabled={already || full}
                  aria-label={
                    already
                      ? `${place.city}, ${country.name} is already on the board`
                      : `Add ${place.city}, ${country.name} to the board`
                  }
                  className={cx(
                    "flex w-full items-center gap-3 rounded-xl border border-border bg-paper px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    already || full
                      ? "cursor-not-allowed opacity-55"
                      : "hover:border-accent hover:text-accent",
                  )}
                >
                  <Flag code={country.code} width={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold leading-tight">
                      {place.city}
                    </span>
                    <span className="block truncate text-[11.5px] leading-tight text-ink-soft">
                      {country.name}
                    </span>
                  </span>
                  <span className="flex-none font-mono text-[12px] text-ink-soft tabular-nums">
                    {face.time}
                    {face.suffix ? ` ${face.suffix}` : ""}
                  </span>
                  {already ? (
                    <CheckIcon size={15} aria-hidden className="flex-none text-accent" />
                  ) : (
                    <PinIcon size={15} aria-hidden className="flex-none text-ink-soft" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
