import type { SectionType } from "./types";

/**
 * The catalog of section types — the single place a type's name, the words that
 * name it in a prompt, its colour token and its starting values are declared.
 * Adding a type here plus a body component in `components/Board/molecules` is the
 * whole job; the parser, the help sheet and the "add" menu all read this list.
 */
export interface SectionKind {
  type: SectionType;
  /** Display name, used in messages and the add menu. */
  label: string;
  /** One line explaining what the section is for. */
  blurb: string;
  /** Title given to a section the prompt didn't name. */
  defaultTitle: string;
  /**
   * Phrases that name this type in a prompt. Matched as whole words across all
   * types at once, longest phrase first (see {@link TYPE_PHRASES}), so
   * "habit tracker" resolves to `habit` rather than `counter`'s "tracker".
   */
  phrases: string[];
  /** CSS custom property holding this type's hue (defined in globals.css). */
  hue: string;
  /** Example prompts for the help sheet. */
  examples: string[];
}

export const SECTION_KINDS: SectionKind[] = [
  {
    type: "note",
    label: "Note",
    blurb: "Free text — jot anything.",
    defaultTitle: "Note",
    phrases: ["note", "notes", "notepad", "text", "memo", "journal", "scratchpad", "scratch pad", "idea", "ideas"],
    hue: "--board-note",
    examples: ["add a note called Ideas", "add a section for meeting notes"],
  },
  {
    type: "checklist",
    label: "Checklist",
    blurb: "Tickable rows for lists and steps.",
    defaultTitle: "Checklist",
    phrases: [
      "checklist",
      "check list",
      "todo list",
      "to-do list",
      "task list",
      "shopping list",
      "packing list",
      "list",
      "tasks",
      "todos",
      "steps",
    ],
    hue: "--board-checklist",
    examples: ["add a checklist for groceries", "add milk to groceries", "check milk"],
  },
  {
    type: "counter",
    label: "Counter",
    blurb: "A tally you step up and down, with an optional goal.",
    defaultTitle: "Counter",
    phrases: ["counter", "count", "tracker", "tally", "score", "reps", "goal"],
    hue: "--board-counter",
    examples: ["add a counter for pushups", "set the pushups goal to 50", "add 5 to pushups"],
  },
  {
    type: "links",
    label: "Links",
    blurb: "Shortcuts to the pages you keep going back to.",
    defaultTitle: "Links",
    phrases: ["links", "link", "link list", "bookmarks", "bookmark", "shortcuts", "urls", "url", "resources"],
    hue: "--board-links",
    examples: ["add a links section for work", "add docs https://example.com to work"],
  },
  {
    type: "habit",
    label: "Habit",
    blurb: "A seven-day streak you tick off daily.",
    defaultTitle: "Habit",
    phrases: ["habit tracker", "habit", "habits", "streak", "routine", "daily"],
    hue: "--board-habit",
    examples: ["add a habit for reading", "add a habit tracker called Stretch"],
  },
];

export const KIND_BY_TYPE = Object.fromEntries(SECTION_KINDS.map((k) => [k.type, k])) as Record<
  SectionType,
  SectionKind
>;

/** Every type-naming phrase, longest first so the most specific one wins. */
export const TYPE_PHRASES: Array<{ phrase: string; type: SectionType }> = SECTION_KINDS.flatMap(
  (k) => k.phrases.map((phrase) => ({ phrase, type: k.type })),
).sort((a, b) => b.phrase.length - a.phrase.length);

/** Section defaults, shared by "add a section" and by the storage normalizer. */
export const SECTION_DEFAULTS = {
  text: "",
  value: 0,
  goal: 0,
  step: 1,
  unit: "",
  collapsed: false,
  wide: false,
} as const;

/**
 * Boards a first-time visitor can start from, so the empty state teaches the
 * grammar with something worth keeping rather than a lorem-ipsum demo.
 */
export const STARTER_PROMPTS = [
  "add a checklist for groceries",
  "add a counter for water with a goal of 8",
  "add a habit for reading",
  "add a note called Ideas",
  "add a links section for work",
];

/** Prompts offered beside the composer once the board has something on it. */
export const NEXT_PROMPTS = [
  "add a checklist for today",
  "add a counter for steps",
  "rename ",
  "move ",
  "remove ",
];
