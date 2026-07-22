"use client";

import { create } from "zustand";
import type { TodoFilter, ViewMode } from "@/lib/Todos/types";
import { shiftPeriod, startOfDay } from "@/lib/Todos/dates";

/** What the task editor overlay is doing, or null when closed. */
export interface EditorTarget {
  /** Editing an existing task (id set) or creating a new one (undefined). */
  taskId?: string;
  /** Pre-selected due date for a new task, e.g. the calendar cell tapped. */
  due?: number | null;
}

interface TodoState {
  /** Calendar granularity currently framing the workspace. */
  view: ViewMode;
  /** Any epoch-ms inside the currently-framed period. */
  anchor: number;
  /** Which slice of tasks to show. */
  filter: TodoFilter;
  /** Free-text search across title + notes. */
  query: string;
  /** Day drilled into from the month/year overview (start-of-day), or null. */
  selectedDay: number | null;
  /** Task editor overlay target, or null when closed. */
  editor: EditorTarget | null;

  setView: (view: ViewMode) => void;
  setAnchor: (anchor: number) => void;
  step: (dir: 1 | -1) => void;
  goToday: () => void;
  setFilter: (filter: TodoFilter) => void;
  setQuery: (query: string) => void;
  setSelectedDay: (day: number | null) => void;
  openEditor: (target?: EditorTarget) => void;
  closeEditor: () => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  view: "day",
  anchor: startOfDay(Date.now()),
  filter: "all",
  query: "",
  selectedDay: null,
  editor: null,

  setView: (view) => set({ view, selectedDay: null }),
  setAnchor: (anchor) => set({ anchor }),
  step: (dir) => set((s) => ({ anchor: shiftPeriod(s.view, s.anchor, dir), selectedDay: null })),
  goToday: () => set({ anchor: startOfDay(Date.now()), selectedDay: null }),
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  setSelectedDay: (selectedDay) => set({ selectedDay }),
  openEditor: (target = {}) => set({ editor: target }),
  closeEditor: () => set({ editor: null }),
}));
