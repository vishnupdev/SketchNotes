"use client";

import { useMemo, useState } from "react";
import { useTextKitStore } from "@/store/useTextKitStore";
import { FLAGS, replaceWith, runRegex, SUBJECT_LIMIT } from "@/lib/TextKit/regex";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { cx } from "@/lib/utils";

const input =
  "w-full rounded-[9px] border-[1.5px] border-border bg-paper px-2.5 py-2 font-mono text-[13px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

/**
 * A regular-expression workbench.
 *
 * Matches *and* a replacement preview, because those are the two questions:
 * "does this pattern catch what I mean" and "what would replacing it do". The
 * subject is the shared draft, so a pattern can be tried against text another
 * tool just produced.
 */
export function RegexPanel() {
  const text = useTextKitStore((s) => s.text);
  const setText = useTextKitStore((s) => s.setText);
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [replacement, setReplacement] = useState("");

  const run = useMemo(() => runRegex(pattern, flags, text), [pattern, flags, text]);
  const replaced = useMemo(
    () => (replacement ? replaceWith(pattern, flags, text, replacement) : null),
    [pattern, flags, text, replacement],
  );

  const toggleFlag = (flag: string) =>
    setFlags((current) =>
      current.includes(flag) ? current.replace(flag, "") : current + flag,
    );

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Pattern
        </span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="\b(\w+)@(\w+\.\w+)\b"
          spellCheck={false}
          aria-label="Regular expression pattern"
          className={input}
        />
      </label>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Flags
        </span>
        {FLAGS.map((flag) => (
          <button
            key={flag.id}
            type="button"
            title={flag.hint}
            onClick={() => toggleFlag(flag.id)}
            aria-pressed={flags.includes(flag.id)}
            className={cx(
              "rounded-lg border px-2.5 py-1 font-mono text-[12px] font-semibold transition-colors",
              flags.includes(flag.id)
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {flag.label}
          </button>
        ))}
      </div>

      <TextField
        label="Test against"
        value={text}
        onChange={setText}
        rows={7}
        placeholder="The text to match against."
      />

      {!run.ok ? (
        <p role="alert" className="font-mono text-[12px] leading-relaxed text-danger">
          {run.error}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-ink-soft">
            {pattern === ""
              ? "Enter a pattern to see what it matches."
              : run.matches.length === 0
                ? "No matches."
                : `${run.matches.length}${run.truncated ? "+" : ""} match${run.matches.length === 1 ? "" : "es"}`}
            {run.capped &&
              ` · only the first ${SUBJECT_LIMIT.toLocaleString()} characters were searched, to keep a slow pattern from freezing the tab`}
          </p>

          {run.matches.length > 0 && (
            <ol className="scroll-slim max-h-64 overflow-auto rounded-xl border border-border bg-panel">
              {run.matches.map((match, i) => (
                <li
                  key={`${match.index}-${i}`}
                  className="flex flex-wrap items-baseline gap-2 border-b border-border px-2.5 py-1.5 font-mono text-[12px] last:border-b-0"
                >
                  <span className="text-ink-soft tabular-nums">@{match.index}</span>
                  <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">
                    {match.text || "(empty)"}
                  </span>
                  {match.groups.length > 0 && (
                    <span className="text-[11.5px] text-ink-soft">
                      {match.groups.map((g, gi) => `$${gi + 1}=${g ?? "—"}`).join("  ")}
                    </span>
                  )}
                  {match.named && (
                    <span className="text-[11.5px] text-ink-soft">
                      {Object.entries(match.named)
                        .map(([k, v]) => `${k}=${v ?? "—"}`)
                        .join("  ")}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Replace with ($1, $&amp;, $&lt;name&gt;)
        </span>
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="$2 — $1"
          spellCheck={false}
          aria-label="Replacement string"
          className={input}
        />
      </label>

      {replaced &&
        (replaced.ok ? (
          <TextField
            label="After replacing"
            value={replaced.text}
            rows={6}
            actions={
              <button
                type="button"
                onClick={() => setText(replaced.text)}
                className="rounded-full border border-border bg-panel px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-accent"
              >
                Apply
              </button>
            }
          />
        ) : (
          <p role="alert" className="font-mono text-[12px] text-danger">
            {replaced.error}
          </p>
        ))}
    </div>
  );
}
