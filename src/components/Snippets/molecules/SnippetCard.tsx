"use client";

import { useState } from "react";
import { copyText } from "@/lib/export-text";
import { LANGUAGE_BY_ID } from "@/lib/Snippets/highlight";
import type { Snippet } from "@/lib/Snippets/types";
import { CodeBlock } from "@/components/SketchNotes/molecules/CodeBlock";
import { CheckIcon, CopyIcon, PenIcon } from "@/components/SketchNotes/atoms/icons";
import { timeAgo, trackSpot } from "@/lib/utils";

/**
 * One snippet in the list: title, language, tags, and the first few lines.
 *
 * Copy is the primary action and sits on the card itself, not inside the editor.
 * The whole point of a snippet library is that you came here to *get* something —
 * making that a two-tap journey through a detail view would be the one design
 * mistake that makes the app not worth opening.
 */
export function SnippetCard({
  snippet,
  onEdit,
  onCopied,
}: {
  snippet: Snippet;
  onEdit: () => void;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const language = LANGUAGE_BY_ID[snippet.language];

  const copy = async () => {
    if (!(await copyText(snippet.body))) return;
    setCopied(true);
    onCopied();
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article
      onPointerMove={trackSpot}
      className="hover-spot flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-bold">{snippet.title || "Untitled"}</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
            {language?.label ?? snippet.language} · {timeAgo(snippet.updatedAt)}
            {snippet.copies > 0 && ` · used ${snippet.copies}×`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${snippet.title || "snippet"}`}
          className="tint inline-flex flex-none items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${snippet.title || "snippet"}`}
          className="tint grid size-9 flex-none place-items-center rounded-full border border-border bg-paper text-ink-soft hover:border-accent hover:text-accent"
        >
          <PenIcon size={15} />
        </button>
      </div>

      {snippet.body.trim() && (
        <CodeBlock code={snippet.body} language={snippet.language} maxLines={6} />
      )}

      {snippet.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {snippet.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border bg-paper px-2 py-0.5 font-mono text-[10px] text-ink-soft"
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
