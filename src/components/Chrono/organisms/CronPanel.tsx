"use client";

import { useMemo, useState } from "react";
import { useChronoStore } from "@/store/useChronoStore";
import { CRON_PRESETS, nextRuns, parseCron } from "@/lib/Chrono/cron";
import { formatDuration } from "@/lib/Chrono/duration";
import { cx } from "@/lib/utils";

const FIELD_LABELS = ["Minute", "Hour", "Day of month", "Month", "Day of week"];

/**
 * Cron: what the expression means, and when it actually fires.
 *
 * The two things a cron tool has to get right, and why both are here:
 *
 *  - **The sentence.** Nobody reads a line of five cron fields correctly at a
 *    glance, including the person who wrote it. The English description is the
 *    answer the app exists to give.
 *  - **The next five runs.** The description can be understood and still be wrong
 *    about your intent — "on day 13 and on Friday" reads fine until you see the
 *    dates and realise it fires 60 times a year, not once. Concrete dates are the
 *    only check that catches a misunderstanding rather than a syntax error.
 *
 * The clock is read once, when the input changes, rather than ticking: these
 * answers do not need to be live to the second, and a per-second re-render of a
 * date list would be motion with nothing to say.
 */
export function CronPanel() {
  const expression = useChronoStore((s) => s.cron);
  const setCron = useChronoStore((s) => s.setCron);
  const [count, setCount] = useState(5);

  const parsed = useMemo(() => parseCron(expression), [expression]);

  const runs = useMemo(
    () => (parsed.ok ? nextRuns(parsed.spec, new Date(), count) : []),
    [count, parsed],
  );

  const fields = expression.trim().split(/\s+/);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="cron-input"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Expression
        </label>
        <input
          id="cron-input"
          type="text"
          value={expression}
          onChange={(e) => setCron(e.target.value)}
          placeholder="*/15 9-17 * * 1-5"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={!parsed.ok || undefined}
          aria-describedby="cron-result"
          className={cx(
            "mt-1.5 w-full rounded-[10px] border-[1.5px] bg-paper px-3 py-2.5 font-mono text-[15px] outline-none",
            parsed.ok
              ? "border-border focus:border-accent focus:ring-2 focus:ring-accent/25"
              : "border-danger text-danger",
          )}
        />

        {/* The five field names under the five things typed, so it is obvious
            which one the error is about — cron's positional syntax gives no clue
            by itself. */}
        {fields.length === 5 && (
          <div className="mt-1.5 grid grid-cols-5 gap-1">
            {FIELD_LABELS.map((label, i) => (
              <div key={label} className="min-w-0 text-center">
                <div className="truncate font-mono text-[12px] font-semibold text-accent">
                  {fields[i]}
                </div>
                <div className="mt-0.5 text-[9px] uppercase leading-tight tracking-[.06em] text-ink-soft">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p
        id="cron-result"
        role={parsed.ok ? undefined : "alert"}
        className={cx(
          "rounded-[14px] border px-3.5 py-3 text-[14px] leading-relaxed",
          parsed.ok
            ? "border-accent/40 bg-accent-soft font-semibold text-accent"
            : "border-danger/50 bg-panel text-danger",
        )}
      >
        {parsed.ok ? parsed.description : parsed.error}
      </p>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CRON_PRESETS.map((preset) => (
          <button
            key={preset.expression}
            type="button"
            onClick={() => setCron(preset.expression)}
            title={preset.expression}
            aria-current={preset.expression === expression.trim()}
            className={cx(
              "flex-none rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
              preset.expression === expression.trim()
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {parsed.ok && (
        <section aria-labelledby="cron-next" className="rounded-[14px] border border-border bg-panel p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="cron-next"
              className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
            >
              Next {runs.length === 1 ? "run" : `${runs.length} runs`}, your local time
            </h2>
            <div className="inline-flex gap-1 rounded-lg border border-border bg-paper p-0.5">
              {[5, 10, 25].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  aria-current={n === count}
                  className={cx(
                    "rounded-md px-2 py-1 font-mono text-[10.5px] font-semibold",
                    n === count ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {runs.length === 0 ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              This expression never fires. It parses, but no real date satisfies it — the 30th of
              February, say, or a day-of-month that the chosen month never reaches.
            </p>
          ) : (
            <ol className="mt-2 flex flex-col">
              {runs.map((run, i) => (
                <li
                  key={run.getTime()}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0"
                >
                  <span className="min-w-0 text-[13px] font-semibold">
                    {run.toLocaleString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-none font-mono text-[10.5px] uppercase tracking-[.08em] text-ink-soft">
                    {i === 0
                      ? `in ${formatDuration(run.getTime() - Date.now(), { compact: true })}`
                      : `+${formatDuration(run.getTime() - runs[i - 1].getTime(), { compact: true })}`}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Standard five-field cron, plus the <code className="font-mono">@daily</code>-style
        shorthands. Month and day names work (<code className="font-mono">JAN</code>,{" "}
        <code className="font-mono">MON</code>), and Sunday may be written 0 or 7. Times are worked
        out in this device&rsquo;s time zone — a server running the same line will use its own.
      </p>
    </div>
  );
}
