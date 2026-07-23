/**
 * News app catalog — the single source of truth for the tabs shown in the News
 * feed and the Google News RSS feed each one maps to. Imported by both the
 * client (tab bar labels, default tab) and the server route (`/api/news`) that
 * actually fetches the feed, so tab ids never drift between the two.
 */

/** A tab either pulls a Google News topic section or runs a keyword search. */
export type NewsFeed = { topic: string } | { search: string };

export interface NewsTab {
  /** Stable id used in URLs, query keys and the `?tab=` API param. */
  id: string;
  /** Human label shown on the tab. */
  label: string;
  /** Which Google News feed backs this tab. */
  feed: NewsFeed;
}

/**
 * Region locale for Google News. India-English so India/Kerala/Local tabs are
 * relevant; topic tabs (tech, sports, world) still return global coverage.
 */
export const NEWS_LOCALE = "hl=en-IN&gl=IN&ceid=IN:en";

export const NEWS_TABS: NewsTab[] = [
  { id: "tech", label: "Tech News", feed: { topic: "TECHNOLOGY" } },
  { id: "sports", label: "Sports", feed: { topic: "SPORTS" } },
  { id: "india", label: "National", feed: { topic: "NATION" } },
  { id: "international", label: "International", feed: { search: "international news" } },
  { id: "local", label: "Local", feed: { search: "Kerala district local news" } },
  { id: "kerala", label: "State", feed: { search: "Kerala state news" } },
];

export const DEFAULT_NEWS_TAB = NEWS_TABS[0].id;

export function newsTabById(id: string): NewsTab | undefined {
  return NEWS_TABS.find((t) => t.id === id);
}

/** Build the Google News RSS URL backing a tab. */
export function newsFeedUrl(feed: NewsFeed): string {
  if ("topic" in feed) {
    return `https://news.google.com/rss/headlines/section/topic/${feed.topic}?${NEWS_LOCALE}`;
  }
  return `https://news.google.com/rss/search?q=${encodeURIComponent(feed.search)}&${NEWS_LOCALE}`;
}
