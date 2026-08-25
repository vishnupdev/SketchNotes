import { NextResponse } from "next/server";
import { KIND_FILTERS, MAX_QUERY_LENGTH, MAX_RESULTS } from "@/lib/Streams/catalog";
import { parseSearchResults } from "@/lib/Streams/parse-youtube";
import type { StreamKind, StreamSearchResponse } from "@/lib/Streams/types";

// The results are live - what is broadcasting right now changes by the minute -
// so this is answered per request rather than baked at build time.
export const dynamic = "force-dynamic";

/**
 * Streams search proxy: runs a YouTube search server-side and returns the
 * results as JSON.
 *
 *   GET /api/streams?q=lofi%20radio&kind=live
 *
 * Server-side for three reasons. The browser cannot read youtube.com directly
 * (no CORS headers), so this is the only place the search can happen at all;
 * our origin stays the only host the client talks to, which is what keeps the
 * offline worker able to replay a search; and the results page is a megabyte of
 * markup that would be a poor thing to send to a phone - the client receives
 * only the two dozen small records it draws.
 *
 * Playback itself never comes through here: a chosen video is played by
 * YouTube's own embed, on YouTube's domain, so views count for the creator and
 * their terms apply exactly as they do on youtube.com.
 */

const KINDS: StreamKind[] = ["music", "live", "video"];

/**
 * A desktop browser's identity. YouTube serves the lightweight, no-JS variant
 * of the results page to unrecognised clients, and that variant carries no
 * `ytInitialData` - so without this the parser has nothing to read.
 */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
} as const;

/**
 * How long a search may be reused. A live listing goes out of date quickly -
 * a stream that ended is a card that plays nothing - while a genre station is
 * the same music all afternoon, so it is cached far longer.
 */
const revalidateFor = (kind: StreamKind): number => (kind === "live" ? 120 : 900);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const rawKind = searchParams.get("kind") ?? "video";
  const kind = KINDS.includes(rawKind as StreamKind) ? (rawKind as StreamKind) : "video";

  if (!query) {
    return NextResponse.json({ error: "Nothing to search for." }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "That search is too long." }, { status: 400 });
  }

  const filter = KIND_FILTERS[kind];
  const url =
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` +
    (filter ? `&sp=${filter}` : "") +
    "&hl=en&gl=US";

  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      next: { revalidate: revalidateFor(kind) },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `YouTube responded ${res.status}.` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const videos = parseSearchResults(html, MAX_RESULTS);
    const body: StreamSearchResponse = { query, kind, videos };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": `public, max-age=${revalidateFor(kind)}, stale-while-revalidate=1800`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach YouTube." }, { status: 502 });
  }
}
