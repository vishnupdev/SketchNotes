"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSatelliteStore } from "@/store/useSatelliteStore";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { describePoint, type Place } from "@/lib/Satellite/geocode";
import { distanceM, formatDecimal, formatDistance, formatDms, parseLatLon } from "@/lib/Satellite/mercator";
import { useLivePosition } from "@/hooks/useLivePosition";
import { STREET_VIEW_NOTE } from "@/lib/Satellite/streetview";
import { PlaceRow } from "@/components/Satellite/molecules/PlaceRow";
import { StreetViewLink } from "@/components/Satellite/molecules/StreetViewLink";
import {
  CheckIcon,
  CopyIcon,
  LocationIcon,
  PinIcon,
  SearchIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** A place made out of nothing but a position — what "pin the centre" gives you. */
const pointPlace = (lat: number, lon: number): Place => ({
  id: `at:${lat.toFixed(5)},${lon.toFixed(5)}`,
  name: formatDecimal({ lat, lon }, 4),
  detail: formatDms({ lat, lon }),
  lat,
  lon,
  zoom: 16,
});

/**
 * Finding somewhere: by name, by coordinates, or by asking what is already in
 * the middle of the screen.
 *
 * The search only runs when it is *submitted* — there is no search-as-you-type
 * anywhere here, and that is deliberate rather than lazy: the geocoder is
 * OpenStreetMap's, run on donations, and firing a request per keystroke at it
 * is the behaviour that gets applications blocked.
 */
export function FindPanel() {
  const query = useSatelliteStore((s) => s.query);
  const setQuery = useSatelliteStore((s) => s.setQuery);
  const setView = useSatelliteStore((s) => s.setView);
  const setPin = useSatelliteStore((s) => s.setPin);
  const pin = useSatelliteStore((s) => s.pin);
  const saved = useSatelliteStore((s) => s.saved);
  const savePlace = useSatelliteStore((s) => s.savePlace);
  const removePlace = useSatelliteStore((s) => s.removePlace);
  const center = useSatelliteStore((s) => s.center);
  const fix = useSatelliteStore((s) => s.fix);

  const fixError = useSatelliteStore((s) => s.fixError);
  const {
    supported: canLocate,
    locating,
    start: locate,
    stop: stopLocating,
  } = useLivePosition();

  /** The term actually searched for — only ever set by submitting the form. */
  const [term, setTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: results, isFetching, error } = usePlaceSearch(term);

  const lookup = useMutation({
    mutationFn: () => describePoint(center),
    onSuccess: (place) => {
      if (place) setPin({ ...place, zoom: 16 });
    },
  });

  const goTo = (place: Place) => {
    setPin(place);
    setView(place, place.zoom);
  };

  /** Fly to the live fix, close enough in to see the street you are on. */
  const centreOnMe = () => {
    if (fix) setView(fix, Math.max(16, useSatelliteStore.getState().zoom));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;

    // Coordinates are answered here rather than sent anywhere: the numbers are
    // already the answer, and a round trip could only hand them back.
    const coords = parseLatLon(text);
    if (coords) {
      setTerm("");
      goTo(pointPlace(coords.lat, coords.lon));
      return;
    }
    setTerm(text);
  };

  const copyCentre = async () => {
    try {
      await navigator.clipboard.writeText(formatDecimal(center));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard refused — the readout under the map is selectable */
    }
  };

  const away = (place: Place): string | undefined =>
    fix ? formatDistance(distanceM(fix, place)) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label
          htmlFor="satellite-search"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Place or coordinates
        </label>
        <div className="flex gap-2">
          <input
            id="satellite-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Eiffel Tower — or 48.8584, 2.2945"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-border bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="inline-flex flex-none items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2.5 text-[13px] font-semibold text-on-accent disabled:opacity-40"
          >
            <SearchIcon size={15} />
            Search
          </button>
        </div>
        {/* The other way to answer "where is this" — and for most people the
            first one they reach for, which is why it sits with the search box
            rather than only in the Live tab. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locating ? stopLocating : fix ? centreOnMe : locate}
            disabled={!canLocate}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40",
              locating
                ? "border-accent bg-accent-soft text-accent"
                : "tint border-border bg-panel hover:border-accent hover:text-accent",
            )}
          >
            <LocationIcon size={13} />
            {!canLocate
              ? "Location unavailable"
              : locating
                ? "Locating — tap to cancel"
                : fix
                  ? "Centre on me"
                  : "Use my location"}
          </button>

          <p className="text-[11.5px] leading-snug text-ink-soft">
            Coordinates are resolved on the device; a name is looked up with OpenStreetMap&apos;s
            geocoder, and only when you press Search.
          </p>
        </div>

        {fixError && (
          <p role="status" className="text-[12px] leading-snug text-danger">
            {fixError}
          </p>
        )}
      </form>

      {isFetching && <p className="text-[12.5px] text-ink-soft">Looking…</p>}

      {error && (
        <p role="status" className="text-[12.5px] text-danger">
          {(error as Error).message}
        </p>
      )}

      {!isFetching && term && results?.length === 0 && (
        <p className="text-[12.5px] text-ink-soft">
          Nothing found for “{term}”. Try a fuller address, or paste coordinates.
        </p>
      )}

      {results && results.length > 0 && (
        <section aria-label="Search results">
          <h2 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Results
          </h2>
          <ul className="mt-1">
            {results.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                distance={away(place)}
                onOpen={() => goTo(place)}
                action={
                  <button
                    type="button"
                    onClick={() => savePlace(place)}
                    aria-label={`Keep ${place.name}`}
                    title="Keep this place"
                    className="tint grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-accent"
                  >
                    <PinIcon size={15} />
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      )}

      <section aria-label="The centre of the map" className="rounded-[14px] border border-border bg-panel p-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Under the crosshair
        </h2>
        <p className="mt-1 break-all font-mono text-[12.5px]">{formatDecimal(center)}</p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-soft">{formatDms(center)}</p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPin(pointPlace(center.lat, center.lon))}
            className="tint rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            Pin the centre
          </button>
          <button
            type="button"
            onClick={() => lookup.mutate()}
            disabled={lookup.isPending}
            className="tint rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {lookup.isPending ? "Asking…" : "What is here?"}
          </button>
          <button
            type="button"
            onClick={() => void copyCentre()}
            className={cx(
              "tint inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold",
              copied ? "text-accent" : "hover:border-accent hover:text-accent",
            )}
          >
            {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>

          <StreetViewLink point={center} />
        </div>

        <p className="mt-2 text-[11px] leading-snug text-ink-soft">{STREET_VIEW_NOTE}</p>

        {lookup.isError && (
          <p role="status" className="mt-2 text-[12px] text-danger">
            {(lookup.error as Error).message}
          </p>
        )}
        {lookup.isSuccess && !lookup.data && (
          <p role="status" className="mt-2 text-[12px] text-ink-soft">
            Nobody has named this spot — the coordinates above are the whole answer.
          </p>
        )}
      </section>

      {pin && (
        <section aria-label="The pin" className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[12.5px]">
            <span className="text-ink-soft">Pinned: </span>
            <b className="font-semibold">{pin.name}</b>
          </p>
          <StreetViewLink point={pin} />
          <button
            type="button"
            onClick={() => savePlace(pin)}
            className="tint flex-none rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={() => setPin(null)}
            className="tint flex-none rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-danger hover:text-danger"
          >
            Clear
          </button>
        </section>
      )}

      <section aria-label="Kept places">
        <h2 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Kept places
        </h2>
        {saved.length === 0 ? (
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Nothing kept yet. Keeping a place stores only its name and coordinates, in this browser.
          </p>
        ) : (
          <ul className="mt-1">
            {saved.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                distance={away(place)}
                onOpen={() => goTo(place)}
                action={
                  <button
                    type="button"
                    onClick={() => removePlace(place.id)}
                    aria-label={`Forget ${place.name}`}
                    title="Forget this place"
                    className="tint grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-danger"
                  >
                    <TrashSmallIcon size={15} />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
