import { describe, expect, it } from "vitest";
import { buildDocument } from "@/lib/backup";
import { checksum32 } from "@/lib/pack";
import { CloneError, planClone, readClone } from "./snapshot";
import { CLONE_FORMAT, CLONE_VERSION, type CloneSnapshot } from "./types";
import { CODES_COMFORTABLE_BYTES, frameEstimate, reachFor } from "./routes";
import { cloneFileName } from "./drive";

/**
 * The two pieces of cloning that must not be wrong.
 *
 * **The reader** turns a file, a data channel or a chain of QR codes into
 * something that gets written straight into storage. Every one of those
 * channels can truncate, reorder or corrupt what it carries, so the reader is
 * tested the way untrusted input should be: a wrong format, a future version, a
 * document that doesn't match its own checksum.
 *
 * **The planner** is the screen standing between an arriving clone and the work
 * already on the receiving device. If it says "nothing here will be touched"
 * and it is wrong, someone loses their notes. Each effect is pinned down, in
 * both modes.
 */

const wrap = (
  entries: Record<string, string>,
  overrides: Partial<CloneSnapshot> = {},
): string => {
  const { json: document } = buildDocument(entries);
  const snapshot: CloneSnapshot = {
    format: CLONE_FORMAT,
    version: CLONE_VERSION,
    takenAt: 1_700_000_000_000,
    from: { label: "Work laptop", platform: "Windows" },
    document,
    checksum: checksum32(document),
    ...overrides,
  };
  return JSON.stringify(snapshot);
};

describe("readClone", () => {
  it("reads a clone back with its origin intact", () => {
    const clone = readClone(wrap({ "sknotes:todos": "[]" }));
    expect(clone.from).toEqual({ label: "Work laptop", platform: "Windows" });
    expect(clone.takenAt).toBe(1_700_000_000_000);
    expect(clone.entries).toEqual({ "sknotes:todos": "[]" });
    expect(clone.keys).toBe(1);
  });

  it("refuses a clone whose document doesn't match its checksum", () => {
    // What a dropped link or a mis-scanned frame actually looks like: the
    // envelope is intact and only the payload is short.
    const text = wrap({ "sknotes:todos": "[1,2,3]" });
    const damaged = JSON.parse(text) as CloneSnapshot;
    damaged.document = damaged.document.replace("[1,2,3]", "[1,2");
    expect(() => readClone(JSON.stringify(damaged))).toThrow(CloneError);
    expect(() => readClone(JSON.stringify(damaged))).toThrow(/didn't arrive whole/);
  });

  it("refuses a clone from a newer version of the app", () => {
    expect(() => readClone(wrap({ "sknotes:todos": "[]" }, { version: CLONE_VERSION + 1 }))).toThrow(
      /newer version/,
    );
  });

  it("refuses an envelope with no document", () => {
    expect(() => readClone(wrap({ "sknotes:todos": "[]" }, { document: "" }))).toThrow(
      /empty or damaged/,
    );
  });

  it("accepts a bare backup document, with no origin to report", () => {
    const { json } = buildDocument({ "sknotes:timer": "{}" });
    const clone = readClone(json);
    expect(clone.entries).toEqual({ "sknotes:timer": "{}" });
    expect(clone.from.label).toBe("A backup file");
  });

  it("rejects anything that isn't a clone at all", () => {
    expect(() => readClone("not json")).toThrow(CloneError);
    expect(() => readClone('{"hello":"world"}')).toThrow(CloneError);
  });

  it("tells someone who picked the wrong file that it isn't a clone", () => {
    // A file with no clone envelope is tried as a bare backup, and the backup
    // reader's "that isn't a OneApp backup" would send a person who chose a
    // *clone* file looking in entirely the wrong place.
    expect(() => readClone('{"hello":"world"}')).toThrow(/isn't a clone/);
  });

  it("keeps the reader's own wording when the envelope was real", () => {
    // Here the file genuinely is a clone, so the fault is with its contents —
    // and "empty or damaged" is the useful thing to say.
    const empty = wrap({ "sknotes:todos": "[]" });
    const gutted = JSON.parse(empty) as CloneSnapshot;
    gutted.document = JSON.stringify({ format: "oneapp-backup", version: 1, entries: {} });
    gutted.checksum = checksum32(gutted.document);
    expect(() => readClone(JSON.stringify(gutted))).toThrow(/nothing this workspace can restore/);
  });

  it("carries the backup reader's own refusals through as clone errors", () => {
    // A foreign key is dropped by the document reader, which then finds nothing
    // left to restore — that must surface as one error type, not two.
    expect(() => readClone(wrap({}))).toThrow(CloneError);
  });
});

describe("planClone", () => {
  const arriving = { "sknotes:todos": "[1]", "sknotes:board": "{}" };
  const current = { "sknotes:todos": "[2]", "sknotes:reminders": "[]" };

  it("names what happens to each app, merging", () => {
    const plan = planClone(arriving, current, "merge");
    const effect = (app: string) => plan.rows.find((r) => r.app === app)?.effect;

    expect(effect("todos")).toBe("overwrite"); // on both sides
    expect(effect("board")).toBe("new"); // only in the clone
    expect(effect("reminders")).toBe("keep"); // only here, and merge spares it
    expect(plan.writes).toBe(2);
    expect(plan.removals).toBe(0);
  });

  it("turns what merge would keep into what replace would erase", () => {
    const plan = planClone(arriving, current, "replace");
    expect(plan.rows.find((r) => r.app === "reminders")?.effect).toBe("erase");
    expect(plan.removals).toBe(1);
  });

  it("puts the destructive rows first, since those are the ones to read", () => {
    const plan = planClone(arriving, current, "replace");
    expect(plan.rows[0].effect).toBe("erase");
  });

  it("never counts another site's keys as something at risk", () => {
    const plan = planClone(arriving, { ...current, "other-site:token": "x" }, "replace");
    expect(plan.rows.some((r) => r.app === null && r.effect === "erase")).toBe(false);
    expect(plan.removals).toBe(1);
  });

  it("separates workspace settings from app data", () => {
    const plan = planClone({ "sknotes:theme": "dark" }, {}, "merge");
    expect(plan.rows).toEqual([
      { app: null, effect: "new", arriving: 1, existing: 0, bytes: expect.any(Number) },
    ]);
  });

  it("reports an empty plan for an empty clone rather than throwing", () => {
    const plan = planClone({}, current, "merge");
    expect(plan.writes).toBe(0);
    expect(plan.rows.every((r) => r.effect === "keep")).toBe(true);
  });
});

describe("routes", () => {
  it("keeps a cable link local even when the wide option is set", () => {
    // The whole promise of the cable route is that nothing else is contacted.
    expect(reachFor("cable", true)).toBe("local");
    expect(reachFor("offline", true)).toBe("local");
    expect(reachFor("network", false)).toBe("local");
    expect(reachFor("network", true)).toBe("internet");
  });

  it("estimates enough frames for a clone to be talked out of the codes route", () => {
    expect(frameEstimate(CODES_COMFORTABLE_BYTES)).toBeGreaterThan(1);
    expect(frameEstimate(5_000_000)).toBeGreaterThan(1000);
  });
});

describe("cloneFileName", () => {
  it("names the file after the device and the day", () => {
    expect(cloneFileName("Work laptop", Date.UTC(2026, 7, 24, 12))).toMatch(
      /^oneapp-clone-work-laptop-2026-08-24\.zip$/,
    );
  });

  it("survives a device name with nothing usable in it", () => {
    expect(cloneFileName("!!!")).toMatch(/^oneapp-clone-device-/);
  });
});
