"use client";

import { create } from "zustand";
import type { Reminder, ReminderFilter } from "@/lib/Reminders/types";

/** What the reminder editor overlay is doing, or null when closed. */
export interface ReminderEditorTarget {
  /** Editing an existing reminder (id set) or creating a new one. */
  reminderId?: string;
}

interface ReminderState {
  filter: ReminderFilter;
  /** Editor overlay target, or null when closed. */
  editor: ReminderEditorTarget | null;
  /** Reminders that have fired and are awaiting acknowledgement (the alert). */
  ringing: Reminder[];

  setFilter: (filter: ReminderFilter) => void;
  openEditor: (target?: ReminderEditorTarget) => void;
  closeEditor: () => void;
  pushRinging: (reminders: Reminder[]) => void;
  dismissRinging: (id: string) => void;
  clearRinging: () => void;
}

export const useReminderStore = create<ReminderState>((set) => ({
  filter: "upcoming",
  editor: null,
  ringing: [],

  setFilter: (filter) => set({ filter }),
  openEditor: (target = {}) => set({ editor: target }),
  closeEditor: () => set({ editor: null }),
  pushRinging: (reminders) =>
    set((s) => {
      const have = new Set(s.ringing.map((r) => r.id));
      const fresh = reminders.filter((r) => !have.has(r.id));
      return fresh.length ? { ringing: [...s.ringing, ...fresh] } : s;
    }),
  dismissRinging: (id) => set((s) => ({ ringing: s.ringing.filter((r) => r.id !== id) })),
  clearRinging: () => set({ ringing: [] }),
}));
