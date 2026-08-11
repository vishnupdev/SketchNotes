"use client";

import { useCountryNews } from "@/hooks/useCountryNews";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { timeAgo } from "@/lib/rss/format";
import { formatPopulation, languageSummary } from "@/lib/WorldClock/format";
import type { Country } from "@/lib/WorldClock/types";
import {
  CompassIcon,
  ExternalLinkIcon,
  NewsIcon,
  WifiOffIcon,
} from "@/components/SketchNotes/atoms/icons";

interface CityBriefProps {
  country: Country;
  /** Open the full country details tab. */
  onOpenCountry: () => void;
  /** Open the full headline list for this country. */
  onOpenNews: () => void;
}

/** Headlines shown in the peek — enough to read the mood, not a whole feed. */
const HEADLINE_COUNT = 3;

/** One important point: a short term over its value. */
function Point({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9.5px] uppercase tracking-[.13em] text-ink-soft">{label}</dt>
      <dd className="truncate text-[12.5px] font-semibold leading-tight">{value}</dd>
    </div>
  );
}

/**
 * The peek that unfolds under a clock: the country's important points, what
 * it's known for, and its latest headlines.
 *
 * The news query lives in here rather than in the card, which is the whole
 * point of mounting this only once a card is expanded — a board of twenty
 * cities costs zero requests until someone actually asks about one, and
 * TanStack Query then caches the country so re-opening it is free.
 *
 * Everything above the headlines is bundled data, so an offline reader still
 * gets the facts and specialities and is only told the news is missing.
 */
export function CityBrief({ country, onOpenCountry, onOpenNews }: CityBriefProps) {
  const { data, isLoading, isError } = useCountryNews(country.code);
  const { online } = useNetworkStatus();
  const headlines = data?.slice(0, HEADLINE_COUNT) ?? [];

  const action =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-paper px-3 py-2 text-[11.5px] font-semibold transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="flex flex-col gap-3.5 border-t border-border pt-3.5">
      {/* --------------------------- key facts --------------------------- */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Point label="Capital" value={country.capital} />
        <Point label="Currency" value={`${country.currencySymbol} ${country.currencyCode}`} />
        <Point label="Languages" value={languageSummary(country.languages, 2)} />
        <Point label="Dialling" value={country.dialCode} />
        <Point label="Population" value={formatPopulation(country.population)} />
        <Point label="Drives on" value={country.driving === "left" ? "Left" : "Right"} />
      </dl>

      {/* -------------------------- known for ---------------------------- */}
      <ul role="list" className="flex flex-wrap gap-1.5">
        {country.known.slice(0, 4).map((item) => (
          <li
            key={item}
            className="rounded-full border border-border bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>

      {/* --------------------------- headlines --------------------------- */}
      <div>
        <h4 className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[.13em] text-accent">
          <NewsIcon size={12} aria-hidden />
          Latest news
        </h4>

        {isLoading ? (
          /* Fixed-height rows matching a loaded headline, so the swap when the
             feed lands shifts the card as little as possible (rule #7). */
          <ul role="list" aria-label="Loading headlines" className="mt-2 flex flex-col gap-2">
            {Array.from({ length: HEADLINE_COUNT }).map((_, i) => (
              <li key={i} className="flex h-[34px] flex-col justify-center gap-1.5">
                <div className="h-3 w-11/12 animate-pulse rounded bg-ink-soft/20" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-ink-soft/15" />
              </li>
            ))}
          </ul>
        ) : isError || headlines.length === 0 ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-soft">
            {!online && <WifiOffIcon size={13} aria-hidden className="mt-0.5 flex-none" />}
            {!online
              ? "Offline — no saved headlines for this country yet."
              : "Couldn't load headlines right now."}
          </p>
        ) : (
          <ul role="list" className="mt-2 flex flex-col gap-2">
            {headlines.map((article) => {
              const when = timeAgo(article.publishedAt);
              return (
                <li key={article.id}>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[34px] flex-col gap-0.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug group-hover:text-accent">
                      {article.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                      <span className="truncate">{article.source}</span>
                      {when && (
                        <>
                          <span aria-hidden className="text-border">•</span>
                          <span className="flex-none">{when}</span>
                        </>
                      )}
                      <ExternalLinkIcon
                        size={11}
                        aria-hidden
                        className="ml-auto flex-none opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---------------------------- actions ---------------------------- */}
      <div className="flex gap-2">
        <button type="button" onClick={onOpenCountry} className={action}>
          <CompassIcon size={13} aria-hidden />
          Full details
        </button>
        <button type="button" onClick={onOpenNews} className={action}>
          <NewsIcon size={13} aria-hidden />
          All news
        </button>
      </div>
    </div>
  );
}
