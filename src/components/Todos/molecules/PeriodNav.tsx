import { cx } from "@/lib/utils";
import type { ViewMode } from "@/lib/Todos/types";
import { periodLabel } from "@/lib/Todos/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/SketchNotes/atoms/icons";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

interface PeriodNavProps {
  view: ViewMode;
  anchor: number;
  now: number;
  onView: (view: ViewMode) => void;
  onStep: (dir: 1 | -1) => void;
  onToday: () => void;
}

/** Granularity switcher plus prev / today / next controls and the period label. */
export function PeriodNav({ view, anchor, now, onView, onStep, onToday }: PeriodNavProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Granularity segmented control */}
      <div className="inline-flex w-full gap-1 rounded-xl border border-border bg-panel p-1 min-[560px]:w-auto">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onView(v.id)}
            aria-current={view === v.id}
            className={cx(
              "flex-1 rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors min-[560px]:flex-none",
              view === v.id ? "bg-accent text-white" : "text-ink-soft hover:text-text",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Period label + stepper */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-[17px] font-extrabold tracking-tight">
          {periodLabel(view, anchor, now)}
        </h2>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={onToday}
            className="tint rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => onStep(-1)}
            className="tint grid size-9 place-items-center rounded-lg border border-border hover:border-accent hover:text-accent"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            aria-label="Next period"
            onClick={() => onStep(1)}
            className="tint grid size-9 place-items-center rounded-lg border border-border hover:border-accent hover:text-accent"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
