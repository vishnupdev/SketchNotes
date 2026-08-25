import type { AppId } from "@/store/useWorkspaceStore";
import type { BackupRow, RestoreMode } from "@/lib/backup/types";

/**
 * The clone document, and the vocabulary the app is built out of.
 *
 * A *clone* is the whole of one device's workspace — every app's data plus the
 * workspace's own preferences — packaged so a second device can be made to look
 * like the first. That is a different job from a backup (one device, across
 * time) or from Handoff (a chosen app or two, by camera), and it needs two
 * things neither of those do: it must say **where it came from**, and it must be
 * verifiable as a whole before a single key is written.
 *
 * So a clone is a thin envelope around the backup document rather than a new
 * format. `document` is the exact JSON `lib/backup/` writes to a file, carried
 * verbatim as text: the same reader validates it, the same "merge or replace"
 * decides how it lands, and any app that changes how it stores its data keeps
 * cloning correctly for free. The envelope adds only what a *transfer* needs —
 * the origin, the moment, and a checksum over those exact bytes so a clone that
 * arrived down a cable, over a network or through a chain of QR codes is proven
 * intact before it touches storage.
 */

export const CLONE_FORMAT = "oneapp-clone";
export const CLONE_VERSION = 1;

/** Name of the JSON document inside a clone archive. */
export const CLONE_ENTRY_NAME = "clone.json";

/**
 * How the two devices are joined — the user's own situation, not a protocol.
 *
 * The distinction is the whole point of the app: what you have to hand decides
 * what is possible, and the wrong answer here is the difference between a
 * transfer that takes six seconds and one that cannot happen at all.
 */
export type CloneRoute =
  /** A wire between the two devices, or a drive carried between them. */
  | "cable"
  /** Same Wi-Fi, or two networks anywhere in the world. */
  | "network"
  /** No wire, no Wi-Fi, no internet — a screen and a camera. */
  | "offline";

/** How the bytes actually move, once a route has been chosen. */
export type CloneTransport =
  /** A direct data channel — over the cable link, or over the network. */
  | "link"
  /** A file written to a drive, a folder, or the downloads folder. */
  | "drive"
  /** A chain of QR codes, screen to camera. */
  | "codes";

/** Where a clone was taken from, for the line the receiving device shows. */
export interface CloneOrigin {
  /** What the user calls that device — "Work laptop", "Pixel". */
  label: string;
  /** Best guess at the platform, so an unnamed clone still says something. */
  platform: string;
}

export interface CloneSnapshot {
  format: typeof CLONE_FORMAT;
  /** Bumped only for a change an older reader could not survive. */
  version: number;
  /** When the clone was taken (epoch ms). */
  takenAt: number;
  from: CloneOrigin;
  /** The backup document, verbatim. See `lib/backup/types.ts`. */
  document: string;
  /** FNV-1a over `document` — proves the transfer, not the sender. */
  checksum: string;
}

/** A clone that has been read and validated, ready to be planned. */
export interface ReadClone {
  from: CloneOrigin;
  takenAt: number;
  entries: Record<string, string>;
  /** Per-app breakdown of what the clone carries. */
  rows: BackupRow[];
  keys: number;
  bytes: number;
  /** Keys under a prefix this workspace doesn't own — never written. */
  skipped: number;
}

/* --------------------------------- plan -------------------------------- */

/**
 * What applying a clone would do to one app's data on *this* device.
 *
 * Cloning is the one operation in the workspace that can silently destroy work:
 * the receiving device already has notes and tasks of its own, and "replace"
 * means exactly what it says. So the decision is made against this — a row per
 * app, in the user's own terms — rather than against a byte count.
 */
export type PlanEffect =
  /** This device has nothing for that app; the clone brings it. */
  | "new"
  /** Both have it; the clone's copy wins. */
  | "overwrite"
  /** Only this device has it, and merge leaves it alone. */
  | "keep"
  /** Only this device has it, and replace deletes it. */
  | "erase";

export interface PlanRow {
  /** The app the keys belong to, or null for workspace preferences. */
  app: AppId | null;
  effect: PlanEffect;
  /** Keys arriving in the clone for this app. */
  arriving: number;
  /** Keys already on this device for this app. */
  existing: number;
  /** Bytes the clone carries for this app. */
  bytes: number;
}

export interface ClonePlan {
  mode: RestoreMode;
  rows: PlanRow[];
  /** Keys that will be written. */
  writes: number;
  /** Keys that will be deleted (replace only). */
  removals: number;
  bytes: number;
}

/* -------------------------------- progress ------------------------------ */

/** Where a clone has got to, on either side. */
export type CloneStage =
  | "idle"
  /** Building the snapshot, or waiting for the other device to be introduced. */
  | "preparing"
  | "pairing"
  | "connecting"
  /** Bytes are moving. */
  | "moving"
  /** Arrived and verified; waiting for the user to choose how it lands. */
  | "arrived"
  /** Written into this browser. */
  | "applied"
  | "failed";

export interface CloneProgress {
  /** Bytes across so far. */
  moved: number;
  /** Total to move; 0 while unknown. */
  total: number;
  /** Bytes per second, averaged over the last few seconds. */
  rate: number;
}

/** What the sending device is told once the clone has landed. */
export interface CloneReceipt {
  written: number;
  removed: number;
  mode: RestoreMode;
  /** The receiving device's own name, so the sender's log names it. */
  device: string;
}

export type { RestoreMode };
