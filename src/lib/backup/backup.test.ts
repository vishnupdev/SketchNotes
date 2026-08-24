import { describe, expect, it } from "vitest";
import { buildDocument, readBackupJson, BackupError } from "./index";
import { BACKUP_FORMAT } from "./types";

/**
 * The backup document and its reader.
 *
 * The reader is the one place in the workspace where a file chosen by the user
 * turns into what the apps read on start-up, so it is tested the way untrusted
 * input should be: a wrong format, a newer version, a key belonging to some other
 * site, a value of the wrong type. Getting any of those wrong means either
 * refusing a legitimate backup (the user's only copy) or writing rubbish into
 * storage — both bad enough to be worth a test each.
 */

const doc = (entries: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: BACKUP_FORMAT,
    version: 1,
    createdAt: 1_700_000_000_000,
    source: { name: "OneApp", url: "https://example.com" },
    entries,
    ...extra,
  });

describe("buildDocument", () => {
  it("wraps stored pairs in a readable document", () => {
    const { json, summary } = buildDocument({ "sknotes:todos": "[]" });
    expect(readBackupJson(json).entries).toEqual({ "sknotes:todos": "[]" });
    expect(summary.keys).toBe(1);
    expect(summary.rows).toEqual([{ app: "todos", keys: 1, bytes: expect.any(Number) }]);
  });

  it("leaves out keys this workspace doesn't own", () => {
    const { json, summary } = buildDocument({
      "sknotes:todos": "[]",
      "other-site:token": "secret",
    });
    expect(readBackupJson(json).entries).toEqual({ "sknotes:todos": "[]" });
    expect(summary.skipped).toBe(1);
  });

  it("groups settings apart from app data", () => {
    const { summary } = buildDocument({ "sknotes:theme": "dark", "sknotes:todos": "[]" });
    const apps = summary.rows.map((r) => r.app);
    expect(apps).toContain(null); // the settings row
    expect(apps).toContain("todos");
  });
});

describe("readBackupJson", () => {
  it("accepts a well-formed document", () => {
    const { entries, summary } = readBackupJson(doc({ "sknotes:board": "[]" }));
    expect(entries).toEqual({ "sknotes:board": "[]" });
    expect(summary.createdAt).toBe(1_700_000_000_000);
    expect(summary.source.name).toBe("OneApp");
  });

  it("drops foreign keys and non-string values rather than failing", () => {
    const { entries, summary } = readBackupJson(
      doc({ "sknotes:todos": "[]", "evil:key": "x", "sknotes:bad": 42 }),
    );
    expect(entries).toEqual({ "sknotes:todos": "[]" });
    expect(summary.skipped).toBe(2);
  });

  it("refuses a file that isn't a backup", () => {
    expect(() => readBackupJson("not json at all")).toThrow(BackupError);
    expect(() => readBackupJson(JSON.stringify({ hello: "world" }))).toThrow(BackupError);
    expect(() => readBackupJson(JSON.stringify([1, 2, 3]))).toThrow(BackupError);
  });

  it("refuses a backup from a newer version of the app", () => {
    expect(() => readBackupJson(doc({ "sknotes:todos": "[]" }, { version: 99 }))).toThrow(
      /newer version/i,
    );
  });

  it("refuses a document with nothing restorable in it", () => {
    expect(() => readBackupJson(doc({}))).toThrow(BackupError);
    expect(() => readBackupJson(doc({ "elsewhere:x": "y" }))).toThrow(BackupError);
  });

  it("tolerates a missing date and source", () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      entries: { "sknotes:todos": "[]" },
    });
    const { summary } = readBackupJson(json);
    expect(summary.createdAt).toBe(0);
    expect(summary.source.name).toBeTruthy();
  });
});
