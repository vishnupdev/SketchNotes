"use client";

import { useNews } from "@/hooks/useNews";
import { NewsCard } from "@/components/News/molecules/NewsCard";
import { NewsIcon } from "@/components/SketchNotes/atoms/icons";

/** Placeholder cards shown while the first request for a tab is in flight. */
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-4"
        >
          <div className="h-4 w-11/12 animate-pulse rounded bg-ink-soft/20" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-ink-soft/20" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-ink-soft/15" />
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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {data.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
