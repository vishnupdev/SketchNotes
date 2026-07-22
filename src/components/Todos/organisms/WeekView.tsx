"use client";

import { cx } from "@/lib/utils";
import type { Task } from "@/lib/Todos/types";
import { DAY_MS, dayNum, isSameDay, weekDays, weekdayShort } from "@/lib/Todos/dates";
import { inRange, sortTasks } from "@/lib/Todos/selectors";
import { useTodoStore } from "@/store/useTodoStore";
import { TaskList } from "@/components/Todos/organisms/TaskList";
import { PlusIcon } from "@/components/SketchNotes/atoms/icons";

interface WeekViewProps {
  pool: Task[];
  anchor: number;
  todayStart: number;
}

/** Seven day columns (stacked on mobile), each its own mini task list. */
export function WeekView({ pool, anchor, todayStart }: WeekViewProps) {
  const openEditor = useTodoStore((s) => s.openEditor);
  const days = weekDays(anchor);

  return (
    <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[1000px]:grid-cols-3">
      {days.map((day) => {
        const tasks = sortTasks(pool.filter((t) => inRange(t, day, day + DAY_MS)));
        const isToday = isSameDay(day, todayStart);
        const done = tasks.filter((t) => t.completed).length;
        return (
          <section
            key={day}
            className={cx(
              "flex flex-col rounded-xl border bg-panel p-3",
              isToday ? "border-accent" : "border-border",
            )}
          >
            <header className="mb-2 flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className={cx("text-[13px] font-bold", isToday && "text-accent")}>
                  {weekdayShort(day)}
                </span>
                <span className="text-[12px] text-ink-soft">{dayNum(day)}</span>
                {isToday && (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {tasks.length > 0 && (
                  <span className="text-[11px] font-semibold text-ink-soft">
                    {done}/{tasks.length}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Add task on ${weekdayShort(day)} ${dayNum(day)}`}
                  onClick={() => openEditor({ due: day })}
                  className="tint grid size-7 place-items-center rounded-lg text-ink-soft hover:text-accent"
                >
                  <PlusIcon size={16} />
                </button>
              </div>
            </header>
            <TaskList tasks={tasks} now={todayStart} presorted empty="No tasks" />
          </section>
        );
      })}
    </div>
  );
}
