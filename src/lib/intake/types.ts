import type { AppId } from "@/store/useWorkspaceStore";

/**
 * Files and text arriving from *outside* the workspace — an installed OneApp
 * being asked to open a file by the operating system, or something shared into
 * it from another app's share sheet.
 *
 * Two entry points, one destination:
 *
 *  - **File handlers** (`launchQueue`): double-clicking a PDF on the desktop, or
 *    picking OneApp from "Open with".
 *  - **Share target**: Android's share sheet posting to `/share-target`, which
 *    the service worker catches so nothing is ever uploaded.
 *
 * Both are turned into {@link IntakeItem}s and left in `useIntakeStore` for the
 * app that can actually deal with them. That indirection is the point: the shell
 * decides *where* something goes, each app decides *what* to do with it, and no
 * app has to know anything about the operating system.
 */

/** What arrived, in terms of the app that can open it. */
export type IntakeKind = "pdf" | "image" | "backup" | "note" | "text";

export interface IntakeItem {
  id: string;
  kind: IntakeKind;
  /** The file itself, for every kind but "text". */
  file?: File;
  /**
   * The handle the file arrived on, when the platform gave one (a launch, never
   * a share). An app that keeps it can save back to the file the user actually
   * opened — see `lib/download.ts`.
   */
  handle?: FileSystemFileHandle;
  /** Shared text and link, for kind "text". */
  text?: string;
  url?: string;
  title?: string;
  /** Where it came from, for the message shown while it opens. */
  via: "file-handler" | "share";
}

/** Where each kind of arrival is taken. `settings` opens Settings → Data. */
export type IntakeTarget = { app: AppId; tool?: string } | { settings: true };

export const INTAKE_TARGETS: Record<IntakeKind, IntakeTarget> = {
  // "Edit & annotate" is the section that simply *opens* a document, so an
  // externally-opened PDF lands somewhere it can be read and marked up rather
  // than in a converter.
  pdf: { app: "pdf", tool: "edit" },
  image: { app: "image" },
  note: { app: "sketchnotes" },
  text: { app: "board" },
  backup: { settings: true },
};

export const KIND_LABEL: Record<IntakeKind, string> = {
  pdf: "PDF",
  image: "image",
  backup: "OneApp backup",
  note: "sketch note",
  text: "shared text",
};
