import { describe, expect, it } from "vitest";
import { agendaSummary, buildAgenda, type AgendaGroupId } from "./agenda";
import { DAY_MS, startOfDay, startOfWeek } from "./dates";
import type { Task } from "./types";

/**
 * The agenda grouping.
 *
 * The bug this guards against is a task appearing in two buckets or in none —
 * both invisible in the UI, since a duplicate reads as two tasks and a dropped one
 * simply is not there. The boundary cases are today/tomorrow (which have their own
 * groups and must be excluded from "rest of this week") and the week edges.
 */

/** A Wednesday, mid-morning, so "rest of this week" has room on both sides. */
const NOW = new Date(2026, 7, 26, 10, 0, 0).getTime();
const TODAY = startOfDay(NOW);

let seq = 0;
const task = (over: Partial<Task> = {}): Task => ({
  id: `t${seq++}`,
  title: "Task",
  notes: "",
  completed: false,
  priority: "medium",
  due: null,
  createdAt: 1,
  updatedAt: 1,
  completedAt: null,
  ...over,
});

const idsIn = (groups: ReturnType<typeof buildAgenda>, id: AgendaGroupId) =>
  groups.find((g) => g.id === id)?.tasks.map((t) => t.id) ?? [];

describe("buildAgenda", () => {
  it("sorts tasks into the bucket matching their distance from now", () => {
    const overdue = task({ due: TODAY - 3 * DAY_MS });
    const today = task({ due: TODAY });
    const tomorrow = task({ due: TODAY + DAY_MS });
    const later = task({ due: TODAY + 40 * DAY_MS });
    const none = task({ due: null });

    const groups = buildAgenda([overdue, today, tomorrow, later, none], NOW);

    expect(idsIn(groups, "overdue")).toEqual([overdue.id]);
    expect(idsIn(groups, "today")).toEqual([today.id]);
    expect(idsIn(groups, "tomorrow")).toEqual([tomorrow.id]);
    expect(idsIn(groups, "later")).toEqual([later.id]);
    expect(idsIn(groups, "unscheduled")).toEqual([none.id]);
  });

  it("puts every task in exactly one group", () => {
    const tasks = [
      task({ due: TODAY - DAY_MS }),
      task({ due: TODAY }),
      task({ due: TODAY + DAY_MS }),
      task({ due: TODAY + 2 * DAY_MS }),
      task({ due: TODAY + 9 * DAY_MS }),
      task({ due: TODAY + 60 * DAY_MS }),
      task({ due: null }),
      task({ completed: true, completedAt: NOW - 1000 }),
    ];

    const groups = buildAgenda(tasks, NOW);
    const placed = groups.flatMap((g) => g.tasks.map((t) => t.id));

    expect(placed).toHaveLength(tasks.length);
    expect(new Set(placed).size).toBe(tasks.length);
  });

  it("keeps today and tomorrow out of 'rest of this week'", () => {
    const groups = buildAgenda(
      [task({ due: TODAY }), task({ due: TODAY + DAY_MS }), task({ due: TODAY + 2 * DAY_MS })],
      NOW,
    );
    // Only the day-after-tomorrow task, which is still inside this week.
    expect(idsIn(groups, "week")).toHaveLength(1);
  });

  it("splits this week from next week at the week boundary", () => {
    const weekEnd = startOfWeek(NOW) + 7 * DAY_MS;
    const lastOfWeek = task({ due: weekEnd - DAY_MS });
    const firstOfNext = task({ due: weekEnd });

    const groups = buildAgenda([lastOfWeek, firstOfNext], NOW);
    expect(idsIn(groups, "week")).toEqual([lastOfWeek.id]);
    expect(idsIn(groups, "nextWeek")).toEqual([firstOfNext.id]);
  });

  it("orders overdue oldest first — that is the one to deal with", () => {
    const older = task({ due: TODAY - 10 * DAY_MS });
    const newer = task({ due: TODAY - DAY_MS });

    const groups = buildAgenda([newer, older], NOW);
    expect(idsIn(groups, "overdue")).toEqual([older.id, newer.id]);
  });

  it("shows recently completed tasks, newest first, and hides old ones", () => {
    const justDone = task({ completed: true, completedAt: NOW - 60_000 });
    const yesterday = task({ completed: true, completedAt: NOW - DAY_MS });
    const ancient = task({ completed: true, completedAt: NOW - 30 * DAY_MS });

    const groups = buildAgenda([yesterday, ancient, justDone], NOW);
    expect(idsIn(groups, "done")).toEqual([justDone.id, yesterday.id]);
  });

  it("keeps a completed task with no timestamp rather than dropping it", () => {
    const groups = buildAgenda([task({ completed: true, completedAt: null })], NOW);
    expect(idsIn(groups, "done")).toHaveLength(1);
  });

  it("caps the completed list", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      task({ completed: true, completedAt: NOW - i * 1000 }),
    );
    expect(idsIn(buildAgenda(many, NOW), "done")).toHaveLength(8);
  });

  it("omits empty groups entirely", () => {
    const groups = buildAgenda([task({ due: TODAY })], NOW);
    expect(groups.map((g) => g.id)).toEqual(["today"]);
  });

  it("returns nothing for an empty list", () => {
    expect(buildAgenda([], NOW)).toEqual([]);
  });

  it("treats a due time later in the same day as due today", () => {
    // `due` is normally start-of-day, but a task carrying a mid-day timestamp
    // must not fall into "overdue" just because the hour has passed.
    const groups = buildAgenda([task({ due: TODAY + 9 * 3_600_000 })], NOW);
    expect(idsIn(groups, "today")).toHaveLength(1);
    expect(idsIn(groups, "overdue")).toHaveLength(0);
  });
});

describe("agendaSummary", () => {
  it("counts the two groups worth acting on, and everything ahead", () => {
    const groups = buildAgenda(
      [
        task({ due: TODAY - DAY_MS }),
        task({ due: TODAY }),
        task({ due: TODAY }),
        task({ due: TODAY + DAY_MS }),
        task({ due: TODAY + 30 * DAY_MS }),
        task({ due: null }),
      ],
      NOW,
    );

    const summary = agendaSummary(groups);
    expect(summary.overdue).toBe(1);
    expect(summary.today).toBe(2);
    // Ahead spans tomorrow onwards; undated tasks are not "ahead" of anything.
    expect(summary.ahead).toBe(2);
  });
});
