"use client";

import { useMemo, useState } from "react";
import { cx, trackSpot } from "@/lib/utils";
import { APPS, chipGradient } from "@/components/AppCatalog";
import { CheckIcon, SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { stepCount, TOURS } from "@/lib/Walkaround/tours";
import type { AppId } from "@/store/useWorkspaceStore";

/** Words that should find an app here: its name, tagline and tour intro. */
const haystack = (id: AppId, name: string, tagline: string) =>
  `${name} ${tagline} ${TOURS[id].intro} ${TOURS[id].steps.map((s) => s.title).join(" ")}`.toLowerCase();

interface AppPickGridProps {
  /** Which app's tour is currently loaded, if any. */
  current: AppId | null;
  /** Apps whose tour has been seen to the end. */
  done: readonly AppId[];
  onPick: (app: AppId) => void;
}

/**
 * The choice of app to walk around.
 *
 * Ordered by the app catalog rather than by the user's launcher order: this is a
 * reading list, and it should not reshuffle itself because someone dragged a
 * tile somewhere else. The tick is the reason the list is worth having — in an
 * app whose whole job is showing you things you haven't found, "seen" is the
 * most useful thing it can tell you about a row.
 */
export function AppPickGrid({ current, done, onPick }: AppPickGridProps) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPS;
    return APPS.filter((app) => haystack(app.id, app.name, app.tagline).includes(q));
  }, [query]);

  return (
    <div className="flex flex-col gap-3.5">
      <label className="relative block">
        <span className="sr-only">Search the walkarounds</span>
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
          <SearchIcon size={16} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps and what each tour covers"
          className="w-full rounded-full border border-border bg-panel py-2.5 pl-9 pr-3.5 text-[13px] text-text placeholder:text-ink-soft focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-3.5 py-6 text-center text-[13px] text-ink-soft">
          No walkaround matches “{query.trim()}”.
        </p>
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
          {rows.map((app) => {
            const seen = done.includes(app.id);
            const active = app.id === current;
            const stops = stepCount(app.id);
            return (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => onPick(app.id)}
                  onPointerMove={trackSpot}
                  aria-current={active}
                  style={
                    {
                      "--spot": `var(${app.hue})`,
                      "--chip-grad": chipGradient(app.hue),
                    } as React.CSSProperties
                  }
                  className={cx(
                    "hover-spot flex w-full items-center gap-3 rounded-xl border p-2.5 text-left",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active
                      ? "border-accent bg-accent-soft"
                      : "hover-lift border-border bg-paper hover:border-accent",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-(image:--chip-grad) text-white [&>svg]:size-4.5">
                    {app.icon}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold leading-tight">
                      {app.name}
                    </span>
                    <span className="line-clamp-2 text-[11px] leading-[1.35] text-ink-soft">
                      {TOURS[app.id].intro}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft">
                      {stops} stops
                    </span>
                    {seen && (
                      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[.1em] text-accent">
                        <CheckIcon size={11} />
                        Seen
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
