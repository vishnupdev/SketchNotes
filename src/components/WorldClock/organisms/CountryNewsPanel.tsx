"use client";

import { useEffect, useRef, useState } from "react";
import { useCountryNews } from "@/hooks/useCountryNews";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Flag } from "@/components/WorldClock/atoms/Flag";
import { CountryBrowser } from "@/components/WorldClock/molecules/CountryBrowser";
import { ArticleCard } from "@/components/SketchNotes/molecules/ArticleCard";
import { Pagination } from "@/components/SketchNotes/molecules/Pagination";
import { OfflineNotice } from "@/components/Offline/OfflineNotice";
import { NewsIcon, RefreshIcon } from "@/components/SketchNotes/atoms/icons";
import { COUNTRY_BY_CODE } from "@/lib/WorldClock/countries";
import { cx } from "@/lib/utils";

interface CountryNewsPanelProps {
  code: string | null;
  onSelect: (code: string) => void;
}

/** Headlines per page — keeps the mobile feed to a short, tidy scroll. */
const PAGE_SIZE = 8;

/** Nearest scrollable ancestor, so paging can return the reader to the top. */
function scrollableParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Placeholder cards shown while the first request for a country is in flight. */
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-border bg-panel p-4">
          <div className="size-11 shrink-0 animate-pulse rounded-xl bg-ink-soft/20" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-ink-soft/20" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink-soft/20" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-ink-soft/15" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Latest headlines for the country in focus.
 *
 * Headlines are the one thing in this app that genuinely needs the network —
 * clocks and country facts are all local — so the offline state says exactly
 * that rather than presenting a generic failure. Countries opened while online
 * are answered from the service worker's cache and stay readable with no
 * connection.
 */
export function CountryNewsPanel({ code, onSelect }: CountryNewsPanelProps) {
  const country = code ? COUNTRY_BY_CODE[code] : undefined;
  const { data, isLoading, isError, isFetching, refetch } = useCountryNews(country?.code ?? null);
  const { online } = useNetworkStatus();
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  // A different country is a different feed — start it at page one rather than
  // dropping the reader onto page 4 of a list they've never seen.
  useEffect(() => {
    setPage(1);
  }, [code]);

  if (!country) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-panel p-5 text-center">
          <NewsIcon size={30} aria-hidden className="mx-auto text-ink-soft" />
          <p className="mt-3 text-[14px] font-semibold">Pick a country to read its news</p>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[12.5px] leading-relaxed text-ink-soft">
            Headlines come from that country's own news edition, in English.
          </p>
        </div>
        <CountryBrowser onSelect={onSelect} />
      </div>
    );
  }

  const header = (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Flag code={country.code} width={34} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[17px] font-bold leading-tight tracking-[.1px]">
          Latest from {country.name}
        </h2>
        <p className="truncate text-[11.5px] text-ink-soft">Top stories, updated through the day</p>
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={!online}
        title={online ? "Refresh headlines" : "Offline — saved headlines are shown"}
        aria-label={`Refresh headlines from ${country.name}`}
        className="inline-flex flex-none items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <RefreshIcon size={15} className={cx(isFetching && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <FeedSkeleton />
      </div>
    );
  }

  if (isError && !online) {
    return (
      <div>
        {header}
        <OfflineNotice
          title={`No saved headlines for ${country.name}`}
          action={{ label: "Try again", onClick: () => void refetch() }}
        >
          News is the only part of this app that needs a connection — the clocks and every
          country detail still work. Countries you opened while online stay readable here.
        </OfflineNotice>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        {header}
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <NewsIcon size={34} aria-hidden className="text-ink-soft" />
          <p className="text-[14px] font-semibold">
            Couldn&apos;t load headlines from {country.name}.
          </p>
          <p className="max-w-[320px] text-[12.5px] text-ink-soft">
            Check your connection and try again — news needs a live network.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div>
        {header}
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <NewsIcon size={34} aria-hidden className="text-ink-soft" />
          <p className="text-[14px] font-semibold">No headlines right now.</p>
          <p className="text-[12.5px] text-ink-soft">Try another country or refresh.</p>
        </div>
      </div>
    );
  }

  const pageCount = Math.ceil(data.length / PAGE_SIZE);
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = data.slice(start, start + PAGE_SIZE);

  function goToPage(next: number) {
    setPage(next);
    const scroller = scrollableParent(topRef.current);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div ref={topRef}>
      {header}
      {!online && (
        <OfflineNotice title="Offline" variant="inline" className="mb-3">
          these are the headlines saved on your device
        </OfflineNotice>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      <Pagination
        page={safePage}
        pageCount={pageCount}
        onPage={goToPage}
        label={`${country.name} news pages`}
      />
    </div>
  );
}
