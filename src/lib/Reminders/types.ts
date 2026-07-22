/**
 * Domain types for the Reminders app.
 *
 * A reminder fires at `fireAt`, optionally repeating. The whole collection is
 * small, so — like Todos — it is loaded and cached as one query. Firing is
 * handled app-wide by the scheduler, independent of which app is on screen.
 */

/** Built-in synthesized alert sounds (see `lib/Reminders/sounds.ts`). */
export type SoundId = "chime" | "bell" | "beep" | "digital" | "marimba" | "alert";

/** How often a reminder repeats after its first fire. */
export type Repeat = "none" | "daily" | "weekly" | "monthly";

/** Which slice of reminders a list shows. */
export type ReminderFilter = "upcoming" | "all" | "done";

export const DEFAULT_SOUND: SoundId = "chime";

export interface Reminder {
  id: string;
  title: string;
  notes: string;
  /** When the reminder should fire (epoch ms). */
  fireAt: number;
  sound: SoundId;
  repeat: Repeat;
  /** Paused reminders never fire. */
  enabled: boolean;
  /** Last time it fired, or null if it never has. */
  firedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Fields a caller supplies when creating a reminder; the rest are derived. */
export type NewReminder = {
  title: string;
  fireAt: number;
} & Partial<Pick<Reminder, "notes" | "sound" | "repeat">>;

export const REPEATS: Repeat[] = ["none", "daily", "weekly", "monthly"];

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Advance a fire time by one repeat interval. */
export function advanceRepeat(at: number, repeat: Repeat): number {
  const d = new Date(at);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else return at + 60_000; // "none" shouldn't advance; nudge to avoid a loop
  return d.getTime();
}
