"use client";

import { timeAgo } from "@/lib/utils";
import { useBoardStore } from "@/store/useBoardStore";
import { CheckIcon, CloseIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * A transcript of recent instructions and what each one did.
 *
 * With a deterministic parser the interesting failure isn't "it broke", it's "it
 * read my sentence differently than I meant" — so the record of what was typed
 * next to what happened is the app's main debugging affordance. It's session-only
 * (see `useBoardStore`), which is why it's presented as a transcript rather than
 * as history you could rely on later.
 */
export function PromptLog() {
  const log = useBoardStore((s) => s.log);
  const clearLog = useBoardStore((s) => s.clearLog);
  if (log.length < 2) return null;

  return (
    <section aria-labelledby="board-log-title" className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="board-log-title"
          className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft"
        >
          This session
        </h2>
        <button
          type="button"
          onClick={clearLog}
          className="tint rounded-md px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Clear
        </button>
      </div>

      <ol role="list" className="mt-1.5 flex flex-col gap-1">
        {log.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start gap-2 rounded-lg border border-border bg-panel px-2.5 py-1.5"
          >
            <span
              aria-hidden
              className={entry.ok ? "mt-0.5 flex-none text-success" : "mt-0.5 flex-none text-danger"}
            >
              {entry.ok ? <CheckIcon size={13} /> : <CloseIcon size={13} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[11.5px] text-text">{entry.input}</span>
              <span className="block text-[11.5px] leading-snug text-ink-soft">{entry.message}</span>
            </span>
            <span className="flex-none pt-0.5 font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft">
              {timeAgo(entry.at)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
