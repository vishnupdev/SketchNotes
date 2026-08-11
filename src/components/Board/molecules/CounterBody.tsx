"use client";

import type { BoardActions } from "@/hooks/useBoard";
import type { BoardSection } from "@/lib/Board/types";
import { MinusIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";

interface BodyProps {
  section: BoardSection;
  actions: BoardActions;
}

/**
 * A tally with an optional goal.
 *
 * The progress bar is a `scaleX` transform on a fixed-width track rather than an
 * animated `width`, so stepping the counter costs no layout (rule #7), and it
 * carries `role="progressbar"` so the number is announced as progress and not as
 * decoration.
 */
export function CounterBody({ section, actions }: BodyProps) {
  const { value, goal, step, unit } = section;
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => actions.dispatch({ kind: "bump", id: section.id, by: -step })}
          disabled={value <= 0}
          aria-label={`Subtract ${step} from ${section.title}`}
          className="tint hover-pop grid size-10 flex-none place-items-center rounded-xl border border-border text-ink-soft hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MinusIcon size={18} />
        </button>

        <p className="min-w-0 text-center">
          <span className="block text-[30px] font-extrabold leading-none tabular-nums tracking-tight">
            {value}
            {goal > 0 && <span className="text-[17px] font-bold text-ink-soft"> / {goal}</span>}
          </span>
          {unit && <span className="mt-1 block truncate text-[12px] text-ink-soft">{unit}</span>}
        </p>

        <button
          type="button"
          onClick={() => actions.dispatch({ kind: "bump", id: section.id, by: step })}
          aria-label={`Add ${step} to ${section.title}`}
          className="hover-glow grid size-10 flex-none place-items-center rounded-xl bg-accent text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <PlusIcon size={18} />
        </button>
      </div>

      {goal > 0 && (
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-label={`${section.title} progress`}
          className="h-1.5 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full origin-left rounded-full bg-accent"
            style={{ transform: `scaleX(${pct / 100})`, transition: "var(--fx)" }}
          />
        </div>
      )}

      {/* Goal and step are editable here as well as by prompt — a number is
          quicker to nudge than to describe. */}
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">Goal</span>
          <input
            type="number"
            min={0}
            max={999999}
            value={goal}
            onChange={(e) =>
              actions.dispatch(
                {
                  kind: "setNum",
                  id: section.id,
                  field: "goal",
                  value: Math.max(0, Number(e.target.value) || 0),
                },
                { undoable: false },
              )
            }
            className="w-full rounded-lg border border-border bg-paper px-2 py-1 text-[12.5px] tabular-nums focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">Step</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={step}
            onChange={(e) =>
              actions.dispatch(
                {
                  kind: "setNum",
                  id: section.id,
                  field: "step",
                  value: Math.min(1000, Math.max(1, Number(e.target.value) || 1)),
                },
                { undoable: false },
              )
            }
            className="w-full rounded-lg border border-border bg-paper px-2 py-1 text-[12.5px] tabular-nums focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex min-w-0 flex-[1.4] flex-col gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">Unit</span>
          <input
            value={unit}
            onChange={(e) => actions.writeSection(section.id, { unit: e.target.value })}
            placeholder="glasses"
            className="w-full rounded-lg border border-border bg-paper px-2 py-1 text-[12.5px] placeholder:text-ink-soft focus:border-accent focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
