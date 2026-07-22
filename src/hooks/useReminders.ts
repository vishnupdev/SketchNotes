"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchReminders, saveReminders } from "@/lib/Reminders/reminders-api";
import { DEFAULT_SOUND, type NewReminder, type Reminder } from "@/lib/Reminders/types";
import { queryKeys } from "@/lib/query-keys";
import { uid } from "@/lib/utils";

/** Reactive reminder collection (single source of truth). */
export function useReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: fetchReminders,
    staleTime: Infinity,
  });
}

/**
 * Reminder write operations. Like Todos, each mutation persists the whole array
 * and optimistically writes it back into the cache so the UI (and the app-wide
 * scheduler) see changes immediately.
 */
export function useReminderMutations() {
  const qc = useQueryClient();

  const read = () => qc.getQueryData<Reminder[]>(queryKeys.reminders) ?? [];

  const commit = async (next: Reminder[]) => {
    qc.setQueryData(queryKeys.reminders, next);
    await saveReminders(next);
    return next;
  };

  const create = useMutation({
    mutationFn: async (input: NewReminder) => {
      const now = Date.now();
      const reminder: Reminder = {
        id: uid(),
        title: input.title.trim(),
        notes: (input.notes ?? "").trim(),
        fireAt: input.fireAt,
        sound: input.sound ?? DEFAULT_SOUND,
        repeat: input.repeat ?? "none",
        enabled: true,
        firedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      return commit([reminder, ...read()]);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Reminder> }) => {
      const now = Date.now();
      return commit(read().map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r)));
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) =>
      commit(
        read().map((r) =>
          r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r,
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => commit(read().filter((r) => r.id !== id)),
  });

  /** Replace the whole collection (used by the scheduler after firing). */
  const replace = useMutation({
    mutationFn: async (next: Reminder[]) => commit(next),
  });

  return { create, update, toggle, remove, replace };
}
