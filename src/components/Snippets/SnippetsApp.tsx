"use client";

import { useEffect, useMemo } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useSnippetsStore } from "@/store/useSnippetsStore";
import { SORTS, searchSnippets, sortSnippets, tagCounts } from "@/lib/Snippets/types";
import { SnippetCard } from "@/components/Snippets/molecules/SnippetCard";
import { SnippetEditor } from "@/components/Snippets/organisms/SnippetEditor";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import {
  AppsIcon,
  PlusIcon,
  SearchIcon,
  SnippetIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Snippets — the code you keep looking up, kept where you can find it.
 *
 * The whole app is one screen and one search box. A snippet library fails by being
 * slower to search than the thing it replaced: if finding your own regex takes
 * longer than rewriting it, the library is dead weight. So there are no folders,
 * no categories and no navigation — one flat list, one query that spans titles,
 * tags, languages and bodies, and copy on every card.
 *
 * Local only. That is not a limitation to apologise for: the snippets people keep
 * are connection strings, auth headers and internal endpoints, and this is the one
 * snippet manager that cannot leak them because it has nowhere to send them.
 */
export function SnippetsApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const snippets = useSnippetsStore((s) => s.snippets);
  const query = useSnippetsStore((s) => s.query);
  const setQuery = useSnippetsStore((s) => s.setQuery);
  const sort = useSnippetsStore((s) => s.sort);
  const setSort = useSnippetsStore((s) => s.setSort);
  const editingId = useSnippetsStore((s) => s.editingId);
  const edit = useSnippetsStore((s) => s.edit);
  const create = useSnippetsStore((s) => s.create);
  const noteCopy = useSnippetsStore((s) => s.noteCopy);
  const ready = useSnippetsStore((s) => s.ready);
  const hydrate = useSnippetsStore((s) => s.hydrate);

  // Adopt the saved library once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const editing = editingId ? snippets.find((s) => s.id === editingId) : undefined;

  const visible = useMemo(
    () => sortSnippets(searchSnippets(snippets, query), sort),
    [query, snippets, sort],
  );

  const tags = useMemo(() => tagCounts(snippets).slice(0, 12), [snippets]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<SnippetIcon size={24} />}
            name="Snippets"
            tagline="the code you keep looking up"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 pt-[22px] pb-6">
        <NavView
          viewKey={editing ? "editor" : "list"}
          motion={editing ? "deeper" : "shallower"}
        >
          {editing ? (
            <SnippetEditor snippet={editing} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                  >
                    <SearchIcon size={16} />
                  </span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search — or #tag, or lang:go"
                    aria-label="Search snippets"
                    spellCheck={false}
                    className="w-full rounded-full border-[1.5px] border-border bg-panel pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                </div>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  aria-label="Sort snippets"
                  className="flex-none rounded-full border border-border bg-panel px-3 py-2.5 text-[12.5px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => create()}
                  className="tint inline-flex flex-none items-center gap-1.5 rounded-full bg-accent px-3.5 py-2.5 text-[12.5px] font-bold text-on-accent hover:opacity-90"
                >
                  <PlusIcon size={15} />
                  New
                </button>
              </div>

              {tags.length > 0 && (
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {tags.map(({ tag, count }) => {
                    const active = query.toLowerCase().includes(`#${tag}`);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setQuery(
                            active
                              ? query.replace(new RegExp(`#${tag}\\s*`, "i"), "").trim()
                              : `${query} #${tag}`.trim(),
                          )
                        }
                        aria-pressed={active}
                        className={cx(
                          "flex-none rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                          active
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-panel text-ink-soft hover:text-text",
                        )}
                      >
                        #{tag} <span className="tabular-nums opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {visible.length === 0 ? (
                <p className="rounded-[14px] border border-border bg-panel px-4 py-8 text-center text-[13.5px] leading-relaxed text-ink-soft">
                  {!ready
                    ? "Opening your library…"
                    : snippets.length === 0
                      ? "Nothing saved yet. Press New, paste the thing you always end up searching for, and give it a tag."
                      : "No snippet matches that search."}
                </p>
              ) : (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">
                    {visible.length} of {snippets.length}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {visible.map((snippet) => (
                      <SnippetCard
                        key={snippet.id}
                        snippet={snippet}
                        onEdit={() => edit(snippet.id)}
                        onCopied={() => noteCopy(snippet.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </NavView>
      </main>

      <AppFooter />
    </div>
  );
}
