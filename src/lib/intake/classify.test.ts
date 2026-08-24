import { describe, expect, it } from "vitest";
import { classifyFile } from "./classify";
import { BACKUP_FORMAT } from "@/lib/backup/types";

/**
 * Routing an incoming file to an app.
 *
 * Worth testing because the inputs are the untrustworthy ones: a file arriving
 * from a share sheet or a downloads folder regularly carries the wrong MIME type
 * or none at all, and `.json` is genuinely ambiguous here — it is both a sketch
 * note and a backup, and sending a backup to the canvas (or a note to the
 * restore dialog) would look like the app had lost the file.
 */

const file = (name: string, type: string, body = "x") => new File([body], name, { type });

const zip = (name = "backup.zip") =>
  // "PK\003\004" — the magic number the classifier sniffs for.
  new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])], name, { type: "application/zip" });

describe("classifyFile", () => {
  it("recognises a PDF by type or by extension", async () => {
    expect(await classifyFile(file("a.pdf", "application/pdf"))).toBe("pdf");
    expect(await classifyFile(file("a.pdf", ""))).toBe("pdf");
    expect(await classifyFile(file("report.PDF", "application/octet-stream"))).toBe("pdf");
  });

  it("recognises images", async () => {
    expect(await classifyFile(file("a.png", "image/png"))).toBe("image");
    expect(await classifyFile(file("photo.JPEG", ""))).toBe("image");
    expect(await classifyFile(file("scan.webp", "application/octet-stream"))).toBe("image");
  });

  it("tells a backup from a sketch note inside a .json", async () => {
    const backup = file(
      "b.json",
      "application/json",
      JSON.stringify({ format: BACKUP_FORMAT, entries: {} }),
    );
    const note = file("note.json", "application/json", JSON.stringify({ title: "x", els: [] }));
    expect(await classifyFile(backup)).toBe("backup");
    expect(await classifyFile(note)).toBe("note");
  });

  it("accepts a zip only if it really is one", async () => {
    expect(await classifyFile(zip())).toBe("backup");
    // Named .zip but not zip bytes — refused rather than half-restored.
    expect(await classifyFile(file("fake.zip", "application/zip", "not a zip"))).toBeNull();
  });

  it("returns null for anything no app here can open", async () => {
    expect(await classifyFile(file("a.docx", "application/vnd.openxmlformats"))).toBeNull();
    expect(await classifyFile(file("a.exe", "application/octet-stream"))).toBeNull();
  });
});
