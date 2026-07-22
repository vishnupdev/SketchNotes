"use client";

import type { Task } from "@/lib/Todos/types";
import { periodRange } from "@/lib/Todos/dates";
import { inRange } from "@/lib/Todos/selectors";
import { QuickAdd } from "@/components/Todos/molecules/QuickAdd";
import { TaskList } from "@/components/Todos/organisms/TaskList";

interface DayViewProps {
  pool: Task[];
  anchor: number;
  todayStart: number;
}

/** A single day: quick-add + that day's tasks, plus any undated "someday" tasks. */
export function DayView({ pool, anchor, todayStart }: DayViewProps) {
  const { start, end } = periodRange("day", anchor);
  const dayTasks = pool.filter((t) => inRange(t, start, end));
  const undated = pool.filter((t) => t.due == null);

  return (
    <div className="flex flex-col gap-3">
      <QuickAdd due={start} placeholder="Add a task for this day…" />
      <TaskList tasks={dayTasks} now={todayStart} empty="No tasks scheduled for this day." />

      {undated.length > 0 && (
        <section className="mt-2">
          <h3 className="mb-2 px-1 text-[11.5px] font-bold uppercase tracking-wider text-ink-soft">
            No date · {undated.length}
          </h3>
          <TaskList tasks={undated} now={todayStart} />
        </section>
      )}
    </div>
  );
}
