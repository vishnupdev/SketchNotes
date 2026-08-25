import { sGet } from "@/lib/storage";
import { KEY, fetchNotesIndex } from "@/lib/notes-api";
import { fetchTodos } from "@/lib/Todos/todos-api";
import { fetchBoard } from "@/lib/Board/board-api";
import { fetchReminders } from "@/lib/Reminders/reminders-api";
import { readPayload } from "@/lib/qr/payload";
import { snippetAround, type ContentHit, type ContentProvider } from "./content";

/**
 * The data readers behind the palette's content search.
 *
 * Loaded on the first search and never before (see `./content.ts`), so none of
 * this — nor the app modules it pulls in — reaches the initial payload.
 *
 * Each provider reads through the owning app's own data API rather than parsing
 * its storage directly, so an app that changes how it stores things keeps working
 * here for free. The one exception is note *bodies*, and the reason is in the
 * comment on that provider.
 */

const hit = (h: ContentHit): ContentHit => h;

/* ------------------------------ sketch notes ---------------------------- */

/**
 * Notes are searched by title *and* body, which is what "find the note where I
 * wrote X" actually needs.
 *
 * Bodies mean reading every note document, so the raw stored string is tested
 * with a plain `includes` **before** anything is parsed. A miss costs a substring
 * scan; only a hit pays for `JSON.parse`. That is the difference between this
 * being usable with a hundred notes and not.
 */
const notesProvider: ContentProvider = {
  app: "sketchnotes",
  find: async (query, limit) => {
    const index = await fetchNotesIndex();
    const hits: ContentHit[] = [];

    for (const meta of index) {
      if (hits.length >= limit) break;
      const titleMatch = meta.title.toLowerCase().includes(query);
      const raw = (await sGet(KEY.note(meta.id))) ?? "";
      // The cheap pre-filter: the stored JSON contains every text element, so a
      // body match shows up here without decoding anything.
      if (!titleMatch && !raw.toLowerCase().includes(query)) continue;

      let snippet: string | undefined;
      if (!titleMatch) {
        try {
          const doc = JSON.parse(raw) as { els?: Array<{ type?: string; text?: string }> };
          const text = (doc.els ?? [])
            .filter((el) => el?.type === "text" && typeof el.text === "string")
            .map((el) => el.text)
            .join(" ");
          if (text.toLowerCase().includes(query)) snippet = snippetAround(text, query);
          // A match only in the raw JSON (a colour name, an id) is not something
          // a person searched for, so it is dropped rather than shown.
          else continue;
        } catch {
          continue;
        }
      }

      hits.push(
        hit({
          id: `note:${meta.id}`,
          app: "sketchnotes",
          title: meta.title || "Untitled note",
          snippet,
          target: meta.id,
          updatedAt: meta.updatedAt,
        }),
      );
    }
    return hits;
  },
};

/* --------------------------------- todos -------------------------------- */

const todosProvider: ContentProvider = {
  app: "todos",
  find: async (query, limit) => {
    const tasks = await fetchTodos();
    return tasks
      .filter(
        (t) => t.title.toLowerCase().includes(query) || t.notes.toLowerCase().includes(query),
      )
      .slice(0, limit)
      .map((t) =>
        hit({
          id: `todo:${t.id}`,
          app: "todos",
          title: t.title,
          snippet: t.notes ? snippetAround(t.notes, query) : t.completed ? "done" : undefined,
          updatedAt: t.updatedAt,
        }),
      );
  },
};

/* --------------------------------- board -------------------------------- */

const boardProvider: ContentProvider = {
  app: "board",
  find: async (query, limit) => {
    const sections = await fetchBoard();
    const hits: ContentHit[] = [];
    for (const section of sections) {
      if (hits.length >= limit) break;
      const rows = section.items.map((i) => i.text).join(" ");
      const where =
        (section.title.toLowerCase().includes(query) && "title") ||
        (section.text.toLowerCase().includes(query) && "text") ||
        (rows.toLowerCase().includes(query) && "rows") ||
        null;
      if (!where) continue;
      hits.push(
        hit({
          id: `board:${section.id}`,
          app: "board",
          title: section.title,
          snippet:
            where === "text"
              ? snippetAround(section.text, query)
              : where === "rows"
                ? snippetAround(rows, query)
                : `${section.type} section`,
          // The board can scroll to and flash a section, so a hit lands on the
          // card rather than merely on the app.
          target: section.id,
          updatedAt: section.updatedAt,
        }),
      );
    }
    return hits;
  },
};

/* ------------------------------- reminders ------------------------------ */

const remindersProvider: ContentProvider = {
  app: "reminders",
  find: async (query, limit) => {
    const reminders = await fetchReminders();
    return reminders
      .filter(
        (r) => r.title.toLowerCase().includes(query) || r.notes.toLowerCase().includes(query),
      )
      .slice(0, limit)
      .map((r) =>
        hit({
          id: `reminder:${r.id}`,
          app: "reminders",
          title: r.title,
          snippet: new Date(r.fireAt).toLocaleString(),
          updatedAt: r.updatedAt,
        }),
      );
  },
};

/* ------------------------------- QR history ----------------------------- */

const qrProvider: ContentProvider = {
  app: "qr",
  find: async (query, limit) => {
    const raw = await sGet("sknotes:qr:history");
    if (!raw || !raw.toLowerCase().includes(query)) return [];
    try {
      const rows = JSON.parse(raw) as Array<{ id: string; text: string; ts: number }>;
      return rows
        .filter((r) => typeof r?.text === "string" && r.text.toLowerCase().includes(query))
        .slice(0, limit)
        .map((r) =>
          hit({
            id: `qr:${r.id}`,
            app: "qr",
            title: readPayload(r.text).label,
            snippet: snippetAround(r.text, query),
            updatedAt: r.ts,
          }),
        );
    } catch {
      return [];
    }
  },
};

/* ----------------------------- Malayalam text --------------------------- */

const malayalamProvider: ContentProvider = {
  app: "malayalam",
  find: async (query) => {
    const raw = (await sGet("sknotes:malayalam-doc")) ?? "";
    if (!raw.toLowerCase().includes(query)) return [];
    return [
      hit({
        id: "malayalam:doc",
        app: "malayalam",
        title: "Your Malayalam document",
        snippet: snippetAround(raw, query),
      }),
    ];
  },
};

/**
 * Everything searched, and deliberately not more.
 *
 * The Assistant's conversation and the Translate history are left out: both are
 * full of things the user typed *about* other things, and surfacing them in a
 * global search would be surprising rather than useful.
 */
export const providers: ContentProvider[] = [
  notesProvider,
  todosProvider,
  boardProvider,
  remindersProvider,
  qrProvider,
  malayalamProvider,
];
