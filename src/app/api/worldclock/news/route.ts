import { NextResponse } from "next/server";
import {
  COUNTRY_BY_CODE,
  countryEditionUrl,
  countryHasEnglishEdition,
  countrySearchUrl,
} from "@/lib/WorldClock/countries";
import { parseNewsRss } from "@/lib/rss/parse-rss";
import type { FeedArticle } from "@/lib/rss/types";
import type { CountryNewsResponse } from "@/lib/WorldClock/news-api";

// Always run on the server at request time — the feed is live and per-country.
export const dynamic = "force-dynamic";

const MAX_ARTICLES = 30;

/**
 * Below this many articles a source is treated as too thin to stand alone, and
 * the other source is merged in behind it.
 */
const THIN_FEED = 6;

const FEED_HEADERS = {
  // Google News serves an empty feed to clients without a UA string.
  "User-Agent": "Mozilla/5.0 (compatible; OneApp-WorldClock/1.0; +https://github.com)",
  Accept: "application/rss+xml, application/xml, text/xml",
};

/** Fetch and parse one Google News RSS URL; [] on any upstream trouble. */
async function loadFeed(url: string): Promise<FeedArticle[]> {
  try {
    const res = await fetch(url, {
      headers: FEED_HEADERS,
      // Cache the upstream RSS briefly so browsing several countries in a row
      // isn't a fetch storm.
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    return parseNewsRss(await res.text());
  } catch {
    return [];
  }
}

/**
 * Country headlines proxy. Fetches Google News for the requested country
 * server-side (avoiding browser CORS limits and keeping our origin as the only
 * thing the client talks to), parses it to JSON and returns the headlines.
 *
 *   GET /api/worldclock/news?country=JP
 *
 * Which source leads depends on whether the country has a real English edition
 * (see `countryHasEnglishEdition`). For English-speaking countries the edition
 * is genuinely "news in this country" and leads. For everywhere else asking for
 * an English edition silently returns a generic international feed — Japan's
 * headlines come back identical to America's — so an English search for the
 * country leads instead, which is at least unmistakably about that place.
 *
 * Whichever source leads, the other is merged in behind it when the first comes
 * back thin, so a quiet country still fills a page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("country") || "").toUpperCase();
  const country = COUNTRY_BY_CODE[code];

  if (!country) {
    return NextResponse.json({ error: "Unknown country." }, { status: 400 });
  }

  const useEdition = countryHasEnglishEdition(country);
  const primaryUrl = useEdition ? countryEditionUrl(country) : countrySearchUrl(country);
  const backupUrl = useEdition ? countrySearchUrl(country) : countryEditionUrl(country);

  let articles = await loadFeed(primaryUrl);

  if (articles.length < THIN_FEED) {
    const backup = await loadFeed(backupUrl);
    // Merge rather than replace, de-duped by link, so whatever the primary did
    // return keeps the top of the list where it belongs.
    const seen = new Set(articles.map((a) => a.link));
    articles = [...articles, ...backup.filter((a) => !seen.has(a.link))];
  }

  if (articles.length === 0) {
    return NextResponse.json({ error: "Could not reach the news service." }, { status: 502 });
  }

  const body: CountryNewsResponse = {
    country: country.code,
    articles: articles.slice(0, MAX_ARTICLES),
  };

  return NextResponse.json(body, {
    headers: {
      // Let the browser/CDN reuse the response for 10 min, serve stale for 20.
      "Cache-Control": "public, max-age=600, stale-while-revalidate=1200",
    },
  });
}
