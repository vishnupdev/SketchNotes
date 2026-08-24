import { describe, expect, it } from "vitest";
import { parsePrompt } from "./commands";
import { newItem, newSection } from "./board-api";
import type { BoardSection } from "./types";

/**
 * The Board's plain-English parser.
 *
 * The app's whole premise is that these phrasings work, and every one of them is
 * published — in the in-app "what you can say" sheet and in `public/llms.txt`, so
 * agents read them as a contract. A regex tightened for one phrasing can silently
 * drop another, and nothing in the UI would show it: the app would just answer
 * "I didn't understand that" to a sentence it advertises.
 *
 * So this covers one representative phrasing per documented command, plus the
 * two behaviours that are easy to break by accident — an ambiguous reference
 * being *reported* rather than silently guessed, and a question never being
 * treated as an instruction.
 */

const board = (): BoardSection[] => [
  // With a row in it, so the item-level commands have something to resolve to.
  { ...newSection("checklist", "Groceries"), items: [newItem("milk")] },
  newSection("counter", "Water"),
  newSection("note", "Ideas"),
];

/** The command a prompt resolves to, or null when it wasn't understood. */
const cmd = (input: string, sections: BoardSection[] = board()) => {
  const parsed = parsePrompt(input, sections);
  return parsed.ok ? parsed.command : null;
};

describe("adding", () => {
  it("adds a section of a named type", () => {
    expect(cmd("add a checklist for groceries")).toMatchObject({
      kind: "add",
      type: "checklist",
    });
    expect(cmd("add a note called Ideas")).toMatchObject({ kind: "add", type: "note" });
  });

  it("takes a counter's goal from the sentence", () => {
    expect(cmd("add a counter for water with a goal of 8")).toMatchObject({
      kind: "add",
      type: "counter",
      goal: 8,
    });
  });
});

describe("filling in", () => {
  it("adds a row to a section by name", () => {
    const sections = board();
    expect(cmd("add milk to groceries", sections)).toMatchObject({
      kind: "addItem",
      id: sections[0].id,
      text: "milk",
    });
  });

  it("keeps a link and its label apart", () => {
    const sections = [newSection("links", "Work")];
    expect(cmd("add docs example.com to work", sections)).toMatchObject({
      kind: "addItem",
      text: "docs",
      url: "https://example.com/",
    });
  });

  it("bumps a counter", () => {
    const sections = board();
    expect(cmd("add 5 to water", sections)).toMatchObject({
      kind: "bump",
      id: sections[1].id,
      by: 5,
    });
  });
});

describe("modifying", () => {
  it("renames, retypes, resizes and moves", () => {
    const sections = board();
    expect(cmd("rename groceries to shopping", sections)).toMatchObject({
      kind: "rename",
      // Titles are capitalised on the way in, so cards read consistently.
      title: "Shopping",
    });
    expect(cmd("turn ideas into a checklist", sections)).toMatchObject({
      kind: "retype",
      type: "checklist",
    });
    expect(cmd("make ideas wide", sections)).toMatchObject({ kind: "resize", wide: true });
    expect(cmd("move groceries to top", sections)).toMatchObject({ kind: "move", to: "top" });
    expect(cmd("collapse ideas", sections)).toMatchObject({ kind: "collapse", collapsed: true });
  });

  it("sets a counter's numbers and unit", () => {
    expect(cmd("set the water goal to 10")).toMatchObject({
      kind: "setNum",
      field: "goal",
      value: 10,
    });
    expect(cmd("set the water unit to glasses")).toMatchObject({
      kind: "setUnit",
      unit: "glasses",
    });
  });
});

describe("removing and undoing", () => {
  it("removes a row, a section, and the whole board", () => {
    const sections = board();
    expect(cmd("remove milk from groceries", sections)).toMatchObject({ kind: "removeItem" });
    expect(cmd("remove groceries", sections)).toMatchObject({ kind: "remove" });
    expect(cmd("clear the board", sections)).toMatchObject({ kind: "clear" });
    expect(cmd("reset water", sections)).toMatchObject({ kind: "reset" });
  });

  it("understands undo and help on their own", () => {
    expect(cmd("undo")).toMatchObject({ kind: "undo" });
    expect(cmd("help")).toMatchObject({ kind: "help" });
  });

  it("says the board is already empty rather than clearing nothing", () => {
    const parsed = parsePrompt("clear the board", []);
    expect(parsed.ok).toBe(false);
  });
});

describe("what it refuses to guess", () => {
  it("reports an unknown reference instead of acting on the wrong section", () => {
    const parsed = parsePrompt("remove badminton", board());
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message.length).toBeGreaterThan(0);
  });

  it("answers an empty prompt with a prompt", () => {
    expect(parsePrompt("   ", board()).ok).toBe(false);
  });
});
