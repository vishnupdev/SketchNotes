"use client";

import { useMemo, useState } from "react";
import { useDetectStore } from "@/store/useDetectStore";
import { ALL_LABELS, countPhrase, searchLabels } from "@/lib/Detect/labels";
import { SearchIcon, TrashIcon } from "@/components/SketchNotes/atoms/icons";

/** `22:14:07` — the tally's own clock, in the reader's locale. */
const clock = (at: number): string =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * What has been seen, and what could ever be seen.
 *
 * Two lists that belong on one screen because the second is the answer to the
 * question the first provokes. A tally that says "person, chair, laptop" after
 * a walk round the room invites "why not my keys?" — and the honest answer is
 * not "bad lighting", it is that `keys` was never one of the eighty categories
 * the model was trained on, and no amount of better aiming will make it one.
 * Most object detectors never say this, so people conclude the app is broken
 * rather than bounded.
 *
 * The tally is memory-only. It is a record of the room someone was standing in,
 * and the settings are worth remembering across visits in a way that "a bed, 2
 * people, 22:14" is not.
 */
export function SeenPanel() {
  const seen = useDetectStore((s) => s.seen);
  const clearSeen = useDetectStore((s) => s.clearSeen);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => searchLabels(query), [query]);
  const matches = useMemo(() => groups.reduce((n, g) => n + g.labels.length, 0), [groups]);
  const everSeen = useMemo(() => new Set(seen.map((entry) => entry.label)), [seen]);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-extrabold">Seen this session</h2>
          {seen.length > 0 && (
            <button
              type="button"
              onClick={clearSeen}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
            >
              <TrashIcon size={14} />
              Clear
            </button>
          )}
        </div>

        {seen.length === 0 ? (
          <p className="rounded-[12px] border border-border bg-panel px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            Nothing yet. Whatever the camera or a picture recognises is gathered here — and it stays
            in memory only, so it is gone when you close the tab.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {seen.map((entry) => (
              <li
                key={entry.label}
                className="flex items-center gap-3 rounded-[12px] border border-border bg-panel px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                  {/* The peak in a single frame, never a running total: at ten
                      frames a second a cup left on a desk would otherwise
                      tally into the hundreds. */}
                  {countPhrase(entry.label, entry.most)}
                </span>
                <span className="flex-none font-mono text-[11.5px] tabular-nums text-ink-soft">
                  {Math.round(entry.best * 100)}%
                </span>
                <span className="flex-none font-mono text-[11px] tabular-nums text-ink-soft">
                  {clock(entry.lastSeen)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {seen.length > 0 && (
          <p className="text-[11.5px] leading-relaxed text-ink-soft">
            The count is the most seen at once in a single frame, and the percentage is the best the
            detector ever managed for it.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div>
          <h2 className="text-[14px] font-extrabold">What it can recognise</h2>
          <p className="mt-1 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-soft">
            Exactly these {ALL_LABELS.length} things and nothing else. If what you are pointing at
            is not on this list, no amount of better light or a closer angle will find it — it was
            never one of the categories the detector was trained on.
          </p>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
            <SearchIcon size={15} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Can it find a…"
            aria-label="Search the things the detector can recognise"
            className="w-full rounded-full border border-border bg-panel py-2.5 pl-9 pr-3 text-[13px] focus:border-accent focus:outline-none"
          />
        </div>

        <p className="sr-only" aria-live="polite">
          {matches === 0
            ? `Nothing matching ${query} — the detector cannot recognise it`
            : `${matches} of ${ALL_LABELS.length} shown`}
        </p>

        {groups.length === 0 ? (
          <p className="rounded-[12px] border border-border bg-panel px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            Nothing here matches “{query}”, which means the detector cannot find it. It knows eighty
            everyday categories — no faces, no text, no brands, no breeds and no individual people.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.name}>
                <h3 className="mb-1.5 font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft">
                  {group.name}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {group.labels.map((label) => {
                    const found = everSeen.has(label);
                    return (
                      <li key={label}>
                        <span
                          // Something already seen is marked, which turns the
                          // reference list into a quiet record of progress when
                          // someone is walking round pointing at things.
                          className={
                            found
                              ? "inline-block rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent"
                              : "inline-block rounded-full border border-border bg-panel px-2.5 py-1 text-[12px]"
                          }
                        >
                          {label}
                          {found && <span className="sr-only"> — seen this session</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
