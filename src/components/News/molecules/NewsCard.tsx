"use client";

import type { NewsArticle } from "@/lib/News/types";
import { timeAgo } from "@/lib/News/format";
import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * A single headline. The whole card is the link; it opens the original article
 * in a new tab. Kept text-only (source + time meta) so it reads cleanly on any
 * width and needs no images the feed doesn't reliably provide.
 */
export function NewsCard({ article }: { article: NewsArticle }) {
  const when = timeAgo(article.publishedAt);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <h3 className="text-[15.5px] font-bold leading-snug tracking-[.1px] text-text">
        {article.title}
      </h3>
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
    </a>
  );
}
