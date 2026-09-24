import { CheckIcon } from "@/components/SketchNotes/atoms/icons";

const DOT = "grid size-6 flex-none place-items-center rounded-full text-[11px] font-bold";
const DOT_DONE = `${DOT} bg-accent text-on-accent`;
const DOT_NOW = `${DOT} border-2 border-accent text-accent`;
const DOT_LATER = `${DOT} border border-border text-ink-soft`;

/**
 * Where someone is in a short sequence — "1 ✓ · 2 now · 3 next". Joining a room
 * takes two hand-carried codes, and the single most useful thing to show while
 * that happens is which half of it you are waiting on.
 */
export function Steps({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="flex items-start gap-2">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "now" : "later";
        return (
          <li
            key={label}
            aria-current={state === "now" ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
          >
            <span className={state === "done" ? DOT_DONE : state === "now" ? DOT_NOW : DOT_LATER}>
              {state === "done" ? <CheckIcon size={13} /> : i + 1}
            </span>
            <span
              className={
                state === "now"
                  ? "text-[11px] font-semibold leading-tight text-text"
                  : "text-[11px] leading-tight text-ink-soft"
              }
            >
              {state === "done" && <span className="sr-only">Done: </span>}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
