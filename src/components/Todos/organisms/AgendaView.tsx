"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/Todos/types";
import type { Reminder } from "@/lib/Reminders/types";
import {
  agendaSummary,
  buildAgenda,
  remindersIn,
  scheduleEntries,
  tasksIn,
  type AgendaGroup,
} from "@/lib/schedule";
import { dueLabel } from "@/lib/Todos/dates";
import { TaskList } from "@/components/Todos/organisms/TaskList";
import { BellIcon, InboxIcon, RepeatIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * The agenda — everything ahead, from Todos *and* Reminders, in the order it
 * matters.
 *
 * The four calendar views answer "what is in this period", which is the wrong
 * question most of the time: a task due next Tuesday is invisible in Day and
 * buried in a grid cell in Month, and a reminder set for Thursday morning was
 * never here at all. This answers "what is coming".
 *
 * Merging two apps' records is done at the shell (`lib/schedule.ts`), not here —
 * see that module for why. This component only renders what it is handed, using
 * each app's own row treatment: tasks go through {@link TaskList} so ticking,
 * editing and deleting behave exactly as they do everywhere else, and reminders
 * get a read-only row, because a reminder is edited in its own app.
 */
export function AgendaView({
  tasks,
  reminders,
  now,
}: {
  tasks: Task[];
  reminders: Reminder[];
  now: number;
}) {
  const groups = useMemo(
    () => buildAgenda(scheduleEntries(tasks, reminders), now),
    [now, reminders, tasks],
  );
  const summary = useMemo(() => agendaSummary(groups), [groups]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center text-ink-soft">
        <InboxIcon size={30} />
        <p className="text-[13px]">
          Nothing on the agenda. Add a task or a reminder, or widen the filter if you have hidden
          some.
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
              "rounded-[14px] border bg-panel px-3 py-2.5",
              stat.alarm ? "border-danger/50" : "border-border",
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
        <GroupSection key={group.id} group={group} now={now} />
      ))}

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Tasks and reminders together. Tick or edit a task here; reminders are shown as they will
        fire and are changed in the Reminders app.
      </p>
    </div>
  );
}

function GroupSection({ group, now }: { group: AgendaGroup; now: number }) {
  const tasks = tasksIn(group);
  const reminders = remindersIn(group);
  const firstAt = group.entries[0]?.at;

  return (
    <section aria-labelledby={`agenda-${group.id}`}>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <h3
          id={`agenda-${group.id}`}
          className={cx("text-[13.5px] font-bold", group.urgent ? "text-danger" : "text-text")}
        >
          {group.label}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
          {group.entries.length}
        </span>
        {/* Overdue is the one group where the specific date matters at a glance —
            how far behind, not merely that you are. */}
        {group.urgent && firstAt != null && (
          <span className="font-mono text-[10px] uppercase tracking-[.1em] text-danger">
            oldest {dueLabel(firstAt, now)}
          </span>
        )}
      </div>

      {group.note && <p className="mb-1.5 text-[11.5px] leading-snug text-ink-soft">{group.note}</p>}

      {reminders.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-center gap-2.5 rounded-[12px] border border-border bg-panel px-3 py-2"
            >
              <span aria-hidden className="flex-none text-accent">
                <BellIcon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">
                  {reminder.title || "Reminder"}
                </span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[.08em] text-ink-soft">
                  {new Date(reminder.fireAt).toLocaleString(undefined, {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              {reminder.repeat !== "none" && (
                <span
                  title={`Repeats ${reminder.repeat}`}
                  aria-label={`Repeats ${reminder.repeat}`}
                  className="flex-none text-ink-soft"
                >
                  <RepeatIcon size={14} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Already grouped and ordered by `buildAgenda`, so the list must not
          re-sort and undo the overdue-oldest-first ordering. */}
      {tasks.length > 0 && <TaskList tasks={tasks} now={now} presorted />}
    </section>
  );
}
