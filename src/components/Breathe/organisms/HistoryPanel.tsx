"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { CountUp } from "@/components/Breathe/atoms/CountUp";
import { TrashIcon } from "@/components/SketchNotes/atoms/icons";
import { useBreatheStore } from "@/store/useBreatheStore";
import { lastDays, streak, totalMinutes } from "@/lib/Breathe/history";
import { clock } from "@/lib/Breathe/patterns";

const DAYS = 14;

/**
 * What has been practised. A streak is shown because a daily few minutes is
 * the whole idea — but it is counted kindly, and not shown as broken until a
 * whole day has been missed.
 */
export function HistoryPanel() {
  const history = useBreatheStore((s) => s.history);
  const clearHistory = useBreatheStore((s) => s.clearHistory);
  const [confirming, setConfirming] = useState(false);

  const now = Date.now();
  const days = useMemo(() => lastDays(history, DAYS, now), [history, now]);
  const busiest = Math.max(1, ...days.map((d) => d.minutes));
  const recent = history.slice(-8).reverse();

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Day streak" i={0}>
          <CountUp value={streak(history, now)} />
        </Stat>
        <Stat label="Minutes" i={1}>
          <CountUp value={totalMinutes(history)} decimals={totalMinutes(history) < 10 ? 1 : 0} />
        </Stat>
        <Stat label="Sessions" i={2}>
          <CountUp value={history.length} />
        </Stat>
      </dl>

      <figure className="breathe-rise m-0 rounded-[14px] border border-border bg-panel p-4" style={{ "--i": 3 } as CSSProperties}>
        <figcaption className="text-[13.5px] font-bold">The last two weeks</figcaption>
        <p className="text-[11.5px] text-ink-soft">Minutes each day, today on the right.</p>
        {/* One series, one colour, a zero baseline: height is the minutes. */}
        <ol className="mt-3 flex h-28 items-end gap-1">
          {days.map((day, i) => {
            const today = i === DAYS - 1;
            const label = `${today ? "Today" : `${DAYS - 1 - i} day${DAYS - 1 - i === 1 ? "" : "s"} ago`}: ${day.minutes.toFixed(1)} minutes`;
            return (
              <li key={day.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1" title={label}>
                <span className="sr-only">{label}</span>
                <span
                  aria-hidden
                  className={`breathe-bar block w-full rounded-t-[4px] ${today ? "bg-accent" : "bg-accent/55"}`}
                  style={{
                    height: `${(day.minutes / busiest) * 100}%`,
                    minHeight: day.minutes > 0 ? 3 : 0,
                    "--i": i,
                  } as CSSProperties}
                />
                <span aria-hidden className="h-px w-full bg-border" />
              </li>
            );
          })}
        </ol>
      </figure>

      {recent.length === 0 ? (
        <p className="breathe-rise rounded-[14px] border border-dashed border-border p-4 text-[13px] leading-relaxed text-ink-soft" style={{ "--i": 4 } as CSSProperties}>
          Nothing yet. A session counts once it has run for twenty seconds — finish one on the
          Breathe tab and it appears here.
        </p>
      ) : (
        <section className="breathe-rise rounded-[14px] border border-border bg-panel p-4" style={{ "--i": 4 } as CSSProperties}>
          <h2 className="mb-2 text-[13.5px] font-bold">Recent</h2>
          <ul className="divide-y divide-border">
            {recent.map((s) => (
              <li key={s.at} className="flex items-baseline justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0 truncate font-semibold">{s.patternName}</span>
                <span className="flex-none font-mono text-[11px] tabular-nums text-ink-soft">
                  {new Date(s.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                  {clock(s.seconds)} · {s.cycles}×
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              if (confirming) {
                clearHistory();
                setConfirming(false);
              } else setConfirming(true);
            }}
            onBlur={() => setConfirming(false)}
            className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2 text-[12.5px] font-semibold text-ink-soft hover:text-danger"
          >
            <TrashIcon size={15} />
            {confirming ? "Tap again to clear everything" : "Clear history"}
          </button>
        </section>
      )}
    </div>
  );
}

function Stat({ label, i, children }: { label: string; i: number; children: React.ReactNode }) {
  return (
    <div className="breathe-rise rounded-[14px] border border-border bg-panel px-3 py-3" style={{ "--i": i } as CSSProperties}>
      <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">{label}</dt>
      <dd className="text-[26px] font-extrabold leading-tight">{children}</dd>
    </div>
  );
}
