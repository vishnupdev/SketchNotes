import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { KIND_BY_TYPE, SECTION_DEFAULTS, SECTION_KINDS } from "./catalog";
import type { BoardSection, SectionItem, SectionType } from "./types";

/** Single storage slot holding the whole board, like `sknotes:todos`. */
/** The one slot holding the whole board. Exported so a delete can be trashed. */
export const BOARD_KEY = "sknotes:board";
const KEY = BOARD_KEY;

const TYPES: SectionType[] = SECTION_KINDS.map((k) => k.type);
const isType = (v: unknown): v is SectionType => TYPES.includes(v as SectionType);

/** Longest title/body we keep, so one paste can't fill the storage quota. */
const MAX_TITLE = 80;
const MAX_TEXT = 4000;
const MAX_ITEMS = 200;
const MAX_SECTIONS = 60;

export const clampTitle = (s: string) => s.trim().slice(0, MAX_TITLE);
export const clampText = (s: string) => s.slice(0, MAX_TEXT);

/**
 * Only `http(s)` links are kept. Anything else — most importantly a
 * `javascript:` URL — is dropped to a plain, unlinked row, so a pasted string
 * can never become a script that runs on click.
 */
export function safeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

/** A URL, or something clearly meant as one ("example.com/docs"). */
const URL_RE = /\b(?:https?:\/\/\S+|(?:www\.)?[\w-]+(?:\.[a-z]{2,})+(?:\/\S*)?)/i;

/**
 * Split "docs https://example.com" into a label and a link, so one field can
 * accept both. Used by the links composer and by the prompt parser, which is why
 * it lives here rather than in either — the two must agree on what a link row is.
 */
export function splitLink(text: string): { label: string; url: string } {
  const m = URL_RE.exec(text);
  if (!m) return { label: text.trim(), url: "" };
  const url = safeUrl(m[0]);
  const label = text
    .replace(m[0], " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–:,]+|[-–:,]+$/g, "");
  return { label: label || m[0].replace(/^https?:\/\//, "").replace(/\/$/, ""), url };
}

/** A brand-new section of `type`, titled `title` (falling back to the default). */
export function newSection(type: SectionType, title: string): BoardSection {
  const now = Date.now();
  return {
    ...SECTION_DEFAULTS,
    id: uid(),
    type,
    title: clampTitle(title) || KIND_BY_TYPE[type].defaultTitle,
    items: [],
    done: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** A new checklist/links row. */
export function newItem(text: string, url = ""): SectionItem {
  return { id: uid(), text: clampTitle(text) || "Untitled", done: false, url: safeUrl(url) };
}

function normalizeItem(raw: unknown): SectionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Record<string, unknown>;
  if (typeof i.text !== "string") return null;
  return {
    id: typeof i.id === "string" ? i.id : uid(),
    text: clampTitle(i.text) || "Untitled",
    done: Boolean(i.done),
    url: typeof i.url === "string" ? safeUrl(i.url) : "",
  };
}

/** A finite number within `[min, max]`, or `fallback` for anything else. */
function num(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

/**
 * Coerce an untrusted parsed value into a well-formed section, or null when it
 * can't be one. Everything a section could hold is defaulted, so a board written
 * by an older version — or hand-edited in devtools — still loads.
 */
function normalize(raw: unknown): BoardSection | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !isType(s.type)) return null;
  const created = typeof s.createdAt === "number" ? s.createdAt : 0;
  return {
    id: s.id,
    type: s.type,
    title: (typeof s.title === "string" && clampTitle(s.title)) || KIND_BY_TYPE[s.type].defaultTitle,
    text: typeof s.text === "string" ? clampText(s.text) : "",
    items: Array.isArray(s.items)
      ? s.items
          .slice(0, MAX_ITEMS)
          .map(normalizeItem)
          .filter((i): i is SectionItem => i !== null)
      : [],
    value: num(s.value, 0, -1e6, 1e6),
    goal: num(s.goal, 0, 0, 1e6),
    step: num(s.step, 1, 1, 1000),
    unit: typeof s.unit === "string" ? clampTitle(s.unit) : "",
    done: Array.isArray(s.done)
      ? s.done.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [],
    collapsed: Boolean(s.collapsed),
    wide: Boolean(s.wide),
    createdAt: created,
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : created,
  };
}

export async function fetchBoard(): Promise<BoardSection[]> {
  try {
    const raw = await sGet(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, MAX_SECTIONS)
      .map(normalize)
      .filter((s): s is BoardSection => s !== null);
  } catch {
    return [];
  }
}

export async function saveBoard(sections: BoardSection[]): Promise<void> {
  await sSet(KEY, JSON.stringify(sections.slice(0, MAX_SECTIONS)));
}

/** Room left before the board hits its cap — the parser refuses "add" at zero. */
export const sectionsRemaining = (sections: BoardSection[]) =>
  Math.max(0, MAX_SECTIONS - sections.length);

export const itemsRemaining = (section: BoardSection) => Math.max(0, MAX_ITEMS - section.items.length);
