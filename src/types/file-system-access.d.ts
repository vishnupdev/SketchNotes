/**
 * File System Access pickers.
 *
 * `FileSystemFileHandle` and its writable stream are in TypeScript's DOM
 * library, but the two `window` entry points that hand one out are not — they
 * are Chromium-only (plus Edge/Opera), which is exactly why `lib/download.ts`
 * feature-detects them and falls back to a download. These declarations only
 * describe the two functions; every capability check stays in that module.
 *
 * Kept intentionally narrow: only the options the workspace actually passes.
 */

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  /** Well-known directory, or a handle to start in. */
  startIn?: FileSystemHandle | string;
  /** Groups pickers so the same starting directory is remembered per purpose. */
  id?: string;
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
  startIn?: FileSystemHandle | string;
  id?: string;
}

interface DirectoryPickerOptions {
  /** "read" (default) or "readwrite" — File Drop needs to write. */
  mode?: "read" | "readwrite";
  startIn?: FileSystemHandle | string;
  id?: string;
}

interface Window {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
  /** Picking a folder once is what lets a received file stream to disk. */
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
}
