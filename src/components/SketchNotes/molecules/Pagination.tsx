"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

interface NewsPaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the 1-based page to move to. */
  onPage: (page: number) => void;
}

/**
 * Page navigation for the headline list. Keeps the mobile feed short — instead
 * of one long scroll through every headline, readers page through a handful at
 * a time. Renders nothing when everything fits on a single page. Numbered
 * buttons stay reachable side-to-side on narrow screens via horizontal scroll.
 */
export function NewsPagination({ page, pageCount, onPage }: NewsPaginationProps) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const stepClass =
    "grid size-9 shrink-0 place-items-center rounded-full border border-border bg-panel text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <nav
      aria-label="News pages"
      className="scroll-slim mt-6 flex items-center justify-center gap-1.5 overflow-x-auto pb-1"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={stepClass}
      >
        <ChevronLeftIcon size={16} />
      </button>

      <ul className="flex items-center gap-1.5">
        {pages.map((p) => {
          const current = p === page;
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
                aria-current={current ? "page" : undefined}
                className={cx(
                  "grid size-9 shrink-0 place-items-center rounded-full border text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  current
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-panel text-ink-soft hover:border-accent hover:text-text",
                )}
              >
                {p}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className={stepClass}
      >
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  );
}
