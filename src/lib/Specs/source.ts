/**
 * Where the product data comes from.
 *
 * Wikipedia, read through its own API, on the server. Three things made it the
 * choice over a product-database service:
 *
 *  - **No key and no account.** Nothing else in this workspace needs a secret,
 *    and a spec lookup that only works when a key is provisioned is a feature
 *    most visitors would never see work.
 *  - **It covers "anything".** A phone, a car, a mirrorless camera, a games
 *    console, a washing machine and an airliner are all in the same corpus, in
 *    the same shape. Every commercial product API is vertical — phones *or*
 *    cars — and gluing four of them together would mean four failure modes.
 *  - **It is checkable.** Every sheet this app renders links back to the
 *    article it was read from, at the revision it was read, so a reader can go
 *    and see whether the app read it right. A proprietary feed can't offer that.
 *
 * The cost is stated plainly in the UI rather than hidden: coverage is
 * article-shaped. Famous products have deep sheets; a mid-range appliance may
 * have no article at all, and the app says so instead of showing a thin sheet
 * as if it were the whole truth.
 *
 * Everything here runs on the server (see `src/app/api/specs/`), which keeps the
 * browser talking only to this origin, lets the responses be cached for
 * everyone, and sends the descriptive User-Agent the API's etiquette asks for.
 */

import { CATEGORY_LABELS, detectCategory, groupFields } from "./categories";
import { extractMeasures } from "./measure";
import { linkedTitles, parseInfobox, rawField } from "./wikitext";
import type { Measure, ProductHit, ProductImage, ProductRecord, RelatedProduct } from "./types";

const API = "https://en.wikipedia.org/w/api.php";

/**
 * Identifies this app to the API, as its etiquette guidelines ask. A request
 * without one is throttled or refused outright.
 */
const HEADERS = {
  "User-Agent":
    "OneApp-SpecAnalyser/1.0 (https://oneappready.vercel.app; product specification lookup)",
  Accept: "application/json",
};

/** Long enough for a cold upstream, short enough that the UI fails visibly. */
const UPSTREAM_TIMEOUT_MS = 9000;

interface SearchPage {
  index?: number;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
  pageprops?: { wikibase_item?: string; disambiguation?: string };
  revisions?: { slots?: { main?: { content?: string } } }[];
}

async function callApi<T>(params: Record<string, string>, revalidate: number): Promise<T> {
  const query = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(`${API}?${query}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Wikipedia responded ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Files that are on nearly every article and are not pictures of anything: the
 * project's own logos, the maintenance-banner icons, the little speaker beside
 * a pronunciation. Dropping them is what turns "every file on the page" into a
 * product gallery — without it the first thumbnail a reader sees is the Commons
 * logo.
 */
const FURNITURE =
  /^(?:Commons|Wikidata|Wiktionary|Wikisource|Wikiquote|Wikibooks|Wikinews|Wikiversity|Wikispecies)[-_]|^(?:Portal|Edit|Ambox|Question[_ ]book|Symbol|Folder|Nuvola|Crystal|Text[_ ]document|Emblem|Padlock|Semi-protection|OOjs|Wiki[_ ]letter|Speaker|Loudspeaker|Sound[-_]icon|Office-book|Star[_ ]full|Yes[_ ]check|X[_ ]mark|Red[_ ]x|Green[_ ]check|Increase2?|Decrease2?|Steady)/i;

/** Formats a browser will draw. Articles also carry .ogg, .webm and .pdf. */
const DRAWABLE = /^image\/(?:jpeg|png|svg\+xml|webp|gif)$/;

interface ImagePage {
  title?: string;
  imageinfo?: {
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    width?: number;
    height?: number;
    mime?: string;
  }[];
}

/**
 * Every usable picture on an article, largest first.
 *
 * A separate request from the sheet because it needs `generator=images`, which
 * replaces the page set the sheet's own query is built on — the two cannot share
 * one call. It is issued in parallel and is allowed to fail: a sheet with no
 * pictures is a complete sheet, and losing the specifications because a gallery
 * request timed out would be a bad trade.
 */
async function fetchImages(title: string): Promise<ProductImage[]> {
  const data = await callApi<{ query?: { pages?: ImagePage[] } }>(
    {
      action: "query",
      titles: title,
      redirects: "1",
      generator: "images",
      gimlimit: "40",
      prop: "imageinfo",
      iiprop: "url|size|mime",
      iiurlwidth: "480",
    },
    21_600,
  );

  return (data.query?.pages ?? [])
    .map((page) => {
      const info = page.imageinfo?.[0];
      const name = (page.title ?? "").replace(/^File:/i, "");
      if (!info?.url || !name) return null;
      if (!DRAWABLE.test(info.mime ?? "")) return null;
      if (FURNITURE.test(name) || /\bicons?\b/i.test(name)) return null;

      return {
        title: name,
        // `thumburl` is absent for formats the server will not scale; the
        // original is then the only thing to show, which is correct for the
        // vector product renders where that happens.
        thumb: info.thumburl ?? info.url,
        full: info.url,
        width: info.width ?? 0,
        height: info.height ?? 0,
        creditUrl: info.descriptionurl ?? info.url,
      } satisfies ProductImage;
    })
    .filter((image): image is ProductImage => image !== null)
    // Biggest first: on these articles the photographs are megapixels and the
    // leftover badges are a few hundred pixels, so area sorts them for free.
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 10);
}

/** Article titles are stored with a leading capital; display drops the odd one. */
const displayName = (title: string): string => title.replace(/\s*\([^)]*\)\s*$/, "").trim() || title;

/**
 * A page is a product candidate if it isn't one of the encyclopedia's own
 * navigational pages. Disambiguation pages, list articles and category indexes
 * match product searches constantly ("Royal Enfield" → "List of Royal Enfield
 * motorcycles") and never have a spec sheet behind them.
 */
function isCandidate(page: SearchPage): boolean {
  const title = page.title ?? "";
  if (!title) return false;
  if (page.pageprops?.disambiguation !== undefined) return false;
  if (/^(?:List of|Index of|Outline of|Comparison of|Timeline of)\b/i.test(title)) return false;
  if (/^(?:Category|Template|Help|Portal|Wikipedia|File):/i.test(title)) return false;
  if (/\b(?:disambiguation)\b/i.test(page.description ?? "")) return false;
  return true;
}

const toHit = (page: SearchPage): ProductHit => ({
  title: page.title ?? "",
  name: displayName(page.title ?? ""),
  description: page.description ?? "",
  image: page.thumbnail?.source ?? null,
});

/**
 * Products matching a typed query, best match first.
 *
 * Search results are the app's own "similar products" engine as much as its
 * search: asking for "Sony a7 IV" brings back the α7 III and α7 V beside it,
 * because the encyclopedia's search already understands that a product's
 * closest neighbours are the other models in its line.
 */
export async function searchProducts(query: string, limit = 10): Promise<ProductHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const data = await callApi<{ query?: { pages?: SearchPage[] } }>(
    {
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrlimit: String(Math.min(20, limit + 6)),
      gsrnamespace: "0",
      prop: "description|pageimages|pageprops",
      piprop: "thumbnail",
      pithumbsize: "200",
      ppprop: "wikibase_item|disambiguation",
    },
    // Twelve hours: an article's existence and one-line description change on a
    // scale of months, and the sheet itself is fetched separately.
    43_200,
  );

  return (data.query?.pages ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .filter(isCandidate)
    .slice(0, limit)
    .map(toHit);
}

/**
 * Pages that sit in a product category without being products: the history
 * articles, the model indexes, the comparisons, and the parts and accessories
 * that get filed beside the things they belong to ("ThinkPad UltraBay",
 * "Pentalobe screw").
 *
 * {@link isCandidate} already rejects the index shapes. This adds the ones that
 * only show up when you enumerate a category rather than search.
 */
const NOT_A_PRODUCT = /^(?:History|Development|Timeline|Criticism|Reception|Comparison|Design)\s+of\b/i;

/**
 * Descriptions that belong to a company, a standard or an idea rather than to
 * something you could buy. A maker's own article sits in its products'
 * category — "Asus" is listed under Asus laptops — and so do the concepts
 * ("2-in-1 laptop") and the accessories' standards ("Microsoft pen protocol").
 *
 * Only applied when *browsing*. A search for "Samsung" should still be able to
 * return Samsung: there, naming the company may be exactly what was meant.
 */
const NOT_A_THING_YOU_BUY =
  /\b(?:company|corporation|manufacturer|conglomerate|brand of|subsidiary|trade name|protocol|standard|specification for|form factor|class of|type of computer|term for)\b/i;

/**
 * A page's release year, read from its one-line description.
 *
 * These descriptions are written to a house style that almost always opens with
 * the year — "2023 smartphone by Apple" — which is the only ordering signal a
 * category listing carries. Category members come back in page-id order, which
 * is the order the articles were *created*, and is meaningless to a reader.
 */
function describedYear(description: string | undefined): number {
  const match = /\b(19\d{2}|20\d{2})\b/.exec(description ?? "");
  return match ? Number(match[1]) : 0;
}

/**
 * Everything in one category, newest first.
 *
 * Browsing needs an enumeration, which search cannot give: "show me the phones"
 * has no query behind it. Categories are that enumeration, and they come from
 * the same API and the same cache as everything else here.
 *
 * Sorted by the year in each description, newest first, with the undated at the
 * end in alphabetical order — because the API's own order is by page id, which
 * is when somebody happened to write the article.
 */
export async function browseCategory(category: string, limit = 120): Promise<ProductHit[]> {
  const data = await callApi<{ query?: { pages?: SearchPage[] } }>(
    {
      action: "query",
      generator: "categorymembers",
      gcmtitle: `Category:${category}`,
      gcmlimit: String(Math.min(500, limit * 2)),
      gcmnamespace: "0",
      gcmtype: "page",
      prop: "description|pageimages|pageprops",
      piprop: "thumbnail",
      pithumbsize: "160",
      ppprop: "wikibase_item|disambiguation",
    },
    // Twelve hours: a category gains a member when somebody writes an article,
    // which is not a timescale worth re-fetching against.
    43_200,
  );

  return (data.query?.pages ?? [])
    .filter(
      (page) =>
        isCandidate(page) &&
        !NOT_A_PRODUCT.test(page.title ?? "") &&
        !NOT_A_THING_YOU_BUY.test(page.description ?? ""),
    )
    .map(toHit)
    .sort((a, b) => {
      // Dated first, newest first — the only ordering signal a category
      // listing carries, since the API's own order is by page id.
      const byYear = describedYear(b.description) - describedYear(a.description);
      if (byYear !== 0) return byYear;

      // Then anything described at all, before the stubs. A row that can say
      // what it is beats one that shows a bare title, and in these categories
      // the undescribed ones are overwhelmingly the thinnest articles.
      const described = Number(!!b.description) - Number(!!a.description);
      if (described !== 0) return described;

      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

/** The relation rows an article states, as titles that can be looked up. */
function relativesOf(wikitext: string): RelatedProduct[] {
  const out: RelatedProduct[] = [];
  const seen = new Set<string>();

  const rows: [key: string, relation: RelatedProduct["relation"]][] = [
    ["predecessor", "predecessor"],
    ["successor", "successor"],
    ["related", "related"],
  ];

  for (const [key, relation] of rows) {
    const raw = rawField(wikitext, key);
    if (!raw) continue;
    for (const title of linkedTitles(raw)) {
      if (seen.has(title)) continue;
      seen.add(title);
      out.push({ title, relation });
    }
  }
  return out;
}

/** The first field present out of several candidates. */
const firstOf = (
  fields: { key: string; value: string }[],
  keys: string[],
): string | null => {
  for (const key of keys) {
    const hit = fields.find((f) => f.key === key);
    if (hit) return hit.value;
  }
  return null;
};

/**
 * Fill in the release year from the article's one-line description when the
 * infobox has no date row.
 *
 * Whole categories of infobox simply have no date field — `Infobox camera` is
 * the clearest case — while the description beside it opens with the year
 * ("2021 full-frame mirrorless camera") almost without exception. Taking it
 * from there is still reading it off the source, and the alternative is scoring
 * every camera ever made as undated.
 */
function withYear(measures: Measure[], description: string): Measure[] {
  if (measures.some((m) => m.id === "year")) return measures;

  const year = /\b(19\d{2}|20\d{2})\b/.exec(description);
  if (!year) return measures;

  return [
    ...measures,
    {
      id: "year",
      value: Number(year[1]),
      unit: "",
      reading: year[1],
      from: "Description",
    },
  ];
}

/** Raised when an article exists but holds no specification table. */
export class NoSpecsError extends Error {
  readonly title: string;
  constructor(title: string) {
    super(`"${title}" has an article, but no specification table in it.`);
    this.name = "NoSpecsError";
    this.title = title;
  }
}

/** Raised when nothing by that title exists. */
export class NoArticleError extends Error {
  constructor(title: string) {
    super(`No article called "${title}".`);
    this.name = "NoArticleError";
  }
}

/**
 * The full sheet for one product.
 *
 * One upstream request carries all of it — the wikitext, the one-line
 * description, the lead image and the Wikidata id — so the prose, the picture
 * and the numbers are guaranteed to come from the same revision of the same
 * article. Assembling them from separate endpoints would let them drift apart,
 * which is the kind of error nobody ever notices.
 */
export async function fetchProduct(title: string): Promise<ProductRecord> {
  // The gallery is fetched alongside the sheet, not after it, so the pictures
  // cost no extra wait — and its failure is swallowed, because a sheet without
  // photographs is still a complete sheet.
  const gallery = fetchImages(title).catch(() => [] as ProductImage[]);

  const data = await callApi<{ query?: { pages?: SearchPage[] } }>(
    {
      action: "query",
      titles: title,
      redirects: "1",
      // The lead prose comes back as plain text from the same request as the
      // wikitext, so the paragraph above the specs and the specs themselves are
      // guaranteed to be the same revision of the same article — and the app
      // needs no prose parser of its own.
      prop: "revisions|extracts|description|pageimages|pageprops",
      rvprop: "content",
      rvslots: "main",
      // Section 0 only — the lead, which is where the infobox lives. A popular
      // product's article runs to 180 KB of prose, references and history, of
      // which the specification table is the first 5 KB; asking for the rest
      // made this the slowest request in the workspace for no added fact.
      rvsection: "0",
      exintro: "1",
      explaintext: "1",
      exsentences: "3",
      piprop: "thumbnail",
      pithumbsize: "480",
      ppprop: "wikibase_item",
    },
    // Six hours. Specs are settled facts about shipped products; the articles
    // that hold them change slowly, and a stale sheet is stamped with its date.
    21_600,
  );

  const page = data.query?.pages?.[0];
  const resolved = page?.title ?? title;
  const wikitext = page?.revisions?.[0]?.slots?.main?.content;
  if (!page || !wikitext) throw new NoArticleError(title);

  const box = parseInfobox(wikitext);
  if (!box || box.fields.length === 0) throw new NoSpecsError(resolved);

  const category = detectCategory(box);
  const groups = groupFields(box, category);
  const description = page.description ?? "";

  return {
    title: resolved,
    name: displayName(resolved),
    description,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    image: page.thumbnail?.source ?? null,
    summary: (page.extract ?? "").trim(),
    // Brand before factory. Where an article states both — a Nintendo console
    // "manufactured by Foxconn", a MacBook "manufactured by Pegatron" — the
    // name a reader is looking for is the one on the box, and the contract
    // manufacturer is still on the sheet under its own row.
    maker: firstOf(box.fields, ["brand", "developer", "manufacturer", "maker", "make", "designer"]),
    released: firstOf(box.fields, [
      "released",
      "release_date",
      "introduced",
      "date",
      "production",
      "model_years",
      "first_flight",
    ]),
    groups,
    measures: withYear(extractMeasures(groups, category), description),
    images: await gallery,
    relatives: relativesOf(wikitext),
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/ /g, "_"))}`,
    entityId: page.pageprops?.wikibase_item ?? null,
    readAt: new Date().toISOString(),
  };
}

/** Descriptions and pictures for titles already known — one request for all. */
export async function describeTitles(titles: string[]): Promise<Map<string, ProductHit>> {
  const wanted = titles.filter(Boolean).slice(0, 20);
  if (!wanted.length) return new Map();

  const data = await callApi<{ query?: { pages?: SearchPage[]; redirects?: { from: string; to: string }[] } }>(
    {
      action: "query",
      titles: wanted.join("|"),
      redirects: "1",
      prop: "description|pageimages|pageprops",
      piprop: "thumbnail",
      pithumbsize: "200",
      ppprop: "wikibase_item|disambiguation",
    },
    43_200,
  );

  const out = new Map<string, ProductHit>();
  for (const page of data.query?.pages ?? []) {
    if (!page.title || !isCandidate(page)) continue;
    out.set(page.title, toHit(page));
  }

  // A title that redirected has to answer to the name it was asked about, or
  // the caller can't match its relation rows back to the results.
  for (const { from, to } of data.query?.redirects ?? []) {
    const hit = out.get(to);
    if (hit) out.set(from, hit);
  }

  return out;
}

/**
 * Products worth comparing this one against.
 *
 * Two sources, in this order, because they answer different questions:
 *
 *  1. **What the article itself points at** — its predecessor, its successor,
 *     the models sold beside it. These are editorial, not inferred, and are the
 *     strongest comparison a reader could ask for.
 *  2. **What a search for its own kind returns** — "smartphone by Apple" brings
 *     back the rest of the line. Weaker, but it fills the gap for a product
 *     whose article states no relations at all.
 *
 * The product itself is excluded, and so is anything already named by (1), so
 * the weaker source never displaces the stronger one.
 */
export async function findSimilar(
  exclude: string,
  relatives: RelatedProduct[],
  like: string,
  limit = 12,
): Promise<RelatedProduct[]> {
  const named = relatives.slice(0, 12);
  const [described, searched] = await Promise.all([
    describeTitles(named.map((r) => r.title)),
    like.trim() ? searchProducts(like, limit).catch(() => [] as ProductHit[]) : Promise.resolve([] as ProductHit[]),
  ]);

  const out: RelatedProduct[] = [];
  const seen = new Set([exclude]);

  for (const relative of named) {
    const hit = described.get(relative.title);
    if (!hit || seen.has(hit.title)) continue;
    seen.add(hit.title);
    out.push({ title: hit.title, relation: relative.relation, description: hit.description, image: hit.image ?? undefined });
  }

  for (const hit of searched) {
    if (seen.has(hit.title) || out.length >= limit) continue;
    seen.add(hit.title);
    out.push({ title: hit.title, relation: "sibling", description: hit.description, image: hit.image ?? undefined });
  }

  return out.slice(0, limit);
}
