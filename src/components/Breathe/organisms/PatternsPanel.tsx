"use client";

import { useMemo, type CSSProperties } from "react";
import { PatternCurve } from "@/components/Breathe/atoms/PatternCurve";
import { Stepper } from "@/components/SketchNotes/atoms/Stepper";
import { CheckIcon } from "@/components/SketchNotes/atoms/icons";
import { useBreatheStore } from "@/store/useBreatheStore";
import {
  breathsPerMinute,
  customPattern,
  PATTERNS,
  type Pattern,
} from "@/lib/Breathe/patterns";
import { cx } from "@/lib/utils";

/**
 * Every pattern, each showing its own rhythm as a curve with a dot travelling
 * it in real time — so choosing between 4-7-8 and Box is done by watching the
 * two rather than by reading numbers.
 */
export function PatternsPanel() {
  const patternId = useBreatheStore((s) => s.patternId);
  const custom = useBreatheStore((s) => s.custom);
  const choose = useBreatheStore((s) => s.choose);
  const setCustom = useBreatheStore((s) => s.setCustom);
  const setTool = useBreatheStore((s) => s.setTool);
  const mine = useMemo(() => customPattern(custom), [custom]);

  const pick = (id: string) => {
    choose(id);
    setTool("breathe");
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {PATTERNS.map((pattern, i) => (
          <li key={pattern.id} className="breathe-rise" style={{ "--i": i } as CSSProperties}>
            <Card pattern={pattern} selected={pattern.id === patternId} onPick={() => pick(pattern.id)} />
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="breathe-custom-heading"
        className={cx(
          "breathe-rise rounded-[14px] border bg-panel p-4",
          patternId === mine.id ? "border-accent" : "border-border",
        )}
        style={{ "--i": PATTERNS.length } as CSSProperties}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="breathe-custom-heading" className="text-[15px] font-extrabold">
              Your own
            </h2>
            <p className="font-mono text-[11px] text-ink-soft">
              {mine.rhythm} · {breathsPerMinute(mine).toFixed(1)} a minute
            </p>
          </div>
          <PatternCurve pattern={mine} ride />
        </div>
        <div className="mt-2 divide-y divide-border">
          <Stepper label="Breathe in" value={custom.inhale} min={1} max={12} suffix="sec" onChange={(inhale) => setCustom({ inhale })} />
          <Stepper label="Hold, full" value={custom.holdIn} min={0} max={12} suffix="sec" onChange={(holdIn) => setCustom({ holdIn })} />
          <Stepper label="Breathe out" value={custom.exhale} min={1} max={16} suffix="sec" onChange={(exhale) => setCustom({ exhale })} />
          <Stepper label="Hold, empty" value={custom.holdOut} min={0} max={12} suffix="sec" onChange={(holdOut) => setCustom({ holdOut })} />
        </div>
        <button
          type="button"
          onClick={() => pick(mine.id)}
          className="mt-3 h-11 w-full rounded-[10px] bg-accent text-[14px] font-bold text-on-accent hover-glow"
        >
          Breathe this pattern
        </button>
      </section>

      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
        These are exercises, not treatment. Breathe gently, never to strain, and stop if you feel
        dizzy — a hold that feels hard is a hold to shorten.
      </p>
    </div>
  );
}

function Card({ pattern, selected, onPick }: { pattern: Pattern; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cx(
        "hover-lift group flex w-full flex-col gap-2 rounded-[14px] border bg-panel p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected ? "border-accent" : "border-border",
      )}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[15px] font-extrabold">
            {pattern.name}
            {selected && <CheckIcon size={15} className="text-accent" />}
          </span>
          <span className="block font-mono text-[11px] text-ink-soft">
            {pattern.rhythm} · {breathsPerMinute(pattern).toFixed(1)} a minute
          </span>
        </span>
        <PatternCurve pattern={pattern} ride />
      </span>
      <span className="text-[12.5px] leading-relaxed text-ink-soft">{pattern.use}</span>
    </button>
  );
}
