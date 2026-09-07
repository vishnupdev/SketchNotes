/**
 * Getting cards in and out.
 *
 * Typing cards one at a time is the slowest way to build a deck, so the import
 * accepts the formats people already have: a tab-separated export from Anki or
 * a spreadsheet, `front | back` lines, or `front — back`. It picks the
 * separator per file, from the header-free evidence of the lines themselves,
 * and reports what it could not read instead of dropping it silently — an
 * import that quietly skips a third of a file is how you end up studying a deck
 * with holes in it.
 *
 * Export is the same format back, plus a JSON form that carries the *schedule*.
 * That distinction matters: the text form is for editing and sharing, the JSON
 * form is the only one that preserves months of review history.
 */

import { uid } from "@/lib/utils";
import { newCard, type Card } from "./srs";

export interface Deck {
  id: string;
  name: string;
  /** Cards, in the order they were written. */
  cards: Card[];
  created: number;
}

/** Separators an import will consider, in the order they are tried. */
const SEPARATORS = ["\t", " | ", "|", " — ", " – ", " - ", ";", ","] as const;

export interface ImportResult {
  cards: { front: string; back: string; hint?: string }[];
  /** Lines that held no separator, so could not be split into two sides. */
  skipped: string[];
  /** Which separator was chosen. */
  separator: string;
}

/**
 * Choose the separator, then split on it.
 *
 * The separator is whichever candidate splits the *most* lines into exactly two
 * non-empty halves — not the first one that appears anywhere. A deck of English
 * definitions is full of commas and hyphens inside the text; picking by count
 * of clean two-way splits is what keeps "Ada Lovelace, mathematician | wrote
 * the first algorithm" from being cut in the wrong place.
 */
export function parseImport(text: string): ImportResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    // `#` opens a comment, so a shared deck can carry a title and notes.
    .filter((line) => line !== "" && !line.startsWith("#"));

  if (lines.length === 0) return { cards: [], skipped: [], separator: "\t" };

  const score = (separator: string) =>
    lines.filter((line) => {
      const index = line.indexOf(separator);
      return index > 0 && line.slice(index + separator.length).trim() !== "";
    }).length;

  let separator: string = SEPARATORS[0];
  let best = 0;
  for (const candidate of SEPARATORS) {
    const count = score(candidate);
    if (count > best) {
      best = count;
      separator = candidate;
    }
  }

  const cards: ImportResult["cards"] = [];
  const skipped: string[] = [];

  for (const line of lines) {
    const index = best > 0 ? line.indexOf(separator) : -1;
    if (index <= 0) {
      skipped.push(line);
      continue;
    }
    const front = line.slice(0, index).trim();
    const rest = line.slice(index + separator.length).trim();
    if (front === "" || rest === "") {
      skipped.push(line);
      continue;
    }
    // A third field is a hint, which is how most exports carry one.
    const second = rest.indexOf(separator);
    const back = second > 0 ? rest.slice(0, second).trim() : rest;
    const hint = second > 0 ? rest.slice(second + separator.length).trim() : "";
    cards.push({ front, back, ...(hint !== "" ? { hint } : {}) });
  }

  return { cards, skipped, separator };
}

/** Turn parsed rows into new, unstudied cards. */
export const toCards = (rows: ImportResult["cards"], now: number): Card[] =>
  rows.map((row) => newCard(uid(), row.front, row.back, row.hint, now));

/** The editable text form: one card a line, `front | back`. */
export function toText(deck: Deck): string {
  return [
    `# ${deck.name}`,
    ...deck.cards.map((card) =>
      [card.front, card.back, card.hint].filter((part) => part && part !== "").join(" | "),
    ),
  ].join("\n");
}

/** The form that carries the schedule as well as the words. */
export function toBackup(decks: Deck[]): string {
  return JSON.stringify({ app: "cards", v: 1, decks }, null, 2);
}

const isCard = (value: unknown): value is Card => {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Partial<Card>;
  return typeof card.front === "string" && typeof card.back === "string";
};

/**
 * Read a JSON backup.
 *
 * Every field is re-validated and anything missing is defaulted, because a
 * backup is the one input that can be years old: a card written before a field
 * existed must load rather than crash the deck it is in.
 */
export function fromBackup(json: string, now: number): Deck[] {
  const parsed = JSON.parse(json) as unknown;
  if (typeof parsed !== "object" || parsed === null) throw new Error("That is not a deck backup.");

  const decks = (parsed as { decks?: unknown }).decks;
  if (!Array.isArray(decks)) throw new Error("That backup holds no decks.");

  return decks.map((raw) => {
    const deck = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Deck>;
    const cards = Array.isArray(deck.cards) ? deck.cards.filter(isCard) : [];

    return {
      id: typeof deck.id === "string" && deck.id !== "" ? deck.id : uid(),
      name: typeof deck.name === "string" && deck.name.trim() !== "" ? deck.name : "Imported deck",
      created: typeof deck.created === "number" ? deck.created : now,
      cards: cards.map((card) => ({
        ...newCard(
          typeof card.id === "string" && card.id !== "" ? card.id : uid(),
          card.front,
          card.back,
          card.hint,
          typeof card.created === "number" ? card.created : now,
        ),
        phase: card.phase === "learning" || card.phase === "review" ? card.phase : "new",
        step: Number.isFinite(card.step) ? Number(card.step) : 0,
        interval: Number.isFinite(card.interval) ? Number(card.interval) : 0,
        ease: Number.isFinite(card.ease) ? Number(card.ease) : 2.5,
        due: Number.isFinite(card.due) ? Number(card.due) : now,
        reps: Number.isFinite(card.reps) ? Number(card.reps) : 0,
        lapses: Number.isFinite(card.lapses) ? Number(card.lapses) : 0,
      })),
    };
  });
}

/** A deck to start from, so the app is never an empty screen with a plus sign. */
export function sampleDeck(now: number): Deck {
  const rows = [
    { front: "What does `git rebase -i` do?", back: "Replays commits one at a time, letting you reorder, squash, edit or drop each" },
    { front: "Cmd/Ctrl + K, in this workspace", back: "Opens the command palette — jump to any app, PDF tool or theme by typing" },
    { front: "WCAG AA contrast, body text", back: "4.5 : 1 against its background (3 : 1 for large text)" },
    { front: "Why a bar chart's axis must start at zero", back: "Bar length *is* the value, so a floating baseline exaggerates the differences" },
    { front: "What PBKDF2 is for", back: "Turning a passphrase into a key slowly, so guessing costs the attacker real time" },
  ];

  return {
    id: uid(),
    name: "Starter deck",
    created: now,
    cards: toCards(rows, now),
  };
}
