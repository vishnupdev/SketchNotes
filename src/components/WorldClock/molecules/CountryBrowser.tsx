"use client";

import { useMemo, useState } from "react";
import { Flag } from "@/components/WorldClock/atoms/Flag";
import { CloseIcon, SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { COUNTRIES } from "@/lib/WorldClock/countries";
import { countriesByRegion } from "@/lib/WorldClock/places";
import type { Country } from "@/lib/WorldClock/types";

interface CountryBrowserProps {
  /** Highlighted as current, when one is already in focus. */
  selected?: string | null;
  onSelect: (code: string) => void;
}

/** Match a country by name, capital, ISO code or anything it's known for. */
function matches(country: Country, q: string): boolean {
  if (!q) return true;
  const hay = [country.name, country.capital, country.code, country.region, ...country.known]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Browse or search every country in the catalog, grouped by continent.
 *
 * Search covers specialities as well as names, so "coffee", "fjords" or
 * "safari" lead somewhere — which is how people actually look for a country
 * they can picture but can't name.
 */
export function CountryBrowser({ selected, onSelect }: CountryBrowserProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = useMemo(
    () =>
      countriesByRegion()
        .map((g) => ({ ...g, countries: g.countries.filter((c) => matches(c, q)) }))
        .filter((g) => g.countries.length > 0),
    [q],
  );

  const total = groups.reduce((n, g) => n + g.countries.length, 0);

  return (
    <div className="flex flex-col gap-3">
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
          placeholder={`Search ${COUNTRIES.length} countries — name, capital or speciality…`}
          aria-label="Search countries by name, capital or speciality"
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

      <p role="status" className="sr-only">
        {q ? `${total} countries match ${query}` : ""}
      </p>

      {total === 0 && (
        <p className="py-6 text-center text-[12.5px] text-ink-soft">
          No country matches “{query}”.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.region}>
          <h3 className="mb-2 mt-1 font-mono text-[10px] uppercase tracking-[.16em] text-ink-soft">
            {group.region}
          </h3>
          <ul role="list" className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
            {group.countries.map((country) => {
              const current = country.code === selected;
              return (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(country.code)}
                    aria-current={current ? "true" : undefined}
                    className={
                      current
                        ? "flex w-full items-center gap-3 rounded-xl border border-accent bg-accent-soft px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        : "flex w-full items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2.5 text-left transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    }
                  >
                    <Flag code={country.code} width={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold leading-tight">
                        {country.name}
                      </span>
                      <span className="block truncate text-[11.5px] leading-tight text-ink-soft">
                        {country.capital}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
