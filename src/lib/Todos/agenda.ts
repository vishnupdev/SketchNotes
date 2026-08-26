/**
 * The agenda: every task ahead, grouped by how soon it matters.
 *
 * The four calendar views all answer "what is in *this* period", which is the
 * wrong question most of the time — a task due next Tuesday is invisible in the
 * day view and buried in a grid cell in the month view. The agenda is the other
 * question: what is coming, in order, regardless of which box it falls in.
 *
 * Grouping is by *relative* distance rather than by calendar unit, because that is
 * how the answer is actually used. "Overdue" and "Today" are the two that get
 * acted on; "This week" is the one that gets planned; everything past that is one
 * bucket until it gets closer.
 *
 * Pure functions over the task list, so the grouping is testable without a DOM.
 */

import type { Task } from "./types";
import { DAY_MS, startOfDay, startOfWeek } from "./dates";
import { sortTasks } from "./selectors";

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
  tasks: Task[];
  /** Overdue is the one group that should read as a problem. */
  urgent?: boolean;
}

/**
 * How many recently-completed tasks to show.
 *
 * Some is better than none — finishing things and seeing nothing happen is
 * demoralising, and it is also how you notice you ticked the wrong one — but an
 * unbounded list of everything ever done would bury the part that needs doing.
 */
const DONE_SHOWN = 8;

/** Completed within this window counts as "recently". */
const DONE_WINDOW_MS = 7 * DAY_MS;

/**
 * Group tasks for the agenda.
 *
 * `now` is passed in rather than read from the clock so the result is a pure
 * function of its inputs — which is what makes it testable, and what keeps the
 * date maths out of server rendering.
 */
export function buildAgenda(tasks: Task[], now: number): AgendaGroup[] {
  const today = startOfDay(now);
  const tomorrow = today + DAY_MS;
  const dayAfter = tomorrow + DAY_MS;
  // End of the current Monday-based week, and of the one after it.
  const weekEnd = startOfWeek(now) + 7 * DAY_MS;
  const nextWeekEnd = weekEnd + 7 * DAY_MS;

  const overdue: Task[] = [];
  const todayTasks: Task[] = [];
  const tomorrowTasks: Task[] = [];
  const week: Task[] = [];
  const nextWeek: Task[] = [];
  const later: Task[] = [];
  const unscheduled: Task[] = [];
  const done: Task[] = [];

  for (const task of tasks) {
    if (task.completed) {
      // Undated completions (finished before `completedAt` existed) still count
      // as recent rather than vanishing.
      if (task.completedAt === null || now - task.completedAt <= DONE_WINDOW_MS) done.push(task);
      continue;
    }

    if (task.due === null) {
      unscheduled.push(task);
      continue;
    }

    const due = startOfDay(task.due);
    if (due < today) overdue.push(task);
    else if (due === today) todayTasks.push(task);
    else if (due === tomorrow) tomorrowTasks.push(task);
    // The rest of this week, excluding today and tomorrow which have their own
    // groups — so a Wednesday task never appears twice.
    else if (due < weekEnd && due >= dayAfter) week.push(task);
    else if (due < nextWeekEnd) nextWeek.push(task);
    else later.push(task);
  }

  const groups: AgendaGroup[] = [
    {
      id: "overdue",
      label: "Overdue",
      note: "Past their due date and still open.",
      tasks: overdue,
      urgent: true,
    },
    { id: "today", label: "Today", tasks: todayTasks },
    { id: "tomorrow", label: "Tomorrow", tasks: tomorrowTasks },
    { id: "week", label: "Rest of this week", tasks: week },
    { id: "nextWeek", label: "Next week", tasks: nextWeek },
    { id: "later", label: "Later", note: "Beyond the next two weeks.", tasks: later },
    {
      id: "unscheduled",
      label: "No date",
      note: "Nothing will remind you about these — give one a date to bring it into the list above.",
      tasks: unscheduled,
    },
    {
      id: "done",
      label: "Recently done",
      note: "Completed in the last seven days.",
      // Newest completion first, which is the opposite of the pending ordering.
      tasks: done
        .slice()
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        .slice(0, DONE_SHOWN),
    },
  ];

  // Overdue ascends (oldest first — that is the one to deal with); everything
  // else uses the app's standard ordering.
  return groups
    .map((group) =>
      group.id === "overdue"
        ? { ...group, tasks: group.tasks.slice().sort((a, b) => (a.due ?? 0) - (b.due ?? 0)) }
        : group.id === "done"
          ? group
          : { ...group, tasks: sortTasks(group.tasks) },
    )
    .filter((group) => group.tasks.length > 0);
}

/** The headline the agenda opens with: what actually needs attention now. */
export function agendaSummary(
  groups: AgendaGroup[],
): { overdue: number; today: number; ahead: number } {
  const count = (id: AgendaGroupId) => groups.find((g) => g.id === id)?.tasks.length ?? 0;
  return {
    overdue: count("overdue"),
    today: count("today"),
    ahead: count("tomorrow") + count("week") + count("nextWeek") + count("later"),
  };
}
