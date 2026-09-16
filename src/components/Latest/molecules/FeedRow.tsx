"use client";

import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";
import type { FeedItem } from "@/lib/Latest/types";

/**
 * One newly-listed product from the live half.
 *
 * **Deliberately not a {@link ProductRow}.** These rows carry a one-line
 * description and no specification sheet, so they are drawn as what they are —
 * an outbound link to the listing — rather than as a product this app can tell
 * you about. Styling them alike would be the app quietly promising a sheet it
 * does not have, which is the single failure mode a product catalogue cannot
 * afford; the different shape is the promise being kept.
 *
 * `rel="noopener noreferrer"` on a `target="_blank"` link: `noopener` because
 * the opened page must not get a handle on this one, and `noreferrer` because
 * nothing about what a visitor browsed here needs to reach the upstream.
 */
export function FeedRow({ item }: { item: FeedItem }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="tint flex min-w-0 items-center gap-3 rounded-[10px] px-2 py-2.5 hover:text-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{item.name}</span>
          {item.description && (
            <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">
              {item.description}
            </span>
          )}
        </span>
        <ExternalLinkIcon size={15} aria-hidden="true" className="flex-none text-ink-soft" />
      </a>
    </li>
  );
}
