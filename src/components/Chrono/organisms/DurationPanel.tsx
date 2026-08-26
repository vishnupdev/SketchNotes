"use client";

import { useMemo, useState } from "react";
import { useChronoStore } from "@/store/useChronoStore";
import { durationBreakdown, formatDuration, parseDuration } from "@/lib/Chrono/duration";
import { localIso, parseTimestamp } from "@/lib/Chrono/epoch";
import { ValueRow } from "@/components/Chrono/molecules/ValueRow";
import { cx } from "@/lib/utils";

const EXAMPLES = ["45m", "1h 20m", "90", "01:20:30", "3 days 4 hours", "-2h"];

/**
 * Durations: read one, see it in every unit, and add it to a moment.
 *
 * "Add it to a moment" is the half that earns the tab. Converting 4,830,000 ms to
 * "1h 20m 30s" is arithmetic anyone can do in a shell; working out what time a
 * 14-hour flight lands, or when a 90-day retention window expires, is the
 * question people actually have — and it is the one that a calculator answers
 * wrongly, because it does not know about calendars.
 *
 * Adding is plain millisecond arithmetic, which is the right answer for a
 * *duration* — see `shiftInstant`. "In 24 hours" and "tomorrow at this time" are
 * different questions twice a year, and this is the former.
 */
export function DurationPanel() {
  const duration = useChronoStore((s) => s.duration);
  const setDuration = useChronoStore((s) => s.setDuration);

  // The moment to add to. Its own local state rather than the store: it defaults
  // to now, and a stale persisted "start" would be a worse default than the clock.
  const [from, setFrom] = useState("");

  const parsed = useMemo(() => parseDuration(duration), [duration]);
  const rows = useMemo(
    () => (parsed.ok ? durationBreakdown(parsed.ms) : []),
    [parsed],
  );

  const base = from.trim() ? parseTimestamp(from) : { ms: Date.now(), readAs: "now" };
  const shifted = parsed.ok && base ? new Date(base.ms + parsed.ms) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="duration-input"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Duration
        </label>
        <input
          id="duration-input"
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="1h 20m"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={!parsed.ok || undefined}
          aria-describedby="duration-result"
          className={cx(
            "mt-1.5 w-full rounded-[10px] border-[1.5px] bg-paper px-3 py-2.5 font-mono text-[15px] outline-none",
            parsed.ok
              ? "border-border focus:border-accent focus:ring-2 focus:ring-accent/25"
              : "border-danger text-danger",
          )}
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setDuration(example)}
              className="rounded-full border border-border bg-panel px-2.5 py-1 font-mono text-[11px] text-ink-soft hover:border-accent hover:text-accent"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <p
        id="duration-result"
        role={parsed.ok ? undefined : "alert"}
        className={cx(
          "rounded-[14px] border px-3.5 py-3 text-[15px] leading-relaxed",
          parsed.ok
            ? "border-accent/40 bg-accent-soft font-semibold text-accent"
            : "border-danger/50 bg-panel text-danger",
        )}
      >
        {parsed.ok ? formatDuration(parsed.ms) : parsed.error}
      </p>

      {rows.length > 0 && (
        <section
          aria-labelledby="duration-units"
          className="rounded-[14px] border border-border bg-panel p-3"
        >
          <h2
            id="duration-units"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            In every unit
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 min-[520px]:grid-cols-3">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="font-mono text-[10px] uppercase tracking-[.08em] text-ink-soft">
                  {row.label}
                </dt>
                <dd className="text-[13.5px] font-semibold tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section
        aria-labelledby="duration-add"
        className="rounded-[14px] border border-border bg-panel p-3"
      >
        <h2
          id="duration-add"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Add it to a moment
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Leave empty for now"
            spellCheck={false}
            aria-label="Starting moment"
            aria-invalid={(from.trim() !== "" && !base) || undefined}
            className={cx(
              "min-w-0 flex-1 rounded-[10px] border-[1.5px] bg-paper px-2.5 py-2 font-mono text-[12.5px] outline-none",
              from.trim() !== "" && !base
                ? "border-danger text-danger"
                : "border-border focus:border-accent focus:ring-2 focus:ring-accent/25",
            )}
          />
          <button
            type="button"
            onClick={() => setFrom(localIso(new Date()))}
            className="tint flex-none rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            Pin now
          </button>
        </div>

        {shifted ? (
          <div className="mt-2">
            <ValueRow
              label={parsed.ok && parsed.ms < 0 ? "That much earlier" : "That much later"}
              value={shifted.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
              note={localIso(shifted)}
              mono={false}
            />
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-ink-soft">
            {from.trim() && !base
              ? "That starting moment could not be read."
              : "Enter a valid duration above to see where it lands."}
          </p>
        )}
      </section>
    </div>
  );
}
