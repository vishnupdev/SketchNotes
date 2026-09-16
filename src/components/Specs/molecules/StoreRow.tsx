"use client";

import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * One shop, as a link out to its results for this product.
 *
 * A real `<a>`, not a button that calls `window.open`: it has to be
 * middle-clickable, openable in a background tab, and announced as a link — all
 * of which a scripted open throws away. `rel="noopener noreferrer"` is required
 * alongside `target="_blank"` (rule #7), and `noreferrer` does a second job
 * here: the shop is not told which page sent you.
 *
 * The trailing words are "see price" rather than a number, and that is the
 * whole honesty of this panel — see `lib/Specs/stores.ts` for why no number can
 * be put there without a credential this app does not have.
 */
export function StoreRow({
  name,
  note,
  href,
  action = "see price",
}: {
  name: string;
  /** What the shop is, in three or four words. */
  note: string;
  href: string;
  /** What the link leads to, when it isn't a price. */
  action?: string;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="tint flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:text-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{name}</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">{note}</span>
        </span>
        <span className="inline-flex flex-none items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-accent">
          {action}
          <ExternalLinkIcon size={13} aria-hidden="true" />
        </span>
      </a>
    </li>
  );
}
