import type { NewsArticle } from "./types";

/**
 * Minimal, dependency-free RSS parser for Google News feeds. The feeds are
 * well-formed and predictable, so a few scoped regexes are lighter than pulling
 * in an XML library — and this runs server-side in the `/api/news` route where
 * no DOMParser exists. Only the fields we render are extracted.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decode the handful of XML/HTML entities that appear in feed titles. */
function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

/** Strip a `<![CDATA[…]]>` wrapper if present, then decode entities. */
function clean(raw: string | undefined): string {
  if (!raw) return "";
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : raw).trim());
}

function tagContent(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1];
}

/** Parse a Google News RSS document into normalized articles. */
export function parseNewsRss(xml: string): NewsArticle[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const articles: NewsArticle[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const link = clean(tagContent(item, "link"));
    if (!link || seen.has(link)) continue;

    let title = clean(tagContent(item, "title"));
    const source = clean(tagContent(item, "source"));
    // Google News suffixes titles with " - <Source>"; drop it when redundant.
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }
    if (!title) continue;

    const pubDate = clean(tagContent(item, "pubDate"));
    let publishedAt: string | null = null;
    if (pubDate) {
      const ts = Date.parse(pubDate);
      if (!Number.isNaN(ts)) publishedAt = new Date(ts).toISOString();
    }

    seen.add(link);
    articles.push({ id: link, title, link, source: source || "News", publishedAt });
  }

  return articles;
}
