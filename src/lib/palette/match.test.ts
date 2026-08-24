import { describe, expect, it } from "vitest";
import { normalize, scoreCommand } from "./match";

/**
 * The palette's ranking. These tests are about *order*, not about whether a row
 * matches at all: the whole value of a palette is that two characters put the
 * right thing first, and a scoring change that quietly reorders results is
 * exactly the kind of regression nobody notices until they mistype their way
 * into the wrong app.
 */
describe("normalize", () => {
  it("folds case, accents and repeated spaces", () => {
    expect(normalize("  Café   Lens ")).toBe("cafe lens");
  });
});

describe("scoreCommand", () => {
  const best = (query: string, rows: Array<[string, string[]]>) =>
    rows
      .map(([title, keywords]) => ({ title, score: scoreCommand(query, title, keywords) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.title);

  it("puts an exact title first", () => {
    expect(best("timer", [["World Clock", ["timer"]], ["Timer", []]])[0]).toBe("Timer");
  });

  it("prefers a title prefix over a mid-word match", () => {
    expect(best("tim", [["Bedtime", []], ["Timer", []]])[0]).toBe("Timer");
  });

  it("matches the start of any word in the title", () => {
    expect(scoreCommand("clock", "World Clock")).toBeGreaterThan(0);
    expect(best("clock", [["Blocked", []], ["World Clock", []]])[0]).toBe("World Clock");
  });

  it("matches initials", () => {
    expect(scoreCommand("wc", "World Clock")).toBeGreaterThan(0);
    expect(scoreCommand("pe", "PDF Editor")).toBeGreaterThan(0);
  });

  it("ranks a keyword hit below the title it competes with", () => {
    // "alarm" is a Reminders keyword; a row *titled* Alarm would have to win.
    const scored = best("alarm", [["Reminders", ["alarm"]], ["Alarm", []]]);
    expect(scored[0]).toBe("Alarm");
    expect(scored).toContain("Reminders");
  });

  it("finds a row only by its keyword when the title can't match", () => {
    expect(scoreCommand("alarm", "Reminders", ["alarm", "alert"])).toBeGreaterThan(0);
    expect(scoreCommand("alarm", "Reminders", [])).toBe(0);
  });

  it("allows a subsequence match, but only for longer queries", () => {
    expect(scoreCommand("wclk", "World Clock")).toBeGreaterThan(0);
    // Two characters must not fuzzy-match half the catalog.
    expect(scoreCommand("wk", "World Clock")).toBe(0);
  });

  it("treats an empty query as an equal match for everything", () => {
    expect(scoreCommand("", "Timer")).toBe(1);
    expect(scoreCommand("   ", "Sketchnotes")).toBe(1);
  });

  it("scores nothing for an unrelated query", () => {
    expect(scoreCommand("zzzz", "Timer", ["countdown"])).toBe(0);
  });
});
