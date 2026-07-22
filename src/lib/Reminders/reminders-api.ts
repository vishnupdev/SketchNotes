import { sGet, sSet } from "@/lib/storage";
import type { Reminder, Repeat, SoundId } from "./types";

/** Single storage slot holding the whole reminder collection. */
const KEY = "sknotes:reminders";

const SOUNDS: SoundId[] = ["chime", "bell", "beep", "digital", "marimba", "alert"];
const REPEATS: Repeat[] = ["none", "daily", "weekly", "monthly"];
const isSound = (v: unknown): v is SoundId => SOUNDS.includes(v as SoundId);
const isRepeat = (v: unknown): v is Repeat => REPEATS.includes(v as Repeat);

/** Coerce an unknown parsed value into a well-formed Reminder, or null. */
function normalize(raw: unknown): Reminder | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.fireAt !== "number") {
    return null;
  }
  const created = typeof r.createdAt === "number" ? r.createdAt : 0;
  return {
    id: r.id,
    title: r.title,
    notes: typeof r.notes === "string" ? r.notes : "",
    fireAt: r.fireAt,
    sound: isSound(r.sound) ? r.sound : "chime",
    repeat: isRepeat(r.repeat) ? r.repeat : "none",
    enabled: r.enabled !== false,
    firedAt: typeof r.firedAt === "number" ? r.firedAt : null,
    createdAt: created,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : created,
  };
}

export async function fetchReminders(): Promise<Reminder[]> {
  try {
    const raw = await sGet(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((r): r is Reminder => r !== null);
  } catch {
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await sSet(KEY, JSON.stringify(reminders));
}
