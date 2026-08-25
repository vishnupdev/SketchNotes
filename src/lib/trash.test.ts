import { beforeEach, describe, expect, it } from "vitest";
import { sGet, sSet } from "./storage";
import {
  emptyTrash,
  itemPart,
  keyPart,
  listTrash,
  moveToTrash,
  purgeFromTrash,
  restoreFromTrash,
  TRASH_DAYS,
} from "./trash";

/**
 * The trash.
 *
 * Worth testing carefully for one reason: it is the code that runs *after*
 * someone has already lost something. If restore is subtly wrong — puts a task
 * back twice, overwrites a collection that has moved on since, or quietly drops
 * the entry — the user finds out at the worst possible moment.
 *
 * Under Node the storage layer falls back to its in-memory map, so the whole
 * round trip (write, list, restore, verify what landed in storage) runs here
 * without a browser.
 */

const TRASH_KEY = "sknotes:trash";
const COLLECTION = "sknotes:todos";

const read = async (key: string): Promise<unknown> => {
  const raw = await sGet(key);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(async () => {
  await sSet(TRASH_KEY, "[]");
  await sSet(COLLECTION, "[]");
});

describe("moveToTrash", () => {
  it("keeps what was deleted, newest first", async () => {
    await moveToTrash({ app: "todos", label: "Milk", parts: [itemPart(COLLECTION, { id: "1" })] });
    await moveToTrash({ app: "todos", label: "Bread", parts: [itemPart(COLLECTION, { id: "2" })] });

    const entries = await listTrash();
    expect(entries.map((e) => e.label)).toEqual(["Bread", "Milk"]);
    expect(entries[0].app).toBe("todos");
    expect(entries[0].bytes).toBeGreaterThan(0);
  });

  it("refuses something too large to keep, and says so", async () => {
    const huge = { id: "big", blob: "x".repeat(5 * 1024 * 1024) };
    const result = await moveToTrash({
      app: "sketchnotes",
      label: "Huge sketch",
      parts: [keyPart("sknotes:huge", JSON.stringify(huge))],
    });
    // The caller can then tell the user this one is gone for good, rather than
    // implying a safety net that isn't there.
    expect(result.trashed).toBe(false);
    expect(result.reason).toMatch(/too large/i);
    expect(await listTrash()).toHaveLength(0);
  });

  it("never leaves an entry without a label", async () => {
    await moveToTrash({ app: "todos", label: "   ", parts: [itemPart(COLLECTION, { id: "3" })] });
    expect((await listTrash())[0].label).toBe("Untitled");
  });
});

describe("restoreFromTrash", () => {
  it("puts an array member back into its collection", async () => {
    await sSet(COLLECTION, JSON.stringify([{ id: "keep", title: "Kept" }]));
    const task = { id: "gone", title: "Deleted task" };
    await moveToTrash({ app: "todos", label: task.title, parts: [itemPart(COLLECTION, task)] });

    const [entry] = await listTrash();
    expect(await restoreFromTrash(entry.id)).toBe(true);

    const rows = (await read(COLLECTION)) as Array<{ id: string }>;
    expect(rows.map((r) => r.id).sort()).toEqual(["gone", "keep"]);
    // A restored entry leaves the trash, so it cannot be restored twice.
    expect(await listTrash()).toHaveLength(0);
  });

  it("does not duplicate a member that is already back", async () => {
    const task = { id: "dup", title: "Already there" };
    await moveToTrash({ app: "todos", label: task.title, parts: [itemPart(COLLECTION, task)] });
    // Something else re-created it in the meantime.
    await sSet(COLLECTION, JSON.stringify([task]));

    const [entry] = await listTrash();
    await restoreFromTrash(entry.id);
    expect((await read(COLLECTION)) as unknown[]).toHaveLength(1);
  });

  it("keeps the rest of a collection that changed since the delete", async () => {
    await moveToTrash({ app: "todos", label: "Old", parts: [itemPart(COLLECTION, { id: "old" })] });
    // Two tasks added after the delete must survive the restore.
    await sSet(COLLECTION, JSON.stringify([{ id: "new1" }, { id: "new2" }]));

    const [entry] = await listTrash();
    await restoreFromTrash(entry.id);
    const rows = (await read(COLLECTION)) as Array<{ id: string }>;
    expect(rows.map((r) => r.id).sort()).toEqual(["new1", "new2", "old"]);
  });

  it("writes a whole key back, and both parts of a note", async () => {
    const doc = { title: "Sketch", els: [] };
    const meta = { id: "n1", title: "Sketch", updatedAt: 1 };
    await sSet("sknotes:index", JSON.stringify([]));
    await moveToTrash({
      app: "sketchnotes",
      label: doc.title,
      parts: [keyPart("sknotes:n1", JSON.stringify(doc)), itemPart("sknotes:index", meta)],
    });

    const [entry] = await listTrash();
    await restoreFromTrash(entry.id);
    expect(await read("sknotes:n1")).toEqual(doc);
    expect(await read("sknotes:index")).toEqual([meta]);
  });

  it("reports failure for an id that isn't there", async () => {
    expect(await restoreFromTrash("nope")).toBe(false);
  });
});

describe("expiry and clearing", () => {
  it("drops anything past the retention window when the list is read", async () => {
    const old = Date.now() - (TRASH_DAYS + 1) * 24 * 60 * 60 * 1000;
    await sSet(
      TRASH_KEY,
      JSON.stringify([
        { id: "stale", app: "todos", label: "Ancient", bytes: 10, deletedAt: old, parts: [] },
        { id: "fresh", app: "todos", label: "Recent", bytes: 10, deletedAt: Date.now(), parts: [] },
      ]),
    );
    const entries = await listTrash();
    expect(entries.map((e) => e.label)).toEqual(["Recent"]);
  });

  it("ignores malformed stored rows instead of failing", async () => {
    await sSet(TRASH_KEY, JSON.stringify([{ nope: true }, "string", null]));
    expect(await listTrash()).toEqual([]);
  });

  it("purges one and empties all", async () => {
    await moveToTrash({ app: "todos", label: "A", parts: [itemPart(COLLECTION, { id: "a" })] });
    await moveToTrash({ app: "todos", label: "B", parts: [itemPart(COLLECTION, { id: "b" })] });

    const [first] = await listTrash();
    await purgeFromTrash(first.id);
    expect((await listTrash()).map((e) => e.label)).toEqual(["A"]);

    expect(await emptyTrash()).toBe(1);
    expect(await listTrash()).toEqual([]);
  });
});
