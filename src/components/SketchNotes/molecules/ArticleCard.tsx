"use client";

import { useState } from "react";
import type { FeedArticle } from "@/lib/rss/types";
import { sourceLogo, timeAgo } from "@/lib/rss/format";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { trackSpot } from "@/lib/utils";
import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * A single headline from an RSS feed. The whole card is the link; it opens the
 * original article in a new tab. A related image (the publisher's logo, derived
 * from the feed's source URL) sits alongside the headline; when the feed omits
 * the source the card falls back to the publisher initial so the layout never
 * shifts.
 *
 * The logo is a remote request, so it is skipped entirely on a metered or
 * 2g-class link, and a failed load (offline, blocked) falls back to the same
 * initial rather than a broken image.
 *
 * Shared across apps — the News feed and World Clock's per-country headlines
 * both render it — so a headline reads and behaves identically everywhere.
 */
export function ArticleCard({ article }: { article: FeedArticle }) {
  const { slow } = useNetworkStatus();
  const [logoBroken, setLogoBroken] = useState(false);
  const when = timeAgo(article.publishedAt);
  const logo = slow || logoBroken ? null : sourceLogo(article.sourceUrl);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover-lift hover-spot group flex gap-3 rounded-2xl border border-border bg-panel p-4 hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onPointerMove={trackSpot}
    >
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-paper text-[15px] font-bold text-ink-soft"
      >
        {logo ? (
          // Plain <img>: sized to avoid CLS, lazy so off-screen cards don't fetch.
          <img
            src={logo}
            alt=""
            width={24}
            height={24}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setLogoBroken(true)}
            className="size-6 object-contain"
          />
        ) : (
          article.source.charAt(0).toUpperCase()
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-[15.5px] font-bold leading-snug tracking-[.1px] text-text">
          {article.title}
        </h3>
        {article.summary && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
            {article.summary}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 text-[12px] text-ink-soft">
          <span className="truncate font-semibold text-accent">{article.source}</span>
          {when && (
            <>
              <span aria-hidden className="text-border">•</span>
              <span className="shrink-0">{when}</span>
            </>
          )}
          <ExternalLinkIcon
            size={14}
            className="ml-auto shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </div>
    </a>
  );
}
