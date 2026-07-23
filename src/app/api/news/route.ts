import { NextResponse } from "next/server";
import { DEFAULT_NEWS_TAB, newsFeedUrl, newsTabById } from "@/lib/News/catalog";
import { parseNewsRss } from "@/lib/News/parse-rss";
import type { NewsFeedResponse } from "@/lib/News/types";

// Always run on the server at request time — the feed is live and per-tab.
export const dynamic = "force-dynamic";

const MAX_ARTICLES = 40;

/**
 * News feed proxy. Fetches the Google News RSS feed for the requested tab
 * server-side (avoiding browser CORS limits and keeping our origin as the only
 * thing the client talks to), parses it to JSON and returns the headlines.
 *
 *   GET /api/news?tab=tech
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tabId = searchParams.get("tab") || DEFAULT_NEWS_TAB;
  const tab = newsTabById(tabId);

  if (!tab) {
    return NextResponse.json({ error: "Unknown news tab." }, { status: 400 });
  }

  try {
    const res = await fetch(newsFeedUrl(tab.feed), {
      headers: {
        // Google News serves an empty feed to clients without a UA string.
        "User-Agent":
          "Mozilla/5.0 (compatible; OneApp-News/1.0; +https://github.com)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      // Cache the upstream RSS briefly so rapid tab-switching isn't a fetch storm.
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream feed responded ${res.status}.` },
        { status: 502 },
      );
    }

    const xml = await res.text();
    const articles = parseNewsRss(xml).slice(0, MAX_ARTICLES);
    const body: NewsFeedResponse = { tab: tab.id, articles };

    return NextResponse.json(body, {
      headers: {
        // Let the browser/CDN reuse the response for 5 min, serve stale for 10.
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the news service." },
      { status: 502 },
    );
  }
}
