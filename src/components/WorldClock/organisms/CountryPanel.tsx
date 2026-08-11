"use client";

import { useState } from "react";
import { useWorldClockStore } from "@/store/useWorldClockStore";
import { useClockTick } from "@/hooks/useClockTick";
import { Flag } from "@/components/WorldClock/atoms/Flag";
import { DetailTile } from "@/components/WorldClock/atoms/DetailTile";
import { CountryBrowser } from "@/components/WorldClock/molecules/CountryBrowser";
import {
  CapitolIcon,
  CarIcon,
  CheckIcon,
  ClockIcon,
  CoinIcon,
  CompassIcon,
  GlobeIcon,
  LanguagesIcon,
  NewsIcon,
  PhoneIcon,
  PinIcon,
  RulerIcon,
  SparkleIcon,
  UsersIcon,
} from "@/components/SketchNotes/atoms/icons";
import { COUNTRY_BY_CODE, POPULATION_YEAR } from "@/lib/WorldClock/countries";
import { placesForCountry } from "@/lib/WorldClock/places";
import {
  clockFace,
  offsetLabel,
  zoneAbbreviation,
  zonedDateLabel,
  zonedTime,
  zoneDisplayName,
  zoneOffsetMinutes,
} from "@/lib/WorldClock/time";
import {
  drivingLabel,
  formatArea,
  formatPopulation,
  populationDensity,
} from "@/lib/WorldClock/format";

interface CountryPanelProps {
  code: string | null;
  onSelect: (code: string) => void;
  /** Jump to this country's headlines. */
  onReadNews: () => void;
}

/**
 * Everything the app knows about one country: what it is, what it's known for,
 * the reference facts, and the live time in each of its cities.
 *
 * All of it comes from the bundled catalog, so this panel is fully readable
 * offline — only the News tab needs a connection. Figures are labelled as
 * approximate where they are, so a bundled estimate is never mistaken for a
 * live statistic.
 */
export function CountryPanel({ code, onSelect, onReadNews }: CountryPanelProps) {
  const pins = useWorldClockStore((s) => s.pins);
  const pin = useWorldClockStore((s) => s.pin);
  const hour12 = useWorldClockStore((s) => s.hour12);
  const [browsing, setBrowsing] = useState(false);
  const country = code ? COUNTRY_BY_CODE[code] : undefined;

  // Cities tick once a minute — seconds add nothing to a reference panel and
  // would re-render the whole thing sixty times as often.
  const now = useClockTick(false);

  if (!country) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-panel p-5 text-center">
          <CompassIcon size={30} aria-hidden className="mx-auto text-ink-soft" />
          <p className="mt-3 text-[14px] font-semibold">Pick a country</p>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[12.5px] leading-relaxed text-ink-soft">
            Choose one below — or tap any clock on the board — to see its details, what it's
            known for and its latest headlines.
          </p>
        </div>
        <CountryBrowser onSelect={onSelect} />
      </div>
    );
  }

  const cities = placesForCountry(country.code);
  const primaryZone = cities[0]?.zone;
  const zoneCount = new Set(cities.map((c) => c.zone)).size;

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------- identity ---------------------------- */}
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
        <div className="flex items-start gap-4">
          <Flag code={country.code} width={56} className="mt-1" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[24px] font-extrabold leading-tight tracking-tight">
              {country.name}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              {country.subregion} · {country.region}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBrowsing((v) => !v)}
            aria-expanded={browsing}
            className="flex-none rounded-full border border-border bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {browsing ? "Close" : "Change"}
          </button>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">{country.about}</p>

        <button
          type="button"
          onClick={onReadNews}
          className="hover-lift mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <NewsIcon size={15} aria-hidden />
          Latest news from {country.name}
        </button>
      </section>

      {browsing && (
        <section aria-label="Choose another country" className="rounded-2xl border border-border bg-panel p-4">
          <CountryBrowser
            selected={country.code}
            onSelect={(next) => {
              onSelect(next);
              setBrowsing(false);
            }}
          />
        </section>
      )}

      {/* --------------------------- specialities -------------------------- */}
      <section aria-labelledby="worldclock-known-heading" className="rounded-2xl border border-border bg-panel p-5">
        <h3
          id="worldclock-known-heading"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-accent"
        >
          <SparkleIcon size={14} aria-hidden />
          Known for
        </h3>
        <ul role="list" className="mt-3 flex flex-wrap gap-2">
          {country.known.map((item) => (
            <li
              key={item}
              className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12.5px] font-medium"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------ facts ------------------------------ */}
      <section aria-labelledby="worldclock-facts-heading">
        <h3
          id="worldclock-facts-heading"
          className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-ink-soft"
        >
          Basic details
        </h3>
        <dl className="grid grid-cols-1 gap-2.5 min-[440px]:grid-cols-2">
          <DetailTile
            icon={<CapitolIcon size={17} />}
            label="Capital"
            value={country.capital}
          />
          <DetailTile
            icon={<ClockIcon size={17} />}
            label="Time zone"
            value={
              primaryZone
                ? `${offsetLabel(zoneOffsetMinutes(now, primaryZone))}${
                    zoneAbbreviation(now, primaryZone) ? ` · ${zoneAbbreviation(now, primaryZone)}` : ""
                  }`
                : "—"
            }
            note={
              zoneCount > 1
                ? `${zoneCount} zones in this catalog`
                : primaryZone && zoneDisplayName(primaryZone)
            }
          />
          <DetailTile
            icon={<UsersIcon size={17} />}
            label="Population"
            value={formatPopulation(country.population)}
            note={`approx. ${POPULATION_YEAR} · ${populationDensity(country)}`}
          />
          <DetailTile
            icon={<RulerIcon size={17} />}
            label="Area"
            value={formatArea(country.area)}
          />
          <DetailTile
            icon={<CoinIcon size={17} />}
            label="Currency"
            value={`${country.currency} (${country.currencySymbol})`}
            note={country.currencyCode}
          />
          <DetailTile
            icon={<LanguagesIcon size={17} />}
            label="Languages"
            value={country.languages.join(", ")}
          />
          <DetailTile
            icon={<PhoneIcon size={17} />}
            label="Dialling code"
            value={country.dialCode}
          />
          <DetailTile
            icon={<CarIcon size={17} />}
            label="Drives on"
            value={drivingLabel(country)}
          />
          <DetailTile
            icon={<GlobeIcon size={17} />}
            label="Internet domain"
            value={country.tld}
          />
          <DetailTile
            icon={<CompassIcon size={17} />}
            label="Region"
            value={country.region}
            note={country.subregion}
          />
        </dl>
      </section>

      {/* ------------------------------ cities ----------------------------- */}
      {cities.length > 0 && (
        <section aria-labelledby="worldclock-cities-heading">
          <h3
            id="worldclock-cities-heading"
            className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-ink-soft"
          >
            Cities &amp; local time
          </h3>
          <ul role="list" className="flex flex-col gap-2">
            {cities.map((place) => {
              const t = zonedTime(now, place.zone);
              const face = clockFace(t, hour12);
              const already = pins.includes(place.id);
              return (
                <li
                  key={place.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold leading-tight">
                      {place.city}
                    </p>
                    <p className="truncate text-[11.5px] leading-tight text-ink-soft">
                      {zonedDateLabel(now, place.zone)}
                    </p>
                  </div>
                  <span className="flex-none font-mono text-[14px] font-semibold tabular-nums">
                    {face.time}
                    {face.suffix && (
                      <span className="ml-1 text-[10px] text-ink-soft">{face.suffix}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => pin(place.id)}
                    disabled={already}
                    aria-label={
                      already
                        ? `${place.city} is already on the clock board`
                        : `Pin ${place.city} to the clock board`
                    }
                    title={already ? "Already on the board" : `Pin ${place.city}`}
                    className="hover-pop grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:bg-paper hover:text-accent disabled:pointer-events-none disabled:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {already ? <CheckIcon size={15} /> : <PinIcon size={15} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
