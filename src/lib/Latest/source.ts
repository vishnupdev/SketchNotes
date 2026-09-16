/**
 * The live half of the catalogue: what has been *newly listed* since the
 * curated snapshot was written.
 *
 * ## Why this exists at all
 *
 * A curated catalogue is the only way to give televisions and monitors a
 * complete sheet — nothing enumerates them (see `categories.ts`). But a purely
 * curated "latest products" app has a clock running against it from the moment
 * it ships: the list is exactly as current as the last time someone edited it,
 * and nothing on screen would tell a reader that. This module is the
 * counterweight. It reads the encyclopedia's own "introduced in <year>"
 * categories, which are maintained by the people writing the articles, so the
 * app keeps surfacing releases nobody here has typed in.
 *
 * ## Why it is a *different shape* from the curated half, deliberately
 *
 * These rows carry a one-line description, not a spec sheet, and they are
 * typed as {@link FeedItem} rather than `Product` so that the compiler forbids
 * rendering one as though it had specifications. That is the single most
 * important property of this file: the app's promise is a complete sheet for
 * every row it presents as a product, and a live row cannot keep that promise,
 * so it is never presented as one.
 *
 * ## Isolation
 *
 * Spec Analyser reads the same upstream and this module does not import any of
 * it (CLAUDE.md rule #5). The overlap is about forty lines of fetch plumbing;
 * the alternative is two apps that break together, which is precisely what
 * rule #5 exists to prevent. What is *not* duplicated is the expensive half —
 * Spec Analyser's wikitext and infobox parser — because nothing here needs it.
 *
 * Everything runs on the server (`src/app/api/latest/feed`), which keeps the
 * browser talking only to this origin and lets one cache serve every visitor.
 */

import { categoryById, type Category } from "./categories";
import type { FeedItem } from "./types";

const API = "https://en.wikipedia.org/w/api.php";

/** Identifies this app to the API, as its etiquette guidelines ask. */
const HEADERS = {
  "User-Agent": "OneApp-LatestTech/1.0 (https://oneappready.vercel.app; new product listings)",
  Accept: "application/json",
};

/** Long enough for a cold upstream, short enough that the UI fails visibly. */
const UPSTREAM_TIMEOUT_MS = 9000;

interface ApiPage {
  title?: string;
  description?: string;
  thumbnail?: { source?: string };
  pageprops?: { disambiguation?: string };
}

async function callApi<T>(params: Record<string, string>, revalidate: number): Promise<T> {
  const query = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(`${API}?${query}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Pages that sit in a product category without being products.
 *
 * Two shapes, and both turn up constantly. The *index* articles ("List of…",
 * "Comparison of…") match every category; and when you enumerate rather than
 * search, the makers' own corporate articles appear too, because a company is
 * filed under its own products.
 */
const NOT_A_PRODUCT =
  /^(?:List|Index|Outline|Comparison|Timeline|History|Development|Criticism|Reception|Design)\s+of\b/i;

const NOT_A_THING_YOU_BUY =
  /\b(?:company|corporation|manufacturer|conglomerate|subsidiary|trade name|brand of|protocol|standard|form factor|operating system|class of|type of)\b/i;

/** Article titles carry a bracketed disambiguator that a product name should not. */
const displayName = (title: string): string => title.replace(/\s*\([^)]*\)\s*$/, "").trim() || title;

const isUsable = (page: ApiPage): boolean => {
  const title = page.title ?? "";
  if (!title) return false;
  if (page.pageprops?.disambiguation !== undefined) return false;
  if (NOT_A_PRODUCT.test(title)) return false;
  if (/^(?:Category|Template|Help|Portal|Wikipedia|File):/i.test(title)) return false;
  if (NOT_A_THING_YOU_BUY.test(page.description ?? "")) return false;
  return true;
};

const toItem = (page: ApiPage): FeedItem => {
  const title = page.title ?? "";
  return {
    title,
    name: displayName(title),
    description: page.description ?? "",
    image: page.thumbnail?.source ?? null,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
};

/**
 * The release year stated in a page's own one-line description.
 *
 * These are written to a house style that almost always opens with the year —
 * "2026 smartphone by Apple" — and it is the only ordering signal a category
 * listing carries: the API returns members in page-id order, which is the order
 * somebody happened to *write* the article, and is meaningless to a reader
 * looking for what is new.
 */
function describedYear(description: string): number {
  const match = /\b(19\d{2}|20\d{2})\b/.exec(description);
  return match ? Number(match[1]) : 0;
}

/** Newest first; undated rows last, alphabetically, rather than interleaved. */
function byNewest(a: FeedItem, b: FeedItem): number {
  const years = describedYear(b.description) - describedYear(a.description);
  if (years !== 0) return years;

  const described = Number(!!b.description) - Number(!!a.description);
  if (described !== 0) return described;

  return a.name.localeCompare(b.name);
}

/** Everything in one category of the encyclopedia, filtered to products. */
async function membersOf(category: string, limit: number): Promise<FeedItem[]> {
  const data = await callApi<{ query?: { pages?: ApiPage[] } }>(
    {
      action: "query",
      generator: "categorymembers",
      gcmtitle: `Category:${category}`,
      // Over-fetch, because the filters below discard the indexes and the
      // corporate articles and a limit applied upstream would count those.
      gcmlimit: String(Math.min(500, limit * 3)),
      gcmnamespace: "0",
      gcmtype: "page",
      prop: "description|pageimages|pageprops",
      piprop: "thumbnail",
      pithumbsize: "160",
      ppprop: "disambiguation",
    },
    // Twelve hours. A category gains a member when somebody writes an article,
    // which is not a timescale worth re-fetching against.
    43_200,
  );

  return (data.query?.pages ?? []).filter(isUsable).map(toItem).sort(byNewest).slice(0, limit);
}

/**
 * The newest listings for one category of product, for one year.
 *
 * Always a by-year category — `Mobile phones introduced in 2026` — because
 * membership in one *is* a release date. There is deliberately no fallback to a
 * standing category for the kinds that have no yearly list: see the note on
 * `FeedSource` in `categories.ts`, where an earlier draft's version of exactly
 * that fallback is recorded, along with the 1995 graphics card it put at the
 * top of a list headed "Newly listed".
 *
 * A category with no feed (televisions, monitors, smartwatches, headphones) is
 * not an error and not a failed request: it returns nothing, and the UI says
 * why in words rather than showing an empty list that looks like a bug.
 */
export async function fetchFeed(categoryId: string, year?: number, limit = 60): Promise<FeedItem[]> {
  const category: Category = categoryById(categoryId);
  if (!category.feed) return [];

  // The current year is the sane default for a feed whose whole purpose is
  // recency — an absent year should not mean "all of history".
  const wanted = year ?? new Date().getUTCFullYear();
  return membersOf(category.feed.yearly.replace("%Y", String(wanted)), limit);
}
