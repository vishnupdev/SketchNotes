import type { NoteDocument, NoteMeta } from "@/engine/types";
import {
  isCustomThemeId,
  isThemeId,
  MAX_CUSTOM_THEMES,
  normalizeHex,
  type CustomTheme,
  type ThemeId,
} from "@/lib/themes";
import { isDensityId, isUiStyleId } from "@/lib/ui-style";
import { sDel, sGet, sSet } from "./storage";

/** Storage-key helpers keep the key scheme in one place. */
const KEY = {
  index: "sknotes:index",
  note: (id: string) => `sknotes:${id}`,
  theme: "sknotes:theme",
  customThemes: "sknotes:custom-themes",
  uiStyle: "sknotes:ui-style",
  density: "sknotes:density",
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

/* ============ custom themes ============ */

/**
 * Validate one stored record. Themes are user data that survives across
 * versions, so anything malformed is dropped rather than trusted — a bad colour
 * would otherwise reach CSS as an invalid custom property and silently blank out
 * the palette it belongs to.
 */
function parseCustomTheme(value: unknown): CustomTheme | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !isCustomThemeId(raw.id)) return null;
  if (typeof raw.label !== "string" || raw.label.trim() === "") return null;
  const accent = typeof raw.accent === "string" ? normalizeHex(raw.accent) : null;
  const paper = typeof raw.paper === "string" ? normalizeHex(raw.paper) : null;
  if (!accent || !paper) return null;
  return { id: raw.id, label: raw.label, dark: raw.dark === true, accent, paper };
}

export async function fetchCustomThemes(): Promise<CustomTheme[]> {
  try {
    const raw = await sGet(KEY.customThemes);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseCustomTheme)
      .filter((t): t is CustomTheme => t !== null)
      .slice(0, MAX_CUSTOM_THEMES);
  } catch {
    return [];
  }
}

export async function saveCustomThemes(themes: CustomTheme[]): Promise<void> {
  await sSet(KEY.customThemes, JSON.stringify(themes.slice(0, MAX_CUSTOM_THEMES)));
}

/* ============ interface style + density ============ */

export async function fetchUiStyle(): Promise<string | null> {
  const v = await sGet(KEY.uiStyle);
  return isUiStyleId(v) ? v : null;
}

export async function saveUiStyle(id: string): Promise<void> {
  await sSet(KEY.uiStyle, id);
}

export async function fetchDensity(): Promise<string | null> {
  const v = await sGet(KEY.density);
  return isDensityId(v) ? v : null;
}

export async function saveDensity(id: string): Promise<void> {
  await sSet(KEY.density, id);
}
