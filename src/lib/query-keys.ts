/** Central registry of TanStack Query keys for cache consistency. */
export const queryKeys = {
  notes: ["notes"] as const,
  notesIndex: ["notes", "index"] as const,
  noteDetail: (id: string) => ["notes", "detail", id] as const,
  todos: ["todos"] as const,
  reminders: ["reminders"] as const,
  systemInfo: ["system-info"] as const,
  news: (tab: string) => ["news", tab] as const,
  theme: ["theme"] as const,
};
