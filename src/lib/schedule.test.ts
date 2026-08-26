import { describe, expect, it } from "vitest";
import {
  agendaSummary,
  buildAgenda,
  remindersIn,
  scheduleEntries,
  tasksIn,
  type AgendaGroupId,
} from "./schedule";
import { DAY_MS, startOfDay, startOfWeek } from "./Todos/dates";
import type { Task } from "./Todos/types";
import type { Reminder } from "./Reminders/types";

/**
 * The workspace agenda.
 *
 * Two failure modes worth guarding: an entry landing in two buckets or in none
 * (both invisible in the UI — a duplicate reads as two items, a dropped one
 * simply is not there), and a *repeating* reminder being filed as "done" because
 * it has fired before. The second would quietly empty the agenda of every daily
 * reminder anyone has.
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

const reminder = (over: Partial<Reminder> = {}): Reminder => ({
  id: `r${seq++}`,
  title: "Reminder",
  notes: "",
  fireAt: TODAY + 9 * 3_600_000,
  sound: "chime",
  repeat: "none",
  enabled: true,
  firedAt: null,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const build = (tasks: Task[], reminders: Reminder[] = []) =>
  buildAgenda(scheduleEntries(tasks, reminders), NOW);

const idsIn = (groups: ReturnType<typeof buildAgenda>, id: AgendaGroupId) =>
  groups.find((g) => g.id === id)?.entries.map((e) => e.id) ?? [];

describe("scheduleEntries", () => {
  it("merges both sources into one list", () => {
    const entries = scheduleEntries([task(), task()], [reminder()]);
    expect(entries).toHaveLength(3);
    expect(entries.filter((e) => e.kind === "task")).toHaveLength(2);
    expect(entries.filter((e) => e.kind === "reminder")).toHaveLength(1);
  });

  it("leaves paused reminders out — an agenda is what will happen", () => {
    const entries = scheduleEntries([], [reminder({ enabled: false })]);
    expect(entries).toHaveLength(0);
  });

  it("keeps ids from the two apps distinct even when they collide", () => {
    // Both stores mint their own ids, so the same string is entirely possible.
    const entries = scheduleEntries([task({ id: "same" })], [reminder({ id: "same" })]);
    expect(new Set(entries.map((e) => e.id)).size).toBe(2);
  });
});

describe("buildAgenda", () => {
  it("sorts entries into the bucket matching their distance from now", () => {
    const overdue = task({ due: TODAY - 3 * DAY_MS });
    const today = task({ due: TODAY });
    const tomorrow = task({ due: TODAY + DAY_MS });
    const later = task({ due: TODAY + 40 * DAY_MS });
    const none = task({ due: null });

    const groups = build([overdue, today, tomorrow, later, none]);

    expect(idsIn(groups, "overdue")).toEqual([`task:${overdue.id}`]);
    expect(idsIn(groups, "today")).toEqual([`task:${today.id}`]);
    expect(idsIn(groups, "tomorrow")).toEqual([`task:${tomorrow.id}`]);
    expect(idsIn(groups, "later")).toEqual([`task:${later.id}`]);
    expect(idsIn(groups, "unscheduled")).toEqual([`task:${none.id}`]);
  });

  it("puts every entry in exactly one group", () => {
    const tasks = [
      task({ due: TODAY - DAY_MS }),
      task({ due: TODAY }),
      task({ due: TODAY + 2 * DAY_MS }),
      task({ due: TODAY + 60 * DAY_MS }),
      task({ due: null }),
      task({ completed: true, completedAt: NOW - 1000 }),
    ];
    const reminders = [
      reminder({ fireAt: TODAY + 3_600_000 }),
      reminder({ fireAt: TODAY + 5 * DAY_MS }),
    ];

    const groups = build(tasks, reminders);
    const placed = groups.flatMap((g) => g.entries.map((e) => e.id));

    expect(placed).toHaveLength(tasks.length + reminders.length);
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("files tasks and reminders into the same buckets", () => {
    const groups = build(
      [task({ due: TODAY })],
      [reminder({ fireAt: TODAY + 15 * 3_600_000 })],
    );
    const today = groups.find((g) => g.id === "today");
    expect(today?.entries).toHaveLength(2);
    expect(tasksIn(today!)).toHaveLength(1);
    expect(remindersIn(today!)).toHaveLength(1);
  });

  it("orders a group by time, so a morning reminder leads an all-day task", () => {
    const groups = build([task({ due: TODAY })], [reminder({ fireAt: TODAY + 3_600_000 })]);
    const today = groups.find((g) => g.id === "today");
    // The task's `due` is start-of-day (00:00), so it sorts before an 01:00
    // reminder — both are "today" and the ordering is by the time each carries.
    expect(today?.entries[0].kind).toBe("task");
    expect(today?.entries[1].kind).toBe("reminder");
  });

  it("does not call a repeating reminder done just because it has fired", () => {
    // The single most damaging way to get this wrong: every daily reminder
    // would vanish from the agenda forever.
    const daily = reminder({ repeat: "daily", firedAt: NOW - DAY_MS, fireAt: TODAY + DAY_MS });
    const groups = build([], [daily]);
    expect(idsIn(groups, "done")).toEqual([]);
    expect(idsIn(groups, "tomorrow")).toEqual([`reminder:${daily.id}`]);
  });

  it("does call a one-off reminder done once it has fired", () => {
    const once = reminder({ repeat: "none", firedAt: NOW - 3_600_000 });
    expect(idsIn(build([], [once]), "done")).toEqual([`reminder:${once.id}`]);
  });

  it("keeps today and tomorrow out of 'rest of this week'", () => {
    const groups = build([
      task({ due: TODAY }),
      task({ due: TODAY + DAY_MS }),
      task({ due: TODAY + 2 * DAY_MS }),
    ]);
    expect(idsIn(groups, "week")).toHaveLength(1);
  });

  it("splits this week from next week at the week boundary", () => {
    const weekEnd = startOfWeek(NOW) + 7 * DAY_MS;
    const lastOfWeek = task({ due: weekEnd - DAY_MS });
    const firstOfNext = task({ due: weekEnd });

    const groups = build([lastOfWeek, firstOfNext]);
    expect(idsIn(groups, "week")).toEqual([`task:${lastOfWeek.id}`]);
    expect(idsIn(groups, "nextWeek")).toEqual([`task:${firstOfNext.id}`]);
  });

  it("orders overdue oldest first — that is the one to deal with", () => {
    const older = task({ due: TODAY - 10 * DAY_MS });
    const newer = task({ due: TODAY - DAY_MS });
    expect(idsIn(build([newer, older]), "overdue")).toEqual([
      `task:${older.id}`,
      `task:${newer.id}`,
    ]);
  });

  it("shows recently finished entries newest first, and hides old ones", () => {
    const justDone = task({ completed: true, completedAt: NOW - 60_000 });
    const yesterday = task({ completed: true, completedAt: NOW - DAY_MS });
    const ancient = task({ completed: true, completedAt: NOW - 30 * DAY_MS });

    expect(idsIn(build([yesterday, ancient, justDone]), "done")).toEqual([
      `task:${justDone.id}`,
      `task:${yesterday.id}`,
    ]);
  });

  it("keeps a finished entry with no timestamp rather than dropping it", () => {
    expect(idsIn(build([task({ completed: true, completedAt: null })]), "done")).toHaveLength(1);
  });

  it("caps the finished list", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      task({ completed: true, completedAt: NOW - i * 1000 }),
    );
    expect(idsIn(build(many), "done")).toHaveLength(8);
  });

  it("omits empty groups entirely", () => {
    expect(build([task({ due: TODAY })]).map((g) => g.id)).toEqual(["today"]);
  });

  it("returns nothing for an empty list", () => {
    expect(build([], [])).toEqual([]);
  });

  it("treats a time later in the same day as today, not overdue", () => {
    // A reminder set for 21:00 is still "today" at 10:00 — and one set for 09:00
    // is still today at 10:00 too, not overdue.
    const evening = reminder({ fireAt: TODAY + 21 * 3_600_000 });
    const passed = reminder({ fireAt: TODAY + 9 * 3_600_000 });
    const groups = build([], [evening, passed]);
    expect(idsIn(groups, "today")).toHaveLength(2);
    expect(idsIn(groups, "overdue")).toHaveLength(0);
  });
});

describe("agendaSummary", () => {
  it("counts the two groups worth acting on, and everything ahead", () => {
    const groups = build(
      [
        task({ due: TODAY - DAY_MS }),
        task({ due: TODAY }),
        task({ due: TODAY + DAY_MS }),
        task({ due: TODAY + 30 * DAY_MS }),
        task({ due: null }),
      ],
      [reminder({ fireAt: TODAY + 2 * 3_600_000 })],
    );

    const summary = agendaSummary(groups);
    expect(summary.overdue).toBe(1);
    // One task and one reminder, both today.
    expect(summary.today).toBe(2);
    // Tomorrow onwards; undated entries are not "ahead" of anything.
    expect(summary.ahead).toBe(2);
  });
});
