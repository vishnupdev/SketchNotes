import { sEntries, sGet, sSet } from "@/lib/storage";
import { classifyKey } from "@/lib/storage-keys";
import { checksum32 } from "@/lib/pack";
import { applyBackup, buildDocument, readBackupJson, BackupError } from "@/lib/backup";
import type { AppId } from "@/store/useWorkspaceStore";
import {
  CLONE_FORMAT,
  CLONE_VERSION,
  type ClonePlan,
  type CloneOrigin,
  type CloneSnapshot,
  type PlanEffect,
  type PlanRow,
  type ReadClone,
  type RestoreMode,
} from "./types";

/**
 * Taking a clone of this device, reading one that arrived, and working out
 * exactly what applying it would change.
 *
 * Everything here is pure apart from three storage calls, which is deliberate:
 * the part that decides whether a person's notes survive is the planner, and it
 * must be testable without a browser, a camera or a second device.
 */

/** Where the device's own name is kept, so a clone always says where it's from. */
export const DEVICE_KEY = "sknotes:clone:device";

/* ------------------------------ this device ---------------------------- */

interface UAData {
  platform?: string;
  mobile?: boolean;
}

/**
 * A first guess at what to call this device.
 *
 * Browsers give no device name — that is a privacy decision, and the right one
 * — so this is a description rather than an identity: "Windows laptop",
 * "Android phone". It is only ever a *default*; the user can name the device
 * anything, and what they type is what travels.
 */
export function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  const agent = navigator.userAgent || "";

  const platform =
    ua?.platform ||
    (/Windows/i.test(agent)
      ? "Windows"
      : /Android/i.test(agent)
        ? "Android"
        : /iPhone|iPad|iPod/i.test(agent)
          ? "iOS"
          : /Mac OS X/i.test(agent)
            ? "macOS"
            : /Linux/i.test(agent)
              ? "Linux"
              : "");

  const mobile = ua?.mobile ?? /Mobi|Android|iPhone|iPad/i.test(agent);
  const kind = /iPad|Tablet/i.test(agent) ? "tablet" : mobile ? "phone" : "laptop";
  return platform ? `${platform} ${kind}` : "This device";
}

/** The name this device travels under. Falls back to the guess, never empty. */
export async function readDeviceName(): Promise<string> {
  const saved = (await sGet(DEVICE_KEY))?.trim();
  return saved || guessDeviceLabel();
}

/** Remember what the user calls this device. */
export async function writeDeviceName(name: string): Promise<void> {
  await sSet(DEVICE_KEY, name.trim().slice(0, 60));
}

/* -------------------------------- taking ------------------------------- */

export interface TakenClone {
  snapshot: CloneSnapshot;
  /** The envelope as text — what every transport actually carries. */
  json: string;
  /** What it holds, for the summary shown before it is sent. */
  contents: Omit<ReadClone, "from" | "takenAt" | "entries">;
}

/**
 * Package everything this browser holds as a clone.
 *
 * Nothing is filtered here beyond what {@link buildDocument} already drops
 * (keys under a prefix the workspace doesn't own): a clone is the *whole*
 * device by definition, and an app-by-app choice is what Handoff is for.
 */
export async function takeClone(from: CloneOrigin, at: number = Date.now()): Promise<TakenClone> {
  const { json: document, summary } = buildDocument(await sEntries());
  const snapshot: CloneSnapshot = {
    format: CLONE_FORMAT,
    version: CLONE_VERSION,
    takenAt: at,
    from,
    document,
    checksum: checksum32(document),
  };
  return {
    snapshot,
    json: JSON.stringify(snapshot),
    contents: {
      rows: summary.rows,
      keys: summary.keys,
      bytes: summary.bytes,
      skipped: summary.skipped,
    },
  };
}

/* -------------------------------- reading ------------------------------ */

export class CloneError extends Error {}

/**
 * Validate a clone that arrived, whatever carried it.
 *
 * Generous on the way in: a bare backup document is accepted too, so a file
 * written by Settings → Data can be cloned onto a device without being
 * repackaged first. It simply has no origin to report.
 *
 * Strict on what it proves: the checksum is checked against the document bytes
 * *before* they are parsed, because a clone assembled out of order from QR
 * frames or truncated by a dropped link must read as "that didn't arrive whole"
 * rather than as a mysterious parse error halfway through a restore.
 */
export function readClone(text: string): ReadClone {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CloneError("That isn't a clone — it couldn't be read.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new CloneError("That isn't a clone.");
  }

  const raw = parsed as Partial<CloneSnapshot>;

  // A plain backup document: no envelope, so no origin — but everything that
  // matters is there, and refusing it would be pedantry.
  if (raw.format !== CLONE_FORMAT) {
    return fromDocument(text, { label: "A backup file", platform: "" }, 0, false);
  }

  if (typeof raw.version === "number" && raw.version > CLONE_VERSION) {
    throw new CloneError(
      "That clone was made by a newer version of OneApp. Update this page, then try again.",
    );
  }
  if (typeof raw.document !== "string" || !raw.document) {
    throw new CloneError("That clone is empty or damaged.");
  }
  if (typeof raw.checksum === "string" && checksum32(raw.document) !== raw.checksum) {
    throw new CloneError("That clone didn't arrive whole — send it again.");
  }

  const from: CloneOrigin = {
    label:
      typeof raw.from?.label === "string" && raw.from.label ? raw.from.label : "Another device",
    platform: typeof raw.from?.platform === "string" ? raw.from.platform : "",
  };
  return fromDocument(raw.document, from, typeof raw.takenAt === "number" ? raw.takenAt : 0, true);
}

/**
 * Hand the inner document to the backup reader, which owns every other check.
 *
 * `wrapped` says whether a clone envelope was actually found. It only affects
 * what a failure is *called*: inside an envelope, a bad document means a
 * damaged clone; without one, the file was never a clone in the first place —
 * and telling someone who picked a clone file that it "isn't a backup" sends
 * them looking in the wrong place entirely.
 */
function fromDocument(
  document: string,
  from: CloneOrigin,
  takenAt: number,
  wrapped: boolean,
): ReadClone {
  try {
    const { entries, summary } = readBackupJson(document);
    return {
      from,
      takenAt: takenAt || summary.createdAt,
      entries,
      rows: summary.rows,
      keys: summary.keys,
      bytes: summary.bytes,
      skipped: summary.skipped,
    };
  } catch (error) {
    if (!(error instanceof BackupError)) {
      throw new CloneError("That clone couldn't be read.");
    }
    // Inside an envelope the backup reader's wording is already right for a
    // person ("that backup is empty or damaged"), and only the error type needs
    // changing so the UI has one class to catch.
    if (wrapped) throw new CloneError(error.message);
    throw new CloneError(
      "That file isn't a clone. Pick the clone the other device wrote, or a backup file from Settings → Data.",
    );
  }
}

/* -------------------------------- planning ----------------------------- */

/** The app a key belongs to, or null for a workspace preference. */
const ownerOf = (key: string): AppId | null => {
  const cls = classifyKey(key);
  return cls.kind === "app" ? cls.app : null;
};

const byteLength = (text: string): number =>
  typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length;

interface Tally {
  arriving: number;
  existing: number;
  bytes: number;
}

/** Destructive rows first: those are the ones worth reading. */
const EFFECT_ORDER: Record<PlanEffect, number> = { erase: 0, overwrite: 1, new: 2, keep: 3 };

/**
 * Work out what applying a clone would do, app by app, without doing it.
 *
 * This is the screen that stands between a clone and someone's work, so it
 * answers the question people actually ask — "what happens to what's already on
 * this device?" — rather than reporting key counts.
 */
export function planClone(
  arriving: Record<string, string>,
  current: Record<string, string>,
  mode: RestoreMode,
): ClonePlan {
  const tallies = new Map<AppId | null, Tally>();
  const tally = (app: AppId | null): Tally => {
    const found = tallies.get(app) ?? { arriving: 0, existing: 0, bytes: 0 };
    tallies.set(app, found);
    return found;
  };

  for (const [key, value] of Object.entries(arriving)) {
    const row = tally(ownerOf(key));
    row.arriving += 1;
    row.bytes += byteLength(key) + byteLength(value);
  }
  // Only keys this workspace owns can be touched, so foreign ones are never
  // counted as "existing" — nothing happens to them either way.
  for (const key of Object.keys(current)) {
    if (classifyKey(key).kind === "foreign") continue;
    tally(ownerOf(key)).existing += 1;
  }

  const rows: PlanRow[] = [...tallies.entries()].map(([app, t]) => ({
    app,
    effect: effectOf(t.arriving, t.existing, mode),
    arriving: t.arriving,
    existing: t.existing,
    bytes: t.bytes,
  }));
  rows.sort((a, b) => EFFECT_ORDER[a.effect] - EFFECT_ORDER[b.effect] || b.bytes - a.bytes);

  const removals =
    mode === "replace"
      ? Object.keys(current).filter(
          (key) => !(key in arriving) && classifyKey(key).kind !== "foreign",
        ).length
      : 0;

  return {
    mode,
    rows,
    writes: Object.keys(arriving).length,
    removals,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
  };
}

function effectOf(arriving: number, existing: number, mode: RestoreMode): PlanEffect {
  if (arriving === 0) return mode === "replace" ? "erase" : "keep";
  return existing === 0 ? "new" : "overwrite";
}

/** Read what this device holds, so a plan can be drawn against it. */
export const readCurrent = (): Promise<Record<string, string>> => sEntries();

/**
 * Write the clone in. Delegates to the backup writer so a clone and a restore
 * are the same operation — the difference is entirely in what was shown first.
 */
export const applyClone = applyBackup;
