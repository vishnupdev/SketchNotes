"use client";

import { cx } from "@/lib/utils";
import type { Task } from "@/lib/Todos/types";
import { isSameDay, longDate, monthLong, periodRange, startOfMonth, yearMonths } from "@/lib/Todos/dates";
import { inRange, sortTasks, statsFor } from "@/lib/Todos/selectors";
import { useTodoStore } from "@/store/useTodoStore";
import { TaskList } from "@/components/Todos/organisms/TaskList";

interface YearViewProps {
  pool: Task[];
  anchor: number;
  todayStart: number;
}

/** Twelve month cards with per-month completion, plus a dated agenda for the
 *  year with full "21 September 2026"-style date headings. */
export function YearView({ pool, anchor, todayStart }: YearViewProps) {
  const setView = useTodoStore((s) => s.setView);
  const setAnchor = useTodoStore((s) => s.setAnchor);
  const months = yearMonths(anchor);
  const thisMonthStart = startOfMonth(todayStart);

  const openMonth = (monthStart: number) => {
    setAnchor(monthStart);
    setView("month");
  };

  // Group this year's scheduled tasks by day (due is already a start-of-day).
  const { start: yearStart, end: yearEnd } = periodRange("year", anchor);
  const byDay = new Map<number, Task[]>();
  for (const t of pool) {
    if (t.due == null || t.due < yearStart || t.due >= yearEnd) continue;
    const bucket = byDay.get(t.due);
    if (bucket) bucket.push(t);
    else byDay.set(t.due, [t]);
  }
  const agenda = [...byDay.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-3 min-[860px]:grid-cols-4">
        {months.map((monthStart) => {
          const next = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 1).getTime();
          const tasks: Task[] = pool.filter((t) => inRange(t, monthStart, next));
          const stats = statsFor(tasks, todayStart);
          const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
          const isCurrent = isSameDay(monthStart, thisMonthStart);
          return (
            <button
              key={monthStart}
              type="button"
              onClick={() => openMonth(monthStart)}
              className={cx(
                "flex flex-col gap-2 rounded-xl border bg-panel p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-panel",
                isCurrent ? "border-accent" : "border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cx("text-[14px] font-bold", isCurrent && "text-accent")}>
                  {monthLong(monthStart)}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                    Now
                  </span>
                )}
              </div>

              {stats.total === 0 ? (
                <p className="text-[12px] text-ink-soft">No tasks</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-extrabold leading-none">{stats.total}</span>
                    <span className="text-[11.5px] text-ink-soft">
                      task{stats.total === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10.5px] font-semibold text-ink-soft">{pct}%</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2.5 text-[11px] text-ink-soft">
                    <span className="text-accent">{stats.active} active</span>
                    {stats.overdue > 0 && <span className="text-danger">{stats.overdue} overdue</span>}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {agenda.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-ink-soft">
            Scheduled in {new Date(yearStart).getFullYear()}
          </h3>
          {agenda.map(([day, tasks]) => (
            <div key={day} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2 px-1">
                <span className={cx("text-[13.5px] font-bold", isSameDay(day, todayStart) && "text-accent")}>
                  {longDate(day)}
                </span>
                <span className="text-[11.5px] text-ink-soft">
                  {tasks.length} task{tasks.length === 1 ? "" : "s"}
                </span>
              </div>
              <TaskList tasks={sortTasks(tasks)} now={todayStart} presorted />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
