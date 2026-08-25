"use client";

import { useTextKitStore } from "@/store/useTextKitStore";
import { CASES, LINE_OPS, changeCase, measure, transformLines } from "@/lib/TextKit/transform";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { cx } from "@/lib/utils";

const CHIP =
  "rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Case, lines and counts — applied *in place*.
 *
 * Every button rewrites the working text rather than filling a second box, so
 * operations stack the way they do in a text editor: trim, then sort, then
 * dedupe. It also means the result is already the input for the next tool along,
 * which is the point of the shared draft.
 */
export function TransformPanel() {
  const text = useTextKitStore((s) => s.text);
  const setText = useTextKitStore((s) => s.setText);
  const stats = measure(text);

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Text"
        value={text}
        onChange={setText}
        rows={10}
        mono={false}
        counts={false}
        placeholder="Paste or type anything. Every button below rewrites this text, so operations stack."
      />

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Change case
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CASES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setText(changeCase(text, option.id))}
              disabled={!text}
              className={cx(CHIP, "disabled:opacity-40")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Lines
        </span>
        <div className="flex flex-wrap gap-1.5">
          {LINE_OPS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              onClick={() => setText(transformLines(text, option.id))}
              disabled={!text}
              className={cx(CHIP, "disabled:opacity-40")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Counts as a block rather than a footnote: "how long is this" is one of
          the two reasons anyone opens a text tool. */}
      <dl className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
        {[
          { label: "Characters", value: stats.characters.toLocaleString() },
          { label: "Without spaces", value: stats.charactersNoSpaces.toLocaleString() },
          { label: "Words", value: stats.words.toLocaleString() },
          { label: "Lines", value: stats.lines.toLocaleString() },
          { label: "Paragraphs", value: stats.paragraphs.toLocaleString() },
          { label: "Bytes (UTF-8)", value: stats.bytes.toLocaleString() },
          {
            label: "Reading time",
            value: stats.readingMinutes ? `${stats.readingMinutes} min` : "—",
          },
        ].map((row) => (
          <div key={row.label} className="rounded-xl border border-border bg-panel p-2.5">
            <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
