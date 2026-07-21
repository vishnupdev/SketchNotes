import type { NoteDocument, NoteMeta } from "@/engine/types";
import { isThemeId, type ThemeId } from "@/lib/themes";
import { sDel, sGet, sSet } from "./storage";

/** Storage-key helpers keep the key scheme in one place. */
const KEY = {
  index: "sknotes:index",
  note: (id: string) => `sknotes:${id}`,
  theme: "sknotes:theme",
};

/* ============ notes index ============ */

export async function fetchNotesIndex(): Promise<NoteMeta[]> {
  try {
    const raw = await sGet(KEY.index);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNotesIndex(notes: NoteMeta[]): Promise<void> {
  await sSet(KEY.index, JSON.stringify(notes));
}

/* ============ individual notes ============ */

export async function fetchNote(id: string): Promise<NoteDocument> {
  try {
    const raw = await sGet(KEY.note(id));
    if (raw) {
      const data = JSON.parse(raw);
      return { title: data.title ?? "", els: Array.isArray(data.els) ? data.els : [] };
    }
  } catch {
    /* fall through to empty */
  }
  return { title: "", els: [] };
}

export async function saveNote(id: string, doc: NoteDocument): Promise<void> {
  await sSet(KEY.note(id), JSON.stringify(doc));
}

export async function deleteNote(id: string): Promise<void> {
  await sDel(KEY.note(id));
}

/* ============ theme ============ */

export async function fetchTheme(): Promise<ThemeId | null> {
  const v = await sGet(KEY.theme);
  return isThemeId(v) ? v : null;
}

export async function saveTheme(theme: ThemeId): Promise<void> {
  await sSet(KEY.theme, theme);
}
