"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useNewsStore } from "@/store/useNewsStore";
import { useNews } from "@/hooks/useNews";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { NewsTabs } from "@/components/News/molecules/NewsTabs";
import { NewsFeed } from "@/components/News/organisms/NewsFeed";
import { newsTabById } from "@/lib/News/catalog";
import { cx } from "@/lib/utils";
import { AppsIcon, NewsIcon, RefreshIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

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
  const { online } = useNetworkStatus();

  const tabLabel = newsTabById(activeTab)?.label ?? "News";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-3.5 pt-[22px]">
        <div className="mx-auto flex max-w-[900px] flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <AppBrand
              icon={<NewsIcon size={26} />}
              name="News"
              tagline="latest headlines, by category"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={!online}
                title={online ? "Refresh headlines" : "Offline — saved headlines are shown"}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text"
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

      <AppFooter />
    </div>
  );
}
