"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTodoStore } from "@/store/useTodoStore";
import { useTodos, useTodoMutations } from "@/hooks/useTodos";
import { inRange, matchesQuery, statsFor, visible } from "@/lib/Todos/selectors";
import { periodRange, startOfDay } from "@/lib/Todos/dates";
import { PeriodNav } from "@/components/Todos/molecules/PeriodNav";
import { FilterBar } from "@/components/Todos/molecules/FilterBar";
import { StatsBar } from "@/components/Todos/molecules/StatsBar";
import { DayView } from "@/components/Todos/organisms/DayView";
import { WeekView } from "@/components/Todos/organisms/WeekView";
import { MonthView } from "@/components/Todos/organisms/MonthView";
import { YearView } from "@/components/Todos/organisms/YearView";
import { TaskEditor } from "@/components/Todos/organisms/TaskEditor";
import { AppsIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Todos — a task manager with day / week / month / year framing over one
 * persisted task collection. CRUD flows through {@link useTodoMutations}; the
 * views filter/group the collection in memory. Rendered natively; theme comes
 * from the shared <body>.
 */
export function TodoApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  const view = useTodoStore((s) => s.view);
  const anchor = useTodoStore((s) => s.anchor);
  const filter = useTodoStore((s) => s.filter);
  const query = useTodoStore((s) => s.query);
  const selectedDay = useTodoStore((s) => s.selectedDay);
  const setView = useTodoStore((s) => s.setView);
  const step = useTodoStore((s) => s.step);
  const goToday = useTodoStore((s) => s.goToday);
  const setFilter = useTodoStore((s) => s.setFilter);
  const setQuery = useTodoStore((s) => s.setQuery);
  const openEditor = useTodoStore((s) => s.openEditor);

  const { data: tasks = [], isLoading } = useTodos();
  const { clearCompleted } = useTodoMutations();

  // A client-only "today", refreshed on mount so date maths stays out of SSR.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setNow(Date.now()), []);
  const todayStart = startOfDay(now);

  const pool = visible(tasks, filter, query);

  // Period stats ignore the status filter (so "Done"/"Active" counts stay
  // meaningful) but respect the search query.
  const { start, end } = periodRange(view, anchor);
  const periodPool = tasks.filter((t) => inRange(t, start, end) && matchesQuery(t, query));
  const stats = statsFor(periodPool, todayStart);
  const hasCompleted = tasks.some((t) => t.completed);

  const addDue = view === "day" ? start : selectedDay ?? undefined;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4.5" width="16" height="15.5" rx="2.4" />
                <path d="M8 3v3M16 3v3" />
                <path d="M7.5 12l1.8 1.8 3.2-3.6" />
                <path d="M14.5 12.5h3M14.5 16h3M7.5 16.4l1.8 1.8 3.2-3.6" />
              </svg>
            </span>
            <div>
              <div className="text-[27px] font-extrabold leading-none tracking-tight">Todos</div>
              <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                plan by day, week, month &amp; year
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">by Vishnu P</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openLauncher}
              title="Switch app"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
            >
              <AppsIcon size={15} />
              Apps
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 pb-[110px] pt-[22px]">
        <div className="flex flex-col gap-4">
          <PeriodNav
            view={view}
            anchor={anchor}
            now={now}
            onView={setView}
            onStep={step}
            onToday={goToday}
          />

          <StatsBar stats={stats} />

          <div className="flex flex-col gap-2.5">
            <FilterBar filter={filter} query={query} onFilter={setFilter} onQuery={setQuery} />
            {hasCompleted && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => clearCompleted.mutate()}
                  className="text-[12px] font-semibold text-ink-soft hover:text-danger"
                >
                  Clear completed
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-[13px] text-ink-soft">Loading tasks…</p>
          ) : view === "day" ? (
            <DayView pool={pool} anchor={anchor} todayStart={todayStart} />
          ) : view === "week" ? (
            <WeekView pool={pool} anchor={anchor} todayStart={todayStart} />
          ) : view === "month" ? (
            <MonthView pool={pool} anchor={anchor} todayStart={todayStart} />
          ) : (
            <YearView pool={pool} anchor={anchor} todayStart={todayStart} />
          )}
        </div>
      </main>

      {/* Floating create button — always reachable. */}
      <button
        type="button"
        aria-label="New task"
        onClick={() => openEditor({ due: addDue })}
        className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 font-semibold text-white shadow-panel transition-transform hover:scale-105 active:scale-95"
      >
        <PlusIcon size={20} />
        <span className="hidden min-[420px]:inline">New task</span>
      </button>

      <TaskEditor />
    </div>
  );
}
