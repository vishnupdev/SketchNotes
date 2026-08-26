"use client";

import { useMemo } from "react";
import { tokenize, type TokenKind } from "@/lib/code-highlight";

/**
 * Token colours, drawn from the theme rather than picked here (rule #6).
 *
 * Only three of the five get a colour of their own. Keywords and strings are what
 * you scan for; comments want to recede. Numbers and punctuation borrow the body
 * colour, because a code block where every token is a different hue is harder to
 * read than one with no highlighting at all.
 */
const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "",
  comment: "text-ink-soft italic",
  string: "text-accent",
  number: "text-ink-soft",
  keyword: "font-semibold text-ink",
  punctuation: "",
};

/**
 * A read-only, highlighted code block with optional line numbers.
 *
 * Rendered as spans over a token array — never `dangerouslySetInnerHTML` — so
 * text pasted from anywhere is inert by construction. See `lib/Snippets/highlight.ts`.
 *
 * Horizontal overflow scrolls inside the block (rule #3): code has long lines, and
 * letting them widen the page would break every layout around it.
 */
export function CodeBlock({
  code,
  language,
  lineNumbers = false,
  maxLines,
}: {
  code: string;
  language: string;
  lineNumbers?: boolean;
  /** Clip to this many lines, for a preview. */
  maxLines?: number;
}) {
  const shown = useMemo(() => {
    if (!maxLines) return code;
    const lines = code.split("\n");
    return lines.length <= maxLines ? code : lines.slice(0, maxLines).join("\n");
  }, [code, maxLines]);

  const tokens = useMemo(() => tokenize(shown, language), [language, shown]);
  const clipped = maxLines !== undefined && code.split("\n").length > maxLines;
  const count = shown.split("\n").length;

  return (
    <div className="relative overflow-x-auto rounded-[10px] border border-border bg-paper">
      <pre className="flex min-w-0 p-2.5 font-mono text-[12.5px] leading-[1.55]">
        {lineNumbers && (
          <span aria-hidden className="mr-3 flex-none select-none text-right text-ink-soft">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="block tabular-nums">
                {i + 1}
              </span>
            ))}
          </span>
        )}
        <code className="min-w-0 flex-1 whitespace-pre">
          {tokens.map((token, i) => {
            const cls = TOKEN_CLASS[token.kind];
            return cls ? (
              <span key={i} className={cls}>
                {token.text}
              </span>
            ) : (
              token.text
            );
          })}
          {clipped && <span className="text-ink-soft">{"\n…"}</span>}
        </code>
      </pre>
    </div>
  );
}
