import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands";

/**
 * The Assistant's instruction parser.
 *
 * Its hardest job is not understanding instructions — it is *not* mistaking a
 * question for one. "How do I turn on dark mode?" must be answered, not obeyed,
 * and the difference is a couple of regexes that are easy to loosen while making
 * some other phrasing work. The command palette now leans on the same parser for
 * free text, so a regression here is felt in two places.
 */

describe("instructions", () => {
  it("opens an app", () => {
    expect(parseCommand("open the timer")?.action).toMatchObject({ kind: "app", app: "timer" });
    expect(parseCommand("go to todos")?.action).toMatchObject({ kind: "app", app: "todos" });
    expect(parseCommand("take me to the board")?.action).toMatchObject({
      kind: "app",
      app: "board",
    });
  });

  it("opens a PDF section directly", () => {
    expect(parseCommand("open pdf merge")?.action).toMatchObject({
      kind: "app",
      app: "pdf",
      tool: "merge",
    });
    expect(parseCommand("go to watermark")?.action).toMatchObject({ app: "pdf", tool: "wm" });
  });

  it("switches theme", () => {
    expect(parseCommand("turn on dark mode")?.action).toMatchObject({
      kind: "theme",
      themeId: "dark",
    });
    expect(parseCommand("switch to light mode")?.action).toMatchObject({ kind: "theme" });
  });

  it("opens the workspace overlays", () => {
    expect(parseCommand("open settings")?.action).toMatchObject({
      kind: "overlay",
      overlay: "settings",
    });
  });

  it("survives politeness and filler", () => {
    expect(parseCommand("hey, could you please open the timer")?.action).toMatchObject({
      app: "timer",
    });
  });
});

describe("questions", () => {
  it("never treats a question as an instruction", () => {
    for (const question of [
      "how do I change the theme?",
      "what does the timer do",
      "which app scans a QR code",
      "is dark mode available",
      "tell me about the board",
    ]) {
      expect(parseCommand(question)).toBeNull();
    }
  });

  it("returns null for nothing at all", () => {
    expect(parseCommand("")).toBeNull();
    expect(parseCommand("   ")).toBeNull();
  });
});
