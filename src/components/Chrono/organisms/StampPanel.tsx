"use client";

import { useEffect, useMemo, useState } from "react";
import { useChronoStore } from "@/store/useChronoStore";
import { parseTimestamp, renderInstant } from "@/lib/Chrono/epoch";
import { formatDuration } from "@/lib/Chrono/duration";
import { ValueRow } from "@/components/Chrono/molecules/ValueRow";
import { cx } from "@/lib/utils";

/** A few zones worth offering without making the picker a country list. */
const ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/**
 * Timestamps: paste any form of an instant, read back every other form.
 *
 * The design problem this panel solves is not conversion, it is *ambiguity*. A
 * bare ten-digit number could be seconds or a truncated millisecond value, and
 * guessing wrong lands you decades away without any visible error. So the reading
 * is stated out loud — "read as seconds since 1970" — directly under the input,
 * where it can be noticed and corrected, instead of being an invisible assumption
 * inside the parser.
 *
 * An empty box means *now*, and only then does the clock tick. Live-updating a
 * pasted timestamp would be wrong (it is a fixed instant), and re-rendering ten
 * rows a second for no reason is exactly the sort of thing rule #7 is about.
 */
export function StampPanel() {
  const stamp = useChronoStore((s) => s.stamp);
  const setStamp = useChronoStore((s) => s.setStamp);
  const zone = useChronoStore((s) => s.zone);
  const setZone = useChronoStore((s) => s.setZone);

  const [now, setNow] = useState(() => Date.now());
  const live = stamp.trim() === "";

  // Tick only while the panel is showing "now" — see the note above.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const parsed = useMemo(() => (live ? { ms: now, readAs: "" } : parseTimestamp(stamp)), [live, now, stamp]);

  const rows = useMemo(
    () => (parsed ? renderInstant(parsed.ms, zone || undefined) : []),
    [parsed, zone],
  );

  const localZone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="stamp-input"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Timestamp or date
        </label>
        <input
          id="stamp-input"
          type="text"
          value={stamp}
          onChange={(e) => setStamp(e.target.value)}
          placeholder="Leave empty for now — or paste 1700000000, or 2026-01-14T10:00:00Z"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={(!live && !parsed) || undefined}
          aria-describedby="stamp-reading"
          className={cx(
            "mt-1.5 w-full rounded-[10px] border-[1.5px] bg-paper px-3 py-2.5 font-mono text-[14px] outline-none",
            !live && !parsed
              ? "border-danger text-danger"
              : "border-border focus:border-accent focus:ring-2 focus:ring-accent/25",
          )}
        />
        <p id="stamp-reading" className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">
          {live ? (
            <>
              Showing <b className="font-semibold text-accent">now</b>, ticking each second. Type or
              paste a value to pin an instant.
            </>
          ) : parsed ? (
            <>
              Read as <b className="font-semibold text-accent">{parsed.readAs}</b>.{" "}
              {formatDuration(Math.abs(Date.now() - parsed.ms), { compact: true })}{" "}
              {parsed.ms > Date.now() ? "from now" : "ago"}.
            </>
          ) : (
            "Not a timestamp or a date this browser can read."
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStamp("")}
          disabled={live}
          className="tint rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
        >
          Now
        </button>
        <button
          type="button"
          onClick={() => setStamp(String(Math.floor(Date.now() / 1000)))}
          className="tint rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
        >
          Pin this second
        </button>

        <label htmlFor="stamp-zone" className="ml-auto text-[11.5px] text-ink-soft">
          Also show in
        </label>
        <select
          id="stamp-zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="rounded-lg border border-border bg-panel px-2 py-1.5 text-[12px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">No second zone</option>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {rows.length > 0 && (
        <section aria-label="Every form of this instant" className="rounded-[14px] border border-border bg-panel px-3 py-1">
          {rows.map((row) => (
            <ValueRow
              key={row.label}
              label={row.label}
              value={row.value}
              note={row.note}
              mono={row.label !== "Local time"}
            />
          ))}
        </section>
      )}

      {localZone && (
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Local times are in <b className="font-semibold text-text">{localZone.replace(/_/g, " ")}</b>,
          this device&rsquo;s own zone. Nothing here leaves the device.
        </p>
      )}
    </div>
  );
}
