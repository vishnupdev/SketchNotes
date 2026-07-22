import { sGet, sSet } from "@/lib/storage";
import type { Priority, Task } from "./types";

/** Single storage slot holding the whole task collection. */
const KEY = "sknotes:todos";

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const isPriority = (v: unknown): v is Priority => PRIORITIES.includes(v as Priority);

/** Coerce an unknown parsed value into a well-formed Task, or null if unusable. */
function normalize(raw: unknown): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.title !== "string") return null;
  const created = typeof t.createdAt === "number" ? t.createdAt : 0;
  return {
    id: t.id,
    title: t.title,
    notes: typeof t.notes === "string" ? t.notes : "",
    completed: Boolean(t.completed),
    priority: isPriority(t.priority) ? t.priority : "medium",
    due: typeof t.due === "number" ? t.due : null,
    createdAt: created,
    updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : created,
    completedAt: typeof t.completedAt === "number" ? t.completedAt : null,
  };
}

export async function fetchTodos(): Promise<Task[]> {
  try {
    const raw = await sGet(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((t): t is Task => t !== null);
  } catch {
    return [];
  }
}

export async function saveTodos(tasks: Task[]): Promise<void> {
  await sSet(KEY, JSON.stringify(tasks));
}
