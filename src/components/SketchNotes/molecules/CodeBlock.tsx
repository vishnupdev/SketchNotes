"use client";

import { memo, useMemo } from "react";
import { tokenize, type TokenKind } from "@/lib/code-highlight";

/**
 * Token colours, drawn from the theme rather than picked here (rule #6).
 *
 * Only three of the five get a colour of their own. Keywords and strings are what
 * you scan for; comments want to recede. Numbers and punctuation borrow the body
 * colour, because a code block where every token is a different hue is harder to
 * read than one with no highlighting at all.
 *
 * Keywords carry weight rather than a hue of their own, on `--text`. They used to
 * ask for `--ink`, which is the sketch canvas's stroke colour: in every light
 * palette it is the same value as `--text` and looked right, and in every dark
 * palette it is #0d1319 against a #141a21 `--paper` — 1.07:1, an invisible word
 * in the middle of every line of code (rule #6 and rule #7's AA floor).
 */
const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "",
  comment: "text-ink-soft italic",
  string: "text-accent",
  number: "text-ink-soft",
  keyword: "font-semibold text-text",
  punctuation: "",
};

/** What `s.split("\n").length` would say, without building the array. */
function countLines(s: string): number {
  let lines = 1;
  for (let at = s.indexOf("\n"); at !== -1; at = s.indexOf("\n", at + 1)) lines++;
  return lines;
}

/**
 * The index of the `n`th newline in `s`, or -1 when there are fewer than `n`.
 *
 * Used to clip a preview without splitting the whole string: a snippet card shows
 * six lines, and the body behind it can be a whole file.
 */
function nthNewline(s: string, n: number): number {
  let at = -1;
  for (let k = 0; k < n; k++) {
    at = s.indexOf("\n", at + 1);
    if (at === -1) return -1;
  }
  return at;
}

/** A stretch of code that renders as one node: adjacent tokens that share a class. */
interface Run {
  cls: string;
  text: string;
}

/**
 * A read-only, highlighted code block with optional line numbers.
 *
 * Rendered as spans over a token array — never `dangerouslySetInnerHTML` — so
 * text pasted from anywhere is inert by construction. See `lib/code-highlight.ts`.
 *
 * Horizontal overflow scrolls inside the block (rule #3): code has long lines, and
 * letting them widen the page would break every layout around it.
 *
 * Memoised, and so is each piece of work inside it. The three callers all re-render
 * for reasons that have nothing to do with the code on screen — Markdown Studio
 * re-parses the document on every keystroke, a snippet list re-renders when any
 * card is copied — and re-tokenising an unchanged block for that is the whole cost
 * of this component paid for nothing.
 */
export const CodeBlock = memo(function CodeBlock({
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
  const { shown, clipped } = useMemo(() => {
    const cut = maxLines && maxLines > 0 ? nthNewline(code, maxLines) : -1;
    return cut === -1 ? { shown: code, clipped: false } : { shown: code.slice(0, cut), clipped: true };
  }, [code, maxLines]);

  /*
   * One node for the gutter, not one per line.
   *
   * `whitespace-pre` on a single string gives the same right-aligned column of
   * numbers as a stack of block spans did, at any length. It matters because the
   * Api app hands this component response bodies up to 2 MB with `lineNumbers`
   * on, where a span per line is tens of thousands of elements the browser has to
   * lay out before anything appears.
   */
  const gutter = useMemo(() => {
    if (!lineNumbers) return null;
    const lines = countLines(shown);
    let out = "1";
    for (let n = 2; n <= lines; n++) out += `\n${n}`;
    return out;
  }, [lineNumbers, shown]);

  /*
   * Tokens, merged again by the class they will render as.
   *
   * The tokeniser separates plain text from punctuation because they are
   * different things; here they are both "no class", so `const a = 1;` collapses
   * from six nodes to three. Roughly half the tokens in C-family code are
   * punctuation, which is half the DOM this used to build.
   */
  const runs = useMemo(() => {
    const out: Run[] = [];
    for (const token of tokenize(shown, language)) {
      const cls = TOKEN_CLASS[token.kind];
      const last = out[out.length - 1];
      if (last && last.cls === cls) last.text += token.text;
      else out.push({ cls, text: token.text });
    }
    return out;
  }, [language, shown]);

  return (
    <div className="relative overflow-x-auto rounded-[10px] border border-border bg-paper">
      <pre className="flex min-w-0 p-2.5 font-mono text-[12.5px] leading-[1.55]">
        {gutter !== null && (
          <span
            aria-hidden
            className="mr-3 flex-none select-none whitespace-pre text-right tabular-nums text-ink-soft"
          >
            {gutter}
          </span>
        )}
        <code className="min-w-0 flex-1 whitespace-pre">
          {runs.map((run, i) =>
            run.cls ? (
              <span key={i} className={run.cls}>
                {run.text}
              </span>
            ) : (
              run.text
            ),
          )}
          {clipped && <span className="text-ink-soft">{"\n…"}</span>}
        </code>
      </pre>
    </div>
  );
});
