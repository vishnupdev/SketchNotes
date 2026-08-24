import { BACKUP_FORMAT } from "@/lib/backup/types";
import type { IntakeKind } from "./types";

/**
 * Work out which app should open an incoming file.
 *
 * MIME types are the first signal but not a trustworthy one — a file arriving
 * from a share sheet or a download folder is regularly typed
 * `application/octet-stream` — so the extension is checked too, and the two
 * ambiguous containers are opened and sniffed:
 *
 *  - `.json` is both a sketch note and (unzipped) a backup, so the first part of
 *    the text decides.
 *  - `.zip` is only ever a backup here, but the zip magic number is checked so a
 *    renamed file is rejected rather than half-restored.
 *
 * Returns null for anything no app can open, which the shell reports instead of
 * silently swallowing the file.
 */
export async function classifyFile(file: File): Promise<IntakeKind | null> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/.test(name)) {
    return "image";
  }
  if (type === "application/zip" || type === "application/x-zip-compressed" || name.endsWith(".zip")) {
    return (await isZip(file)) ? "backup" : null;
  }
  if (type === "application/json" || name.endsWith(".json")) {
    return (await looksLikeBackup(file)) ? "backup" : "note";
  }
  return null;
}

/** Zip files start with "PK\003\004". */
async function isZip(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  } catch {
    return false;
  }
}

/**
 * Does this JSON declare itself a backup? Only the first kilobyte is read: the
 * format marker is written at the top of the document, and a backup can be tens
 * of megabytes that there is no reason to decode twice.
 */
async function looksLikeBackup(file: File): Promise<boolean> {
  try {
    const head = await file.slice(0, 1024).text();
    return head.includes(BACKUP_FORMAT);
  } catch {
    return false;
  }
}
