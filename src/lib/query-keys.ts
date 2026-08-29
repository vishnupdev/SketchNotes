/** Central registry of TanStack Query keys for cache consistency. */
export const queryKeys = {
  notes: ["notes"] as const,
  notesIndex: ["notes", "index"] as const,
  noteDetail: (id: string) => ["notes", "detail", id] as const,
  todos: ["todos"] as const,
  board: ["board"] as const,
  reminders: ["reminders"] as const,
  systemInfo: ["system-info"] as const,
  storageAudit: ["resources", "storage-audit"] as const,
  news: (tab: string) => ["news", tab] as const,
  streams: (kind: string, query: string) => ["streams", kind, query] as const,
  countryNews: (code: string) => ["worldclock", "news", code] as const,
  translation: (mode: string, source: string, target: string, text: string) =>
    ["translation", mode, source, target, text] as const,
  theme: ["theme"] as const,
  weatherFrames: ["satellite", "weather-frames"] as const,
  placeSearch: (query: string) => ["satellite", "places", query] as const,
};
