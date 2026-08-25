"use client";

import { useMemo, useState } from "react";
import { useTextKitStore } from "@/store/useTextKitStore";
import { describeJson, formatJson, minifyJson, parseJson, sortJsonKeys } from "@/lib/TextKit/json";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { cx } from "@/lib/utils";

const CHIP =
  "rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

type Indent = 2 | 4 | "\t";

/**
 * JSON: tidy it, shrink it, or find out why it won't parse.
 *
 * The error line is the reason this panel exists. A browser says "Unexpected
 * token } in JSON at position 428", which on a long document tells you nothing;
 * this says which line, which column, what it expected, and quotes the line — so
 * the fix takes a second instead of a hunt.
 */
export function JsonPanel() {
  const text = useTextKitStore((s) => s.text);
  const setText = useTextKitStore((s) => s.setText);
  const [indent, setIndent] = useState<Indent>(2);

  const parsed = useMemo(() => (text.trim() ? parseJson(text) : null), [text]);
  const shape = useMemo(() => (text.trim() ? describeJson(text) : ""), [text]);

  const apply = (result: ReturnType<typeof formatJson>) => {
    if (result.ok) setText(result.text);
  };

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="JSON"
        value={text}
        onChange={setText}
        rows={12}
        placeholder='{ "paste": "anything", "and": ["it", "will", "be", "checked"] }'
      />

      {parsed?.ok === false && (
        <div role="alert" className="flex flex-col gap-1 rounded-xl border border-danger p-3">
          <p className="text-[13px] font-semibold text-danger">
            Line {parsed.error.line}, column {parsed.error.column} — {parsed.error.message}
          </p>
          {parsed.error.excerpt && (
            <pre className="overflow-x-auto font-mono text-[11.5px] text-ink-soft">
              {parsed.error.excerpt}
            </pre>
          )}
        </div>
      )}

      {parsed?.ok && (
        <p className="text-[12.5px] text-ink-soft">
          Valid JSON — {shape}. Nothing is sent anywhere; it is parsed in this tab.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Indent
        </span>
        <div className="inline-flex gap-1 rounded-xl border border-border bg-panel p-1">
          {([2, 4, "\t"] as Indent[]).map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setIndent(option)}
              aria-current={indent === option}
              className={cx(
                "rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors",
                indent === option ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text",
              )}
            >
              {option === "\t" ? "Tab" : `${option} spaces`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => apply(formatJson(text, indent))}
          disabled={!parsed?.ok}
          className={CHIP}
        >
          Format
        </button>
        <button
          type="button"
          onClick={() => apply(minifyJson(text))}
          disabled={!parsed?.ok}
          className={CHIP}
        >
          Minify
        </button>
        <button
          type="button"
          title="Sorts keys at every depth, so two documents can be compared line by line"
          onClick={() => apply(sortJsonKeys(text, indent))}
          disabled={!parsed?.ok}
          className={CHIP}
        >
          Sort keys
        </button>
      </div>
    </div>
  );
}
