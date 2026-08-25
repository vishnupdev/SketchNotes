import type { AppId } from "@/store/useWorkspaceStore";

/**
 * Searching what is *in* the workspace, not just what it can do.
 *
 * The palette finds apps, PDF sections and themes by name. This is the other
 * half: the note where you wrote something, the task you can't find, the board
 * section you named badly. One field for "where do I go" and "where is my
 * thing".
 *
 * Two constraints shape the design:
 *
 *  - **Nothing may join the initial payload.** Reading every app's data means
 *    touching every app's storage module, so the providers live in a separate
 *    module (`./providers.ts`) that is imported on the first search and never
 *    before. This file holds only the types and the loader, so the palette can
 *    reference them for free (rule #7).
 *  - **No app owns it.** A provider reads through each app's own data API and
 *    returns plain rows; the search knows nothing about tasks or sections, and no
 *    app knows it is being searched (rules #4/#5).
 */

export interface ContentHit {
  /** Stable within one search, for React keys. */
  id: string;
  app: AppId;
  /** The line to show — a note title, a task, a section name. */
  title: string;
  /** The matching text in context, trimmed to something readable. */
  snippet?: string;
  /**
   * What to focus once the app is open, if it can focus anything. Consumed via
   * `useFocusStore`; apps that can't focus simply open.
   */
  target?: string;
  /** For ordering within a run of hits from the same app. */
  updatedAt?: number;
}

export interface ContentProvider {
  app: AppId;
  /** Rows matching `query` (already lowercased and trimmed), newest first. */
  find: (query: string, limit: number) => Promise<ContentHit[]>;
}

/** Shortest query worth searching data for; below this the noise wins. */
export const MIN_CONTENT_QUERY = 3;

type ProviderModule = { providers: ContentProvider[] };
let loaded: Promise<ProviderModule> | null = null;

/** Load the data readers on first use, and only then. */
function providers(): Promise<ProviderModule> {
  if (!loaded) loaded = import("./providers");
  return loaded;
}

/**
 * Search everything the workspace holds.
 *
 * Providers run in parallel and a slow or broken one is skipped rather than
 * allowed to fail the search — a corrupt board should not make it impossible to
 * find a note.
 */
export async function searchContent(rawQuery: string, perApp = 3): Promise<ContentHit[]> {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < MIN_CONTENT_QUERY) return [];

  const { providers: list } = await providers();
  const results = await Promise.all(
    list.map((provider) =>
      provider.find(query, perApp).catch(() => [] as ContentHit[]),
    ),
  );

  return results
    .flat()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 8);
}

/**
 * A readable window around the match.
 *
 * Shown because the title alone often isn't the thing that matched — finding a
 * note by a phrase in its middle is the whole point, and a hit with no visible
 * reason for being there reads like a bug.
 */
export function snippetAround(text: string, query: string, width = 70): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const at = flat.toLowerCase().indexOf(query);
  if (at < 0) return flat.slice(0, width);
  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(flat.length, start + width);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}
