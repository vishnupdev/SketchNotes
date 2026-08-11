/**
 * Board — the shapes of a user-composed page.
 *
 * A board is an ordered list of {@link BoardSection}s. Every section carries the
 * union of all per-type fields rather than being a discriminated union: the board
 * is edited mostly through *generic* operations (rename, move, resize, remove,
 * reset) plus a prompt parser that decides the type late, and a flat record keeps
 * those paths free of per-type narrowing. It also makes `normalize` in
 * `board-api.ts` a single pass, and lets a section change type without losing the
 * content that the new type still uses. Mirrors the flat `Task` in `lib/Todos`.
 */

/** The kinds of section a board can hold. Extend via `catalog.ts`. */
export type SectionType = "note" | "checklist" | "counter" | "links" | "habit";

/** A row inside a checklist or links section. */
export interface SectionItem {
  id: string;
  /** Label. For a links row this is the link text. */
  text: string;
  /** Ticked state — checklist only. */
  done: boolean;
  /** Destination — links only. Empty when the row is just a label. */
  url: string;
}

export interface BoardSection {
  id: string;
  type: SectionType;
  title: string;
  /** Body text — `note` only. */
  text: string;
  /** Rows — `checklist` and `links`. */
  items: SectionItem[];
  /** Current tally — `counter` only. */
  value: number;
  /** Tally target; 0 means "no goal", which hides the progress bar. */
  goal: number;
  /** How much one tap of +/− moves `value`. */
  step: number;
  /** What `value` counts, e.g. "glasses". Empty for a bare number. */
  unit: string;
  /** Local `YYYY-MM-DD` keys that are marked done — `habit` only. */
  done: string[];
  /** Body hidden, leaving just the card header. */
  collapsed: boolean;
  /** Spans two columns where the grid has room for it. */
  wide: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Where a section can be moved to. */
export type Placement = "top" | "bottom" | "up" | "down";

/** Numeric fields a prompt can set directly. */
export type NumField = "value" | "goal" | "step";

/**
 * A resolved instruction. Section and item references are already resolved to
 * ids by the parser, so {@link applyCommand} never has to guess what was meant.
 */
export type BoardCommand =
  /**
   * `goal` is only meaningful for a counter; ignored on other types.
   * `inferred` means no type was named and one was guessed from the wording —
   * the reply says so, rather than letting a wrong guess look deliberate.
   */
  | { kind: "add"; type: SectionType; title: string; goal?: number; inferred?: boolean }
  | { kind: "remove"; id: string }
  | { kind: "clear" }
  | { kind: "rename"; id: string; title: string }
  | { kind: "retype"; id: string; type: SectionType }
  | { kind: "move"; id: string; to: Placement }
  | { kind: "collapse"; id: string; collapsed: boolean }
  | { kind: "resize"; id: string; wide: boolean }
  | { kind: "setNum"; id: string; field: NumField; value: number }
  | { kind: "setUnit"; id: string; unit: string }
  | { kind: "bump"; id: string; by: number }
  | { kind: "addItem"; id: string; text: string; url: string }
  | { kind: "tick"; id: string; itemId: string; done: boolean }
  | { kind: "removeItem"; id: string; itemId: string }
  | { kind: "reset"; id: string }
  | { kind: "undo" }
  | { kind: "help" };

/** What the parser makes of one line of input. */
export type ParsedPrompt =
  | { ok: true; command: BoardCommand }
  | { ok: false; message: string; examples: string[] };

/** What applying a command did, and what to tell the user about it. */
export interface ApplyResult {
  /** The new board, or null when the command changed nothing. */
  sections: BoardSection[] | null;
  message: string;
  /** Section to scroll to and highlight, when the command targeted one. */
  focusId?: string;
  /** True when the change can be taken back — i.e. it altered the board. */
  undoable: boolean;
}

/** One line of the prompt transcript shown under the composer. */
export interface BoardLogEntry {
  id: string;
  /** What the user typed, verbatim. */
  input: string;
  /** What the board did about it. */
  message: string;
  ok: boolean;
  at: number;
}
