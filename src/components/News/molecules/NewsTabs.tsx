"use client";

import { NEWS_TABS } from "@/lib/News/catalog";
import { cx } from "@/lib/utils";

interface NewsTabsProps {
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Horizontal, swipeable category bar. Scrolls sideways on narrow screens so the
 * full tab set (Tech → Local) stays reachable without wrapping or overflowing
 * the viewport.
 */
export function NewsTabs({ active, onSelect }: NewsTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="News categories"
      className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
    >
      {NEWS_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.id)}
            className={cx(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              selected
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-panel text-ink-soft hover:border-accent hover:text-text",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
