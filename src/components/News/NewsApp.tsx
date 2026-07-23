"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useNewsStore } from "@/store/useNewsStore";
import { useNews } from "@/hooks/useNews";
import { NewsTabs } from "@/components/News/molecules/NewsTabs";
import { NewsFeed } from "@/components/News/organisms/NewsFeed";
import { newsTabById } from "@/lib/News/catalog";
import { cx } from "@/lib/utils";
import { AppsIcon, NewsIcon, RefreshIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * News — latest headlines by category (Tech, Sports, Global, International,
 * India, Kerala, Local). Each tab is a Google News RSS feed fetched through our
 * own `/api/news` route and cached per tab via {@link useNews}. Rendered
 * natively; theme comes from the shared <body>. Mobile-first: the category bar
 * scrolls horizontally and cards reflow to a single column on narrow screens.
 */
export function NewsApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const activeTab = useNewsStore((s) => s.activeTab);
  const setActiveTab = useNewsStore((s) => s.setActiveTab);
  const { isFetching, refetch } = useNews(activeTab);

  const tabLabel = newsTabById(activeTab)?.label ?? "News";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-3.5 pt-[22px] md:static">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-on-accent shadow-[0_0_0_4px_var(--accent-soft)]">
                <NewsIcon size={26} />
              </span>
              <div>
                <div className="text-[27px] font-extrabold leading-none tracking-tight">News</div>
                <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                  latest headlines, by category
                </div>
                <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">by Vishnu P</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                title="Refresh headlines"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
              >
                <RefreshIcon size={15} className={cx(isFetching && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={openLauncher}
                title="Switch app"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
              >
                <AppsIcon size={15} />
                <span className="hidden sm:inline">Apps</span>
              </button>
            </div>
          </div>

          <NewsTabs active={activeTab} onSelect={setActiveTab} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-[80px] pt-5">
        <h2 className="sr-only">{tabLabel} headlines</h2>
        {/* Keyed by tab so each category mounts its own cached feed. */}
        <NewsFeed key={activeTab} tabId={activeTab} />
      </main>
    </div>
  );
}
