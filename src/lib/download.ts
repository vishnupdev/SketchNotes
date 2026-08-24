/**
 * Getting a file out of the workspace, and — where the browser allows it — back
 * into the same file on disk.
 *
 * Two ways to save, in preference order:
 *
 *  1. **File System Access** (`showSaveFilePicker`) — the user picks the
 *     location once and the app keeps a handle, so "Save" afterwards overwrites
 *     that file in place. This is what makes editing a document feel like an
 *     application rather than a download machine: no `document (3).pdf`, and
 *     the file stays where the user put it.
 *  2. **A download** — the universal fallback (Firefox, Safari, and any
 *     cross-origin frame), where every save is a new file in the downloads
 *     folder.
 *
 * Shell-level and generic (rules #4/#5): the PDF editor saves documents through
 * it, Settings → Data writes backups through it, and neither owns it. The
 * canvas engine keeps its own three-line `saveBlob` in `engine/export/`, which
 * is deliberate — the engine imports nothing from `src/lib` so it stays
 * portable, and that copy has no picker path to share.
 */

/** File kinds a picker can offer, in the shape both pickers expect. */
export interface FileKind {
  description: string;
  /** MIME type → extensions, e.g. `{ "application/pdf": [".pdf"] }`. */
  accept: Record<string, string[]>;
}

export const PDF_KIND: FileKind = {
  description: "PDF document",
  accept: { "application/pdf": [".pdf"] },
};

export const BACKUP_KIND: FileKind = {
  description: "OneApp backup",
  accept: { "application/zip": [".zip"] },
};

/* --------------------------- plain downloads -------------------------- */

/** Trigger a browser download for a blob. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ----------------------- File System Access --------------------------- */

/**
 * Whether this browser can save to a chosen file (and keep writing to it).
 *
 * Also false inside a cross-origin frame, where the picker exists but every
 * call rejects — checking `self === top` keeps the UI from offering a button
 * that cannot work.
 */
export function canPickFiles(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.showSaveFilePicker !== "function") return false;
  try {
    return window.self === window.top;
  } catch {
    return false; // cross-origin frame: the access itself throws
  }
}

/** True for the user simply closing the picker — never surfaced as an error. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Ask for a file to save into. Resolves to `null` when the user cancels or the
 * browser has no picker, so callers can fall back to a download.
 */
export async function pickSaveFile(
  suggestedName: string,
  kind: FileKind,
): Promise<FileSystemFileHandle | null> {
  if (!canPickFiles() || !window.showSaveFilePicker) return null;
  try {
    return await window.showSaveFilePicker({
      suggestedName,
      types: [kind],
      excludeAcceptAllOption: false,
    });
  } catch (error) {
    if (isAbort(error)) return null;
    return null; // a blocked or unsupported picker falls back to a download
  }
}

/** Ask for existing files to open, keeping their handles for later saves. */
export async function pickOpenFiles(
  kind: FileKind,
  multiple = false,
): Promise<FileSystemFileHandle[]> {
  if (typeof window === "undefined" || typeof window.showOpenFilePicker !== "function") return [];
  try {
    return await window.showOpenFilePicker({ types: [kind], multiple });
  } catch {
    return [];
  }
}

/**
 * Confirm the app may still write to a handle it kept.
 *
 * A handle survives a reload (when stored in IndexedDB) but its permission does
 * not, so this re-asks — and must be called from a user gesture, which is why
 * it lives on the save path rather than at load time.
 */
export async function ensureWritable(handle: FileSystemFileHandle): Promise<boolean> {
  const target = handle as FileSystemFileHandle & {
    queryPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  };
  try {
    if ((await target.queryPermission?.({ mode: "readwrite" })) === "granted") return true;
    return (await target.requestPermission?.({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

/** Overwrite a handle's file. Returns false if the write was refused. */
export async function writeFile(handle: FileSystemFileHandle, blob: Blob): Promise<boolean> {
  if (!(await ensureWritable(handle))) return false;
  try {
    const stream = await handle.createWritable();
    await stream.write(blob);
    await stream.close();
    return true;
  } catch {
    return false;
  }
}

export type SaveOutcome =
  | { kind: "written"; handle: FileSystemFileHandle; name: string }
  | { kind: "downloaded"; name: string }
  | { kind: "cancelled" };

/**
 * Save a blob the best way this browser allows.
 *
 * Pass the handle from a previous save as `into` to overwrite that same file
 * with no prompt — that is "Save". Omit it for "Save as", which asks where the
 * file should go and returns the handle to keep.
 */
export async function saveFile(
  blob: Blob,
  name: string,
  kind: FileKind,
  into?: FileSystemFileHandle | null,
): Promise<SaveOutcome> {
  if (into) {
    if (await writeFile(into, blob)) return { kind: "written", handle: into, name: into.name };
    // The file moved, was deleted, or permission was refused — fall through and
    // ask where to put it instead of silently losing the save.
  }
  if (canPickFiles()) {
    const handle = await pickSaveFile(name, kind);
    if (handle) {
      if (await writeFile(handle, blob)) return { kind: "written", handle, name: handle.name };
      return { kind: "cancelled" };
    }
    // No handle: either cancelled or unsupported. Cancelling deliberately does
    // *not* silently download — that would put a file somewhere the user just
    // declined to choose. `canPickFiles()` is true here, so a null handle after
    // a real prompt means cancelled.
    return { kind: "cancelled" };
  }
  saveBlob(blob, name);
  return { kind: "downloaded", name };
}
