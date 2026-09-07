"use client";

import { useMemo } from "react";
import { useCalcStore } from "@/store/useCalcStore";
import { answerPercent, QUESTION_MAP, QUESTIONS } from "@/lib/Calc/percent";
import { formatNumber } from "@/lib/Calc/expression";
import { cx } from "@/lib/utils";

/**
 * The four percentage questions, asked in words.
 *
 * The tape can work all four out — none is more than a multiply and a divide.
 * What it cannot tell you is *which* multiply and divide, and that is the whole
 * difficulty with percentages. So this panel is deliberately not a calculator:
 * you pick the question you have, and it shows the arithmetic it used, because
 * an answer you cannot check is not much use for money.
 *
 * **Reverse** is the one that earns the panel. A price of 118 including 18% tax
 * was 100, not 96.76 — the percentage was added to the smaller figure, so it
 * comes off by dividing, never by subtracting. It is the commonest percentage
 * mistake there is, and it is invisible: 96.76 looks like a perfectly good
 * answer.
 */
export function PercentPanel() {
  const question = useCalcStore((s) => s.question);
  const setQuestion = useCalcStore((s) => s.setQuestion);
  const a = useCalcStore((s) => s.percentA);
  const b = useCalcStore((s) => s.percentB);
  const setA = useCalcStore((s) => s.setPercentA);
  const setB = useCalcStore((s) => s.setPercentB);

  const shape = QUESTION_MAP[question];
  const numbers = useMemo(() => [read(a), read(b)] as const, [a, b]);
  const answer =
    numbers[0] === null || numbers[1] === null
      ? null
      : answerPercent(question, numbers[0], numbers[1]);

  const asked = shape.ask
    .replace("{a}", a.trim() === "" ? "…" : a.trim())
    .replace("{b}", b.trim() === "" ? "…" : b.trim());

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Which question" className="flex flex-wrap gap-1.5">
        {QUESTIONS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => setQuestion(candidate.id)}
            aria-pressed={question === candidate.id}
            className={cx(
              "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
              question === candidate.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:border-accent hover:text-accent",
            )}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {/* The question in words, above the boxes — so the two figures are never
          ambiguous about which is which. */}
      <p className="text-[16px] font-semibold leading-snug">{asked}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="calc-percent-a"
          label={shape.fields[0]}
          value={a}
          onChange={setA}
          invalid={a.trim() !== "" && numbers[0] === null}
        />
        <Field
          id="calc-percent-b"
          label={shape.fields[1]}
          value={b}
          onChange={setB}
          invalid={b.trim() !== "" && numbers[1] === null}
        />
      </div>

      {answer === null ? (
        <p className="rounded-[14px] border border-border bg-panel px-4 py-3 text-[13px] text-ink-soft">
          {numbers[0] === null || numbers[1] === null
            ? "Fill both figures in to see the answer."
            : "These two figures have no answer to this question — a percentage of nothing, or a change from nothing, is not a number."}
        </p>
      ) : (
        <div className="rounded-[14px] border border-accent/40 bg-accent-soft px-4 py-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">Answer</p>
          <p className="mt-0.5 text-[30px] font-extrabold leading-none tabular-nums text-accent">
            {formatNumber(answer.value)}
            {shape.unit === "percent" && <span className="text-[20px]">%</span>}
          </p>
          <p className="mt-1.5 font-mono text-[11.5px] text-accent/80">= {answer.working}</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{answer.note}</p>
        </div>
      )}

      <p className="text-[12px] leading-relaxed text-ink-soft">
        Every one of these is also a line on the tape —{" "}
        <span className="font-mono text-[11px]">2400 + 18%</span> adds the tax,{" "}
        <span className="font-mono text-[11px]">18% of 2400</span> is the tax on its own. This tab is
        for the two that are easy to get backwards: which figure the percentage is measured{" "}
        <em>against</em>, and how to take an included percentage back out.
      </p>
    </div>
  );
}

/**
 * A number, or null. Blank and half-typed input ("-", "1.") is null rather than
 * 0, so the panel says "fill this in" instead of confidently answering about a
 * figure nobody entered.
 */
function read(text: string): number | null {
  const cleaned = text.trim().replace(/[\s,_]/g, "");
  if (cleaned === "" || !/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function Field({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cx(
          "mt-1.5 w-full rounded-[10px] border-[1.5px] bg-paper px-3 py-2.5 font-mono text-[16px] tabular-nums outline-none",
          invalid
            ? "border-danger text-danger"
            : "border-border focus:border-accent focus:ring-2 focus:ring-accent/25",
        )}
      />
    </div>
  );
}
