"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/Todos/types";
import { agendaSummary, buildAgenda } from "@/lib/Todos/agenda";
import { dueLabel } from "@/lib/Todos/dates";
import { TaskList } from "@/components/Todos/organisms/TaskList";
import { InboxIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * The agenda — every task ahead, in the order it matters.
 *
 * The four calendar views answer "what is in this period". This answers "what is
 * coming", which is the question people actually open a task app with: a job due
 * next Tuesday is invisible in Day and buried in a grid cell in Month. Grouping is
 * by distance from now rather than by calendar unit — see `lib/Todos/agenda.ts`.
 *
 * It reuses {@link TaskList} rather than rendering rows itself, so ticking,
 * editing and deleting behave identically here and in every other view; the
 * grouping is the only thing this component adds.
 */
export function AgendaView({ tasks, now }: { tasks: Task[]; now: number }) {
  const groups = useMemo(() => buildAgenda(tasks, now), [now, tasks]);
  const summary = useMemo(() => agendaSummary(groups), [groups]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center text-ink-soft">
        <InboxIcon size={30} />
        <p className="text-[13px]">
          Nothing on the agenda. Add a task, or widen the filter if you have hidden some.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The headline: the two numbers worth acting on, and one for context. */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Overdue", value: summary.overdue, alarm: summary.overdue > 0 },
          { label: "Today", value: summary.today },
          { label: "Ahead", value: summary.ahead },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cx(
              "rounded-[14px] border px-3 py-2.5",
              stat.alarm ? "border-danger/50 bg-panel" : "border-border bg-panel",
            )}
          >
            <div className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
              {stat.label}
            </div>
            <div
              className={cx(
                "mt-0.5 text-[22px] font-extrabold leading-none tabular-nums",
                stat.alarm && "text-danger",
              )}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`agenda-${group.id}`}>
          <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
            <h3
              id={`agenda-${group.id}`}
              className={cx(
                "text-[13.5px] font-bold",
                group.urgent ? "text-danger" : "text-text",
              )}
            >
              {group.label}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
              {group.tasks.length}
            </span>
            {/* Overdue is the one group where the specific dates matter at a
                glance — how far behind, not just that you are. */}
            {group.urgent && group.tasks[0]?.due != null && (
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-danger">
                oldest {dueLabel(group.tasks[0].due, now)}
              </span>
            )}
          </div>
          {group.note && (
            <p className="mb-1.5 text-[11.5px] leading-snug text-ink-soft">{group.note}</p>
          )}
          {/* Already grouped and ordered by `buildAgenda`, so the list must not
              re-sort and undo the overdue-oldest-first ordering. */}
          <TaskList tasks={group.tasks} now={now} presorted />
        </section>
      ))}
    </div>
  );
}
