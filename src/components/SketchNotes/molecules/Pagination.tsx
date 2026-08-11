"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the 1-based page to move to. */
  onPage: (page: number) => void;
  /** Names the nav for assistive tech, e.g. "News pages". */
  label?: string;
}

/**
 * Page navigation for a long list. Keeps a mobile feed short — instead of one
 * endless scroll, readers page through a handful of items at a time. Renders
 * nothing when everything fits on a single page. Numbered buttons stay
 * reachable side-to-side on narrow screens via horizontal scroll.
 *
 * Shared across apps; pass `label` so each list's pager is named for its own
 * content.
 */
export function Pagination({ page, pageCount, onPage, label = "Pages" }: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const stepClass =
    "grid size-9 shrink-0 place-items-center rounded-full border border-border bg-panel text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <nav
      aria-label={label}
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
