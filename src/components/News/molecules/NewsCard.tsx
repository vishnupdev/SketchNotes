"use client";

import type { NewsArticle } from "@/lib/News/types";
import { sourceLogo, timeAgo } from "@/lib/News/format";
import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * A single headline. The whole card is the link; it opens the original article
 * in a new tab. A related image (the publisher's logo, derived from the feed's
 * source URL) sits alongside the headline; when the feed omits the source the
 * card falls back to the publisher initial so the layout never shifts.
 */
export function NewsCard({ article }: { article: NewsArticle }) {
  const when = timeAgo(article.publishedAt);
  const logo = sourceLogo(article.sourceUrl);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-2xl border border-border bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
