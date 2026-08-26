/**
 * Snippets: the record shape, and the search over it.
 *
 * Kept separate from the store so the filtering is a pure function of
 * (snippets, query) — which is the part with edge cases worth reasoning about,
 * and the part a store makes awkward to think about.
 */

export interface Snippet {
  id: string;
  title: string;
  /** A language id from `highlight.ts`. */
  language: string;
  body: string;
  /** Lower-cased, de-duplicated, no leading hash. */
  tags: string[];
  createdAt: number;
  updatedAt: number;
  /** Bumped on copy — a snippet copied often is worth surfacing. */
  copies: number;
}

/** Longest a snippet body may be. Generous for code, short of a whole file. */
export const MAX_BODY = 40_000;
export const MAX_TITLE = 120;
export const MAX_TAGS = 8;

/** Split a typed tag string ("api, auth #jwt") into clean tags. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,\s]+/)) {
    const tag = part.trim().replace(/^#/, "").toLowerCase();
    if (tag) seen.add(tag.slice(0, 24));
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

/**
 * Search snippets.
 *
 * A single box handles all three axes, because typing is faster than operating
 * three controls: bare words match the title, tags and body; `#tag` restricts to
 * a tag; `lang:go` restricts to a language. Every term must match (AND), which is
 * what makes adding a word narrow the list — the behaviour people expect from a
 * search box even when they could not describe it.
 */
export function searchSnippets(snippets: Snippet[], query: string): Snippet[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return snippets;

  return snippets.filter((snippet) => {
    const haystack = `${snippet.title}\n${snippet.tags.join(" ")}\n${snippet.body}`.toLowerCase();

    return terms.every((term) => {
      if (term.startsWith("#")) {
        const want = term.slice(1);
        // A partial tag still matches, so "#au" narrows to "auth" while typing.
        return want === "" || snippet.tags.some((tag) => tag.includes(want));
      }
      if (term.startsWith("lang:")) {
        const want = term.slice(5);
        return want === "" || snippet.language.includes(want);
      }
      return haystack.includes(term);
    });
  });
}

/** Every tag in use, most-used first — the tag bar under the search box. */
export function tagCounts(snippets: Snippet[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const snippet of snippets) {
    for (const tag of snippet.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export type SnippetSort = "updated" | "created" | "title" | "copies";

export const SORTS: { id: SnippetSort; label: string }[] = [
  { id: "updated", label: "Last edited" },
  { id: "copies", label: "Most used" },
  { id: "title", label: "Title" },
  { id: "created", label: "Newest" },
];

export function sortSnippets(snippets: Snippet[], sort: SnippetSort): Snippet[] {
  const out = snippets.slice();
  switch (sort) {
    case "updated":
      return out.sort((a, b) => b.updatedAt - a.updatedAt);
    case "created":
      return out.sort((a, b) => b.createdAt - a.createdAt);
    case "copies":
      // Ties broken by recency, so a wall of never-copied snippets is not
      // ordered arbitrarily.
      return out.sort((a, b) => b.copies - a.copies || b.updatedAt - a.updatedAt);
    case "title":
      return out.sort((a, b) => a.title.localeCompare(b.title));
  }
}

/** A short preview line for the card — the first line with anything on it. */
export function previewLine(body: string): string {
  const line = body.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.trim().slice(0, 120);
}
