"use client";

import { useRef, useState } from "react";
import { useNews } from "@/hooks/useNews";
import { NewsCard } from "@/components/News/molecules/NewsCard";
import { NewsPagination } from "@/components/News/molecules/NewsPagination";
import { NewsIcon } from "@/components/SketchNotes/atoms/icons";

/** Headlines shown per page — keeps the mobile feed to a short, tidy scroll. */
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

/** Placeholder cards shown while the first request for a tab is in flight. */
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl border border-border bg-panel p-4"
        >
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
 * The headline list for the active tab. Owns its own loading / error / empty
 * states so the shell stays simple. Keyed by tab in the parent, so switching
 * tabs remounts it and each tab keeps its own cached data.
 */
export function NewsFeed({ tabId }: { tabId: string }) {
  const { data, isLoading, isError, refetch } = useNews(tabId);
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <FeedSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <NewsIcon size={34} className="text-ink-soft" />
        <p className="text-[14px] font-semibold">Couldn&apos;t load the latest news.</p>
        <p className="max-w-[320px] text-[12.5px] text-ink-soft">
          Check your connection and try again — news needs a live network.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <NewsIcon size={34} className="text-ink-soft" />
        <p className="text-[14px] font-semibold">No headlines right now.</p>
        <p className="text-[12.5px] text-ink-soft">Try another category or refresh.</p>
      </div>
    );
  }

  const pageCount = Math.ceil(data.length / PAGE_SIZE);
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = data.slice(start, start + PAGE_SIZE);

  function goToPage(next: number) {
    setPage(next);
    // Return the reader to the top of the feed so the new page starts fresh.
    const scroller = scrollableParent(topRef.current);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div ref={topRef}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
      <NewsPagination page={safePage} pageCount={pageCount} onPage={goToPage} />
    </div>
  );
}
