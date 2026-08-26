/**
 * The workspace's agenda: everything with a time on it, from every app that has
 * one, grouped by how soon it matters.
 *
 * **Why this is shell-level.** A task and a reminder are different records owned
 * by different apps, but to a person they are the same question — *what is coming
 * up*. Answering it means reading both, and rule #5 forbids Todos importing
 * Reminders' internals or the reverse. So the merge lives here, at the shell,
 * alongside the other module with exactly this shape: `lib/storage-keys.ts`, which
 * also has to know about every app precisely because no single app may.
 *
 * The dependency direction is what keeps that honest. This module imports the two
 * apps' *types*; neither app imports this. Adding a third source later — a
 * calendar, a timer — is a new adapter here and no change to anything else.
 *
 * Grouping is by *relative* distance rather than by calendar unit, because that is
 * how the answer gets used: "overdue" and "today" are acted on, "this week" is
 * planned, and everything beyond is one bucket until it comes closer.
 */

import type { Task } from "./Todos/types";
import type { Reminder } from "./Reminders/types";
import { DAY_MS, startOfDay, startOfWeek } from "./Todos/dates";

/**
 * One thing with a time on it.
 *
 * A discriminated union carrying the original record, so a renderer can still
 * hand a `Task` to the Todos row component and a `Reminder` to its own — the
 * merge decides *ordering and grouping*, not presentation.
 */
export type ScheduleEntry =
  | {
      kind: "task";
      id: string;
      title: string;
      /** Start-of-day, or null when the task is unscheduled. */
      at: number | null;
      done: boolean;
      doneAt: number | null;
      task: Task;
    }
  | {
      kind: "reminder";
      id: string;
      title: string;
      /** The exact moment it fires. Reminders always have one. */
      at: number;
      done: boolean;
      doneAt: number | null;
      reminder: Reminder;
    };

export const taskEntry = (task: Task): ScheduleEntry => ({
  kind: "task",
  id: `task:${task.id}`,
  title: task.title,
  at: task.due,
  done: task.completed,
  doneAt: task.completedAt,
  task,
});

/**
 * A reminder as a schedule entry.
 *
 * "Done" for a reminder means *it has already fired and will not fire again* —
 * a repeating reminder whose `fireAt` has moved on to the next occurrence is not
 * done, it is upcoming. Getting this backwards would file every daily reminder
 * under "recently done" forever.
 */
export const reminderEntry = (reminder: Reminder): ScheduleEntry => ({
  kind: "reminder",
  id: `reminder:${reminder.id}`,
  title: reminder.title,
  at: reminder.fireAt,
  done: reminder.repeat === "none" && reminder.firedAt !== null,
  doneAt: reminder.firedAt,
  reminder,
});

/**
 * Build the entry list from both sources.
 *
 * Paused reminders are left out entirely rather than shown greyed: `enabled:
 * false` means the user switched it off, and an agenda is a list of what *will*
 * happen. A paused reminder is managed in the Reminders app, which is where it
 * still appears.
 */
export function scheduleEntries(tasks: Task[], reminders: Reminder[]): ScheduleEntry[] {
  return [
    ...tasks.map(taskEntry),
    ...reminders.filter((r) => r.enabled).map(reminderEntry),
  ];
}

/* -------------------------------- grouping ------------------------------- */

export type AgendaGroupId =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "nextWeek"
  | "later"
  | "unscheduled"
  | "done";

export interface AgendaGroup {
  id: AgendaGroupId;
  label: string;
  /** One line explaining the bucket, where the label alone is ambiguous. */
  note?: string;
  entries: ScheduleEntry[];
  /** Overdue is the one group that should read as a problem. */
  urgent?: boolean;
}

/**
 * How many recently-finished entries to show.
 *
 * Some is better than none — finishing things and seeing nothing happen is
 * demoralising, and it is also how you notice you ticked the wrong one — but an
 * unbounded list of everything ever done would bury the part that needs doing.
 */
const DONE_SHOWN = 8;

/** Finished within this window counts as "recently". */
const DONE_WINDOW_MS = 7 * DAY_MS;

/**
 * Order entries within a group.
 *
 * By time first, then by kind so a reminder at 09:00 and a task due that day sort
 * predictably, then by title so the order never depends on array position. A task
 * with no time sorts last inside its group.
 */
function byWhen(a: ScheduleEntry, b: ScheduleEntry): number {
  const at = a.at ?? Number.POSITIVE_INFINITY;
  const bt = b.at ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  if (a.kind !== b.kind) return a.kind === "reminder" ? -1 : 1;
  return a.title.localeCompare(b.title);
}

/**
 * Group everything for the agenda.
 *
 * `now` is passed in rather than read from the clock, so the result is a pure
 * function of its inputs — testable, and no date maths during server rendering.
 */
export function buildAgenda(entries: ScheduleEntry[], now: number): AgendaGroup[] {
  const today = startOfDay(now);
  const tomorrow = today + DAY_MS;
  const dayAfter = tomorrow + DAY_MS;
  const weekEnd = startOfWeek(now) + 7 * DAY_MS;
  const nextWeekEnd = weekEnd + 7 * DAY_MS;

  const buckets: Record<AgendaGroupId, ScheduleEntry[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    week: [],
    nextWeek: [],
    later: [],
    unscheduled: [],
    done: [],
  };

  for (const entry of entries) {
    if (entry.done) {
      // An entry finished before `doneAt` was recorded still counts as recent
      // rather than vanishing.
      if (entry.doneAt === null || now - entry.doneAt <= DONE_WINDOW_MS) buckets.done.push(entry);
      continue;
    }

    if (entry.at === null) {
      buckets.unscheduled.push(entry);
      continue;
    }

    // Compared at day granularity, so a reminder at 09:00 today is "today" all
    // day rather than becoming "overdue" at 09:01. Something already past is
    // still visible — it is at the top of today, not hidden.
    const day = startOfDay(entry.at);
    if (day < today) buckets.overdue.push(entry);
    else if (day === today) buckets.today.push(entry);
    else if (day === tomorrow) buckets.tomorrow.push(entry);
    else if (day < weekEnd && day >= dayAfter) buckets.week.push(entry);
    else if (day < nextWeekEnd) buckets.nextWeek.push(entry);
    else buckets.later.push(entry);
  }

  const groups: AgendaGroup[] = [
    {
      id: "overdue",
      label: "Overdue",
      note: "Past their time and still open.",
      entries: buckets.overdue.slice().sort(byWhen),
      urgent: true,
    },
    { id: "today", label: "Today", entries: buckets.today.slice().sort(byWhen) },
    { id: "tomorrow", label: "Tomorrow", entries: buckets.tomorrow.slice().sort(byWhen) },
    { id: "week", label: "Rest of this week", entries: buckets.week.slice().sort(byWhen) },
    { id: "nextWeek", label: "Next week", entries: buckets.nextWeek.slice().sort(byWhen) },
    {
      id: "later",
      label: "Later",
      note: "Beyond the next two weeks.",
      entries: buckets.later.slice().sort(byWhen),
    },
    {
      id: "unscheduled",
      label: "No date",
      note: "Nothing will remind you about these — give one a date to bring it into the list above.",
      entries: buckets.unscheduled.slice().sort(byWhen),
    },
    {
      id: "done",
      label: "Recently done",
      note: "Finished in the last seven days.",
      // Newest first, the opposite of the pending ordering.
      entries: buckets.done
        .slice()
        .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
        .slice(0, DONE_SHOWN),
    },
  ];

  return groups.filter((group) => group.entries.length > 0);
}

/** The headline the agenda opens with: what actually needs attention now. */
export function agendaSummary(groups: AgendaGroup[]): {
  overdue: number;
  today: number;
  ahead: number;
} {
  const count = (id: AgendaGroupId) => groups.find((g) => g.id === id)?.entries.length ?? 0;
  return {
    overdue: count("overdue"),
    today: count("today"),
    ahead: count("tomorrow") + count("week") + count("nextWeek") + count("later"),
  };
}

/** The tasks in a group, for handing to the Todos row renderer. */
export const tasksIn = (group: AgendaGroup): Task[] =>
  group.entries.filter((e) => e.kind === "task").map((e) => (e as { task: Task }).task);

/** The reminders in a group. */
export const remindersIn = (group: AgendaGroup): Reminder[] =>
  group.entries
    .filter((e) => e.kind === "reminder")
    .map((e) => (e as { reminder: Reminder }).reminder);
