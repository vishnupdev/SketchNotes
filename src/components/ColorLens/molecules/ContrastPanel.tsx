"use client";

import { cx } from "@/lib/utils";
import type { ColorDetail, ContrastCheck } from "@/lib/ColorLens/types";

interface ContrastPanelProps {
  detail: ColorDetail;
}

/** One pass/fail pill. Colour alone never carries the meaning — the text does. */
function Badge({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span
      className={cx(
        "rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[.1em]",
        ok ? "bg-accent-soft text-accent" : "bg-panel text-ink-soft",
      )}
    >
      {children} {ok ? "pass" : "fail"}
    </span>
  );
}

function Row({
  title,
  check,
  background,
  foreground,
}: {
  title: string;
  check: ContrastCheck;
  background: string;
  foreground: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-paper p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-text">{title}</p>
        <p className="font-mono text-[15px] font-bold text-text">
          {check.ratio.toFixed(2)}
          <span className="text-[11px] font-normal text-ink-soft">:1</span>
        </p>
      </div>

      {/* A real sample beats a number: this is what the pairing looks like. */}
      <p
        className="mt-2 rounded-lg px-3 py-2 text-[13.5px] font-medium"
        style={{ background, color: foreground }}
      >
        Sample text in this pairing
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge ok={check.aa}>AA</Badge>
        <Badge ok={check.aaLarge}>AA large</Badge>
        <Badge ok={check.aaa}>AAA</Badge>
      </div>
    </div>
  );
}

/**
 * How usable the picked colour is as text or as a background — the question
 * anyone pulling a colour out of a photo has to answer before shipping it.
 * Graded against the WCAG 2.2 thresholds (4.5:1 body, 3:1 large, 7:1 AAA).
 */
export function ContrastPanel({ detail }: ContrastPanelProps) {
  return (
    <section
      aria-labelledby="colorlens-contrast"
      className="rounded-2xl border border-border bg-panel p-4 shadow-panel sm:p-5"
    >
      <h3 id="colorlens-contrast" className="text-[15px] font-bold tracking-[.1px]">
        Readability
      </h3>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        Contrast against white and black, graded to WCAG 2.2. Best text colour on this shade is{" "}
        <b className="font-semibold text-text">
          {detail.bestText === "#000000" ? "black" : "white"}
        </b>
        .
      </p>

      <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row
          title="On white"
          check={detail.onWhite}
          background="#ffffff"
          foreground={detail.hex}
        />
        <Row
          title="On black"
          check={detail.onBlack}
          background="#000000"
          foreground={detail.hex}
        />
      </div>
    </section>
  );
}
