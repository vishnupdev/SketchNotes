/**
 * The File Drop wire protocol, as types.
 *
 * Control messages travel as JSON *strings* and file bytes as *ArrayBuffers* on
 * the same ordered data channel. That split is the whole framing scheme: the
 * receiver tells them apart with `typeof event.data`, so there is no length
 * prefix to get wrong and no binary header to parse. An ordered channel also
 * means chunks cannot arrive out of sequence, so a chunk needs no index — the
 * open file's header says how many bytes are still owed.
 */

/** One file, as described before its bytes start. */
export interface FileMeta {
  name: string;
  size: number;
  /** MIME type as the sending browser reported it; may be empty. */
  type: string;
  /** Last modified, so a saved copy keeps something of the original. */
  modified?: number;
}

export type Control =
  /** Everything about to be sent, so the receiver can accept or decline. */
  | { t: "offer"; files: FileMeta[]; total: number }
  /**
   * The receiver's decision. `skip` carries how many bytes of each file it
   * already has from an interrupted attempt, so the sender can seek past them
   * instead of starting the file again — the difference between a failed 5 GB
   * transfer costing five minutes and costing the whole thing.
   */
  | { t: "accept"; skip?: Record<number, number> }
  | { t: "decline" }
  /** The next file's bytes start now, from `offset` (0 unless resuming). */
  | { t: "file"; index: number; meta: FileMeta; offset: number }
  /** That file is complete; `crc` is CRC-32 of the whole file as hex. */
  | { t: "end"; index: number; crc: string }
  /** Every file is through. */
  | { t: "done" }
  /**
   * Receiver-driven flow control. A data channel will accept bytes far faster
   * than a disk can take them, and without this the excess piles up in memory
   * until the tab dies — which is exactly what happens on a large file over a
   * fast link.
   */
  | { t: "pause" }
  | { t: "resume" }
  /** Either side giving up, with something to show the user. */
  | { t: "cancel"; reason: string };

/** Where a transfer has got to — the shape the UI renders. */
export interface TransferProgress {
  /** Index of the file being moved, or -1 before the first one. */
  index: number;
  /** Bytes of the current file that have crossed. */
  fileBytes: number;
  /** Bytes of the whole transfer that have crossed. */
  totalBytes: number;
  /** Bytes per second, averaged over the last few seconds. */
  rate: number;
}

export type TransferPhase =
  | "idle"
  /** Waiting for the two devices to be introduced. */
  | "pairing"
  | "connecting"
  /** Connected; the receiver is deciding whether to accept. */
  | "offered"
  | "transferring"
  | "done"
  | "cancelled"
  | "failed";

/** One finished file, for the list shown afterwards. */
export interface FileResult {
  meta: FileMeta;
  /** False when the checksum didn't match what the sender computed. */
  verified: boolean;
  /** Where it went: a real file on disk, a download, or out to the other device. */
  saved: "disk" | "stream" | "download" | "sent";
  /** Bytes that didn't need re-sending because they were already there. */
  resumedFrom?: number;
}
