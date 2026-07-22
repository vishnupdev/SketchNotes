/**
 * Pure, in-memory task queries. Views keep the full collection and derive what
 * they show through these helpers, so filtering/grouping logic lives in one
 * testable place rather than being scattered across components.
 */

import type { Task, TodoFilter } from "./types";
import { PRIORITY_RANK } from "./types";

export const matchesFilter = (t: Task, filter: TodoFilter): boolean =>
  filter === "active" ? !t.completed : filter === "completed" ? t.completed : true;

export function matchesQuery(t: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q);
}

/** True when a task's due date falls inside the half-open range `[start, end)`. */
export const inRange = (t: Task, start: number, end: number): boolean =>
  t.due != null && t.due >= start && t.due < end;

/**
 * Standard task ordering: open tasks before done, then earliest due first
 * (undated last), then higher priority, then most recently created.
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  const ad = a.due ?? Infinity;
  const bd = b.due ?? Infinity;
  if (ad !== bd) return ad - bd;
  const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (pr !== 0) return pr;
  return b.createdAt - a.createdAt;
}

export const sortTasks = (tasks: Task[]): Task[] => [...tasks].sort(compareTasks);

export interface Stats {
  total: number;
  done: number;
  active: number;
  /** Open tasks whose due date is before today. */
  overdue: number;
}

export function statsFor(tasks: Task[], todayStart: number): Stats {
  let done = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (t.completed) done++;
    else if (t.due != null && t.due < todayStart) overdue++;
  }
  return { total: tasks.length, done, active: tasks.length - done, overdue };
}

/** Apply the visible slice (filter + search) without touching ordering. */
export const visible = (tasks: Task[], filter: TodoFilter, query: string): Task[] =>
  tasks.filter((t) => matchesFilter(t, filter) && matchesQuery(t, query));
