"use client";

import { useEffect } from "react";
import { cx } from "@/lib/utils";
import type { Priority, Task } from "@/lib/Todos/types";
import { PRIORITY_RANK } from "@/lib/Todos/types";
import { DAY_MS, dayNum, isSameDay, monthGrid, shortDate, startOfMonth } from "@/lib/Todos/dates";
import { inRange } from "@/lib/Todos/selectors";
import { useTodoStore } from "@/store/useTodoStore";
import { QuickAdd } from "@/components/Todos/molecules/QuickAdd";
import { TaskList } from "@/components/Todos/organisms/TaskList";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOT: Record<Priority, string> = {
  high: "bg-prio-high",
  medium: "bg-prio-med",
  low: "bg-prio-low",
};

interface MonthViewProps {
  pool: Task[];
  anchor: number;
  todayStart: number;
}

/** Month calendar grid; tapping a day reveals that day's list + quick-add. */
export function MonthView({ pool, anchor, todayStart }: MonthViewProps) {
  const selectedDay = useTodoStore((s) => s.selectedDay);
  const setSelectedDay = useTodoStore((s) => s.setSelectedDay);

  const monthStart = startOfMonth(anchor);
  const grid = monthGrid(anchor);
  const currentMonth = new Date(monthStart).getMonth();
  const todayInMonth = startOfMonth(todayStart) === monthStart;

  // Default the highlighted day to today (or the 1st of a browsed month) so the
  // calendar always opens with a day selected rather than an empty panel.
  useEffect(() => {
    if (selectedDay == null) setSelectedDay(todayInMonth ? todayStart : monthStart);
  }, [selectedDay, todayInMonth, todayStart, monthStart, setSelectedDay]);

  const selectedTasks = selectedDay != null ? pool.filter((t) => inRange(t, selectedDay, selectedDay + DAY_MS)) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-panel p-2 min-[520px]:p-3">
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const tasks = pool.filter((t) => inRange(t, day, day + DAY_MS));
            const inMonth = new Date(day).getMonth() === currentMonth;
            const isToday = isSameDay(day, todayStart);
            const isSelected = selectedDay != null && isSameDay(day, selectedDay);
            const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
            // Up to three priority dots, most urgent first.
            const dots = [...tasks]
              .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
              .slice(0, 3);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cx(
                  "flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border p-1 text-center transition-colors min-[520px]:aspect-[4/3]",
                  isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-transparent hover:border-border hover:bg-paper",
                  !inMonth && "opacity-35",
                )}
              >
                <span
                  className={cx(
                    "grid size-6 place-items-center rounded-full text-[12px] font-semibold",
                    isToday && "bg-accent text-white",
                  )}
                >
                  {dayNum(day)}
                </span>
                {tasks.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {allDone ? (
                      <span className="text-[10px] font-bold text-success">✓</span>
                    ) : (
                      dots.map((t, i) => (
                        <span key={t.id + i} className={cx("size-1.5 rounded-full", DOT[t.priority])} />
                      ))
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay != null && (
        <section className="flex flex-col gap-2.5">
          <h3 className="px-1 text-[13.5px] font-bold">{shortDate(selectedDay)}</h3>
          <QuickAdd due={selectedDay} placeholder="Add a task for this day…" />
          <TaskList tasks={selectedTasks} now={todayStart} empty="No tasks on this day." />
        </section>
      )}
    </div>
  );
}
