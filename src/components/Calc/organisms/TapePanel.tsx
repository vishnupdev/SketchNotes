"use client";

import { useMemo, useRef } from "react";
import { useCalcStore } from "@/store/useCalcStore";
import { evaluateTape, type TapeLine } from "@/lib/Calc/tape";
import { CONSTANT_NAMES, FUNCTION_NAMES, formatNumber } from "@/lib/Calc/expression";
import { KeyBar } from "@/components/Calc/molecules/KeyBar";
import { cx } from "@/lib/utils";

/** The symbols a phone keyboard buries two taps deep. */
const KEYS = ["(", ")", "%", "^", "*", "/", "mod", "sqrt(", "ans"];

/** Lines that show what the tape can do, appended rather than replacing. */
const EXAMPLES = ["rate = 4200", "ans * 12", "20% of 80", "0xff + 0b1010", "sqrt(2) * 100"];

/**
 * The tape — a document of expressions, and what each one came to.
 *
 * The answers are printed *back* rather than shown in a gutter beside the
 * editor. A gutter is the obvious design and it is a trap: the moment a line
 * soft-wraps, or a scrollbar appears inside the textarea, every answer below it
 * points at the wrong line, and it does so silently. Reprinting each line with
 * its answer — which is what the paper tape this is named after does — can never
 * misalign, reads correctly to a screen reader as an ordered list, and still
 * works at 360px where a gutter would have nowhere to go.
 */
export function TapePanel() {
  const tape = useCalcStore((s) => s.tape);
  const setTape = useCalcStore((s) => s.setTape);
  const appendLine = useCalcStore((s) => s.appendLine);
  const clearTape = useCalcStore((s) => s.clearTape);
  const angle = useCalcStore((s) => s.angle);
  const setAngle = useCalcStore((s) => s.setAngle);

  const box = useRef<HTMLTextAreaElement>(null);
  const source = useMemo(() => tape.split("\n"), [tape]);
  const result = useMemo(() => evaluateTape(tape, angle), [tape, angle]);

  const printed = result.lines.filter((line) => line.kind !== "blank" && line.kind !== "comment");
  const errors = result.lines.filter((line) => line.kind === "error");

  /** Insert at the caret, so a key works mid-line and not only at the end. */
  const insert = (text: string) => {
    const el = box.current;
    if (!el) return;
    const { selectionStart: from, selectionEnd: to } = el;
    setTape(`${tape.slice(0, from)}${text}${tape.slice(to)}`);
    // After the value round-trips through the store the caret would be at the
    // end, so it is put back where the insertion finished.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from + text.length, from + text.length);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="calc-tape"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          One calculation a line
        </label>

        <div className="flex items-center gap-1.5">
          <div
            role="group"
            aria-label="Angle unit for trigonometry"
            className="flex overflow-hidden rounded-full border border-border"
          >
            {(["deg", "rad"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => setAngle(unit)}
                aria-pressed={angle === unit}
                title={`Read sin, cos and tan in ${unit === "deg" ? "degrees" : "radians"}`}
                className={cx(
                  "px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em]",
                  angle === unit ? "bg-accent text-on-accent" : "text-ink-soft hover:text-accent",
                )}
              >
                {unit}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={clearTape}
            disabled={tape.trim() === ""}
            className="rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <textarea
        id="calc-tape"
        ref={box}
        value={tape}
        onChange={(e) => setTape(e.target.value)}
        rows={Math.min(16, Math.max(7, source.length + 1))}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        placeholder={"1250 + 18%\nrate = 4200\nrate * 12"}
        aria-describedby="calc-tape-help"
        className="w-full resize-y rounded-[14px] border-[1.5px] border-border bg-paper px-3.5 py-3 font-mono text-[14px] leading-[1.65] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
      />

      <KeyBar keys={KEYS} onInsert={insert} label="Insert a symbol" />

      {/* The total leads, because adding up a column of figures is what a tape
          is for and the answer to that question is one number. */}
      <div className="rounded-[14px] border border-accent/40 bg-accent-soft px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">Total</p>
        <output
          htmlFor="calc-tape"
          className="mt-0.5 block text-[30px] font-extrabold leading-none tabular-nums text-accent"
        >
          {formatNumber(result.total)}
        </output>
        <p className="mt-1.5 text-[11.5px] text-ink-soft">
          {result.counted === 0
            ? "Nothing to add up yet — every plain line is added to this."
            : `Adding ${result.counted} line${result.counted === 1 ? "" : "s"}. Named lines are left out, so an intermediate you gave a name to is not counted twice.`}
        </p>
      </div>

      {printed.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-[14px] border border-border bg-panel p-0">
          {printed.map((line) => (
            <Printed key={line.index} line={line} text={source[line.index] ?? ""} />
          ))}
        </ol>
      )}

      {errors.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 rounded-[14px] border border-danger/50 bg-panel p-3.5">
          {errors.map((line) => (
            <li key={line.index} className="text-[12.5px] leading-relaxed text-danger">
              <strong className="font-mono text-[11px]">Line {line.index + 1}</strong> — {line.error}
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Try a line</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => appendLine(example)}
              className="rounded-full border border-border bg-panel px-2.5 py-1 font-mono text-[11px] text-ink-soft hover:border-accent hover:text-accent"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <p id="calc-tape-help" className="text-[12px] leading-relaxed text-ink-soft">
        <strong className="font-semibold">A percent knows what it is next to.</strong> “1250 + 18%”
        is 1475 — a percent added to something means a percent <em>of</em> that something. On its own
        “18%” is 0.18, and “20% of 80” is 16. Remainders are spelled “mod”, since “%” is taken.{" "}
        <strong className="font-semibold">Name anything</strong> with “rate = 4200” and use the name
        below; “ans” is the line above. A “#” line is a heading and “//” starts a note. Hex, binary
        and octal (“0xff”, “0b1010”, “0o17”) can be mixed in freely, and 1_000_000 reads as a
        million. Functions:{" "}
        <span className="font-mono text-[11px]">{FUNCTION_NAMES.join(" ")}</span>. Constants:{" "}
        <span className="font-mono text-[11px]">{CONSTANT_NAMES.join(" ")}</span>.
      </p>
    </div>
  );
}

/** One line, printed back with what it came to. */
function Printed({ line, text }: { line: TapeLine; text: string }) {
  const answer =
    line.kind === "error" ? "—" : line.value === undefined ? "" : formatNumber(line.value);

  return (
    <li className="flex items-baseline gap-3 border-b border-border px-3.5 py-2 last:border-b-0">
      <span className="w-6 flex-none font-mono text-[10px] tabular-nums text-ink-soft">
        {line.index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-soft" title={text}>
        {text.trim()}
      </span>
      <span
        className={cx(
          "flex-none font-mono text-[13.5px] font-bold tabular-nums",
          line.kind === "error" ? "text-danger" : line.kind === "assign" ? "text-ink-soft" : "",
        )}
      >
        {answer}
      </span>
    </li>
  );
}
