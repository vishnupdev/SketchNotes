/**
 * Domain types for the Todos app.
 *
 * A todo workspace is a flat list of {@link Task}s persisted as one document.
 * Tasks are small, so — unlike Sketchnotes documents — the whole collection is
 * loaded and cached as a single query rather than paged behind an index.
 */

/** Task urgency. Drives ordering and the colour of the priority flag. */
export type Priority = "low" | "medium" | "high";

/** The calendar granularity the workspace is currently framed by. */
export type ViewMode = "day" | "week" | "month" | "year";

/** Which slice of the task list to show. */
export type TodoFilter = "all" | "active" | "completed";

export interface Task {
  id: string;
  title: string;
  /** Optional free-text detail. */
  notes: string;
  completed: boolean;
  priority: Priority;
  /** Due date as a start-of-day epoch (ms), or null when unscheduled. */
  due: number | null;
  createdAt: number;
  updatedAt: number;
  /** When the task was marked done, or null while active. */
  completedAt: number | null;
}

/** Fields a caller may supply when creating a task; the rest are derived. */
export type NewTask = Partial<Pick<Task, "title" | "notes" | "priority" | "due">>;

/** The priorities in descending urgency — handy for ordering and pickers. */
export const PRIORITIES: Priority[] = ["high", "medium", "low"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Weight used to sort by urgency (higher = more urgent). */
export const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
