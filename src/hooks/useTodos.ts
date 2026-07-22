"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTodos, saveTodos } from "@/lib/Todos/todos-api";
import type { NewTask, Task } from "@/lib/Todos/types";
import { startOfDay } from "@/lib/Todos/dates";
import { queryKeys } from "@/lib/query-keys";
import { uid } from "@/lib/utils";

/** Reactive task collection. The list is the single source of truth; views
 *  filter/group it in memory. */
export function useTodos() {
  return useQuery({
    queryKey: queryKeys.todos,
    queryFn: fetchTodos,
    staleTime: Infinity,
  });
}

/**
 * All task write operations, colocated so they share one queryClient and keep
 * the cached collection in sync. Every mutation persists the whole array and
 * optimistically writes it back into the cache, so the UI updates immediately.
 */
export function useTodoMutations() {
  const qc = useQueryClient();

  const read = () => qc.getQueryData<Task[]>(queryKeys.todos) ?? [];

  const commit = async (next: Task[]) => {
    qc.setQueryData(queryKeys.todos, next);
    await saveTodos(next);
    return next;
  };

  const create = useMutation({
    mutationFn: async (input: NewTask) => {
      const now = Date.now();
      const task: Task = {
        id: uid(),
        title: (input.title ?? "").trim(),
        notes: (input.notes ?? "").trim(),
        completed: false,
        priority: input.priority ?? "medium",
        due: input.due != null ? startOfDay(input.due) : null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      // Newest first so fresh tasks surface at the top of unsorted lists.
      return commit([task, ...read()]);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const now = Date.now();
      const next = read().map((t) => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch, updatedAt: now };
        if (merged.due != null) merged.due = startOfDay(merged.due);
        return merged;
      });
      return commit(next);
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const now = Date.now();
      const next = read().map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, completedAt: t.completed ? null : now, updatedAt: now }
          : t,
      );
      return commit(next);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => commit(read().filter((t) => t.id !== id)),
  });

  const clearCompleted = useMutation({
    mutationFn: async () => commit(read().filter((t) => !t.completed)),
  });

  return { create, update, toggle, remove, clearCompleted };
}
