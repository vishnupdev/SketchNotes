import { describe, expect, it } from "vitest";
import { classifyKey, keyOwner, pairBytes } from "./storage-keys";

/**
 * Key attribution.
 *
 * This table is read by two features that both act on its answers: the Resource
 * Monitor reports per-app storage from it, and backup/restore decides from it
 * what belongs in a backup and what may be written back. The rule that matters
 * most is the last one — Sketchnotes claims every remaining `sknotes:` key — and
 * the risk is an exact key added *below* it, which would then be attributed to
 * Sketchnotes and reported to the user as someone else's data.
 */
describe("keyOwner", () => {
  it("attributes each app's own keys", () => {
    expect(keyOwner("sknotes:todos")).toBe("todos");
    expect(keyOwner("sknotes:reminders")).toBe("reminders");
    expect(keyOwner("sknotes:board")).toBe("board");
    expect(keyOwner("sknotes:timer")).toBe("timer");
    expect(keyOwner("sknotes:morse")).toBe("morse");
    expect(keyOwner("sknotes:assistant")).toBe("assistant");
    expect(keyOwner("sknotes:translate-prefs")).toBe("translate");
    expect(keyOwner("sknotes:colorlens-picks")).toBe("color");
  });

  it("attributes prefixed key families", () => {
    expect(keyOwner("sknotes:sound:reference")).toBe("sound");
    expect(keyOwner("sknotes:worldclock:pinned")).toBe("world");
    expect(keyOwner("sknotes:netspeed:history")).toBe("speed");
    expect(keyOwner("sknotes:malayalam-doc")).toBe("malayalam");
    expect(keyOwner("sknotes:qr:history")).toBe("qr");
  });

  it("gives everything else under the prefix to Sketchnotes", () => {
    // A note is keyed by its bare id, so this catch-all is load-bearing.
    expect(keyOwner("sknotes:index")).toBe("sketchnotes");
    expect(keyOwner("sknotes:m1a2b3c4")).toBe("sketchnotes");
  });

  it("claims nothing outside the workspace's prefix", () => {
    expect(keyOwner("some-extension:token")).toBeNull();
    expect(keyOwner("")).toBeNull();
  });
});

describe("classifyKey", () => {
  it("separates workspace preferences from app data", () => {
    for (const key of [
      "sknotes:theme",
      "sknotes:custom-themes",
      "sknotes:ui-style",
      "sknotes:density",
      "sknotes:app-order",
      "sknotes:cursor",
      "sknotes:ui-sound",
    ]) {
      expect(classifyKey(key)).toEqual({ kind: "settings" });
    }
    expect(classifyKey("sknotes:todos")).toEqual({ kind: "app", app: "todos" });
  });

  it("marks another site's keys as foreign, so they are never backed up", () => {
    expect(classifyKey("ext:whatever")).toEqual({ kind: "foreign" });
  });
});

describe("pairBytes", () => {
  it("counts a stored pair as UTF-16", () => {
    expect(pairBytes("ab", "cd")).toBe(8);
    expect(pairBytes("", "")).toBe(0);
  });
});
