import { saveFile, type FileKind, type SaveOutcome } from "@/lib/download";
import { CLONE_ENTRY_NAME } from "./types";
import { CloneError } from "./snapshot";

/**
 * The clone as a file — the route that needs no link at all.
 *
 * Two situations end up here and they are the same operation:
 *
 *  - **By cable, with no network in the cable.** Not every wire can carry one:
 *    a phone that won't tether, a machine with no drivers, a plain charging
 *    cable. But a USB drive or a memory card plugged into each device in turn
 *    absolutely can, and it moves a multi-megabyte clone in seconds.
 *  - **Without a network, and too big for codes.** A device full of sketches is
 *    thousands of QR frames. A file on a card is one gesture.
 *
 * Where the browser has a file picker (Chromium), "save" opens it — so the
 * clone can be written *directly onto the drive* rather than into the downloads
 * folder and dragged afterwards. Everywhere else it is an ordinary download,
 * which still works; it just lands where downloads land.
 *
 * The archive holds the clone document plus a plain-text note explaining what
 * the file is, because a `.zip` on a USB stick is exactly the kind of thing
 * someone finds two years later with no idea what it was.
 */

export const CLONE_KIND: FileKind = {
  description: "OneApp clone",
  accept: { "application/zip": [".zip"] },
};

const README = `This is a OneApp device clone.

It holds everything OneApp had saved in one browser — notes, tasks, reminders,
boards, timers and preferences — as a single JSON document (${CLONE_ENTRY_NAME}),
together with a note of which device it came from and when.

To use it: open OneApp on the other device, go to Clone -> Receive, choose
"From a clone file" and pick this file. You will be shown exactly what it would
change before anything is written.

Nothing here was uploaded anywhere. The file was written by a browser and is
read back by a browser. The JSON inside is plain text and safe to inspect.
`;

/** oneapp-clone-work-laptop-2026-08-24.zip — sortable, and obvious later. */
export function cloneFileName(device: string, at: number = Date.now()): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const slug =
    device
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "device";
  return `oneapp-clone-${slug}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.zip`;
}

/**
 * Package a clone as an archive.
 *
 * JSZip is imported dynamically — this app is code-split already, and a
 * compression library still has no business loading until someone actually
 * chooses the file route (rule #7).
 */
export async function cloneArchive(json: string): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(CLONE_ENTRY_NAME, json);
  zip.file("README.txt", README);
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/** Write the clone wherever the user points — ideally straight onto the drive. */
export async function saveCloneFile(
  json: string,
  device: string,
  at: number = Date.now(),
): Promise<SaveOutcome> {
  return saveFile(await cloneArchive(json), cloneFileName(device, at), CLONE_KIND);
}

/* -------------------------------- reading ------------------------------ */

/** Zip files start with "PK\003\004" — sniffing beats trusting a file name. */
async function isZip(file: Blob): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  } catch {
    return false;
  }
}

/**
 * Pull the clone document out of a chosen file.
 *
 * Deliberately forgiving about what it will open: a clone archive, a bare
 * `.json` clone, or a backup `.zip` written by Settings → Data. All three carry
 * a document {@link readClone} can validate, and refusing two of them because
 * of the wrapper would be arbitrary. Anything else fails by name, here, rather
 * than as a parse error further down.
 */
export async function readCloneFile(file: File | Blob): Promise<string> {
  if (!(await isZip(file))) return file.text();

  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file).catch(() => {
    throw new CloneError("That file couldn't be opened.");
  });
  const entry =
    zip.file(CLONE_ENTRY_NAME) ??
    // A backup archive, or a clone rebuilt with a folder around it.
    zip.filter((path) => path.toLowerCase().endsWith(".json"))[0];
  if (!entry) throw new CloneError("That archive doesn't contain a clone.");
  return entry.async("string");
}

/** Whether this browser can open a file picker for reading a clone. */
export const canOpenFiles = (): boolean =>
  typeof window !== "undefined" && typeof window.showOpenFilePicker === "function";
