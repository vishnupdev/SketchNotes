import { crc32, crcHex } from "@/lib/pack";
import type { Sink } from "./sink";
import type { Control, FileMeta, FileResult, TransferProgress } from "./types";

/**
 * Moving files across an open data channel.
 *
 * What makes this work at *any* size, rather than up to a gigabyte:
 *
 *  - **Nothing is ever fully in memory.** The sender reads each file a slice at a
 *    time (`File.slice`, a view on disk rather than a copy) with one chunk read
 *    ahead; the receiver hands each chunk straight to its sink. A 40 GB file
 *    costs the same memory as a 40 KB one.
 *  - **Both directions have backpressure.** The channel's own buffer governs the
 *    wire, and the *receiver* additionally tells the sender to pause when its
 *    disk falls behind. Without that second signal a fast link fills memory on
 *    the receiving side with chunks waiting to be written — the failure that
 *    actually kills a large transfer.
 *  - **A dropped transfer can be continued.** With a folder sink the partial file
 *    is on disk, so a fresh connection can seek past what already arrived. Both
 *    sides re-hash the prefix so the whole-file checksum still means something.
 *  - **Every file is verified.** CRC-32 is computed over the bytes as they stream
 *    past on both sides and compared at the end of each file, so a truncated or
 *    corrupted arrival is reported rather than silently saved.
 *  - **Either side can stop**, and a cancel removes nothing that a resume could
 *    use.
 *
 * Framing is deliberately trivial: control messages are JSON strings, file bytes
 * are ArrayBuffers, and the channel is ordered — so `typeof event.data` is the
 * whole parser and a chunk needs no sequence number.
 */

/**
 * Chunk size floor and ceiling.
 *
 * 16 KB is the size every SCTP stack accepts, so it is the fallback when the
 * connection won't say what it can take. 256 KB is as high as this goes: it is
 * what Chromium negotiates, and past it the gain is small while the risk of a
 * peer quietly dropping an oversized message is not.
 */
export const CHUNK_SIZE = 16 * 1024;
const MAX_CHUNK = 256 * 1024;

/**
 * How many bytes the receiver lets pile up before telling the sender to wait,
 * and the mark it resumes at. Two chunks' worth of slack keeps the wire busy
 * without letting the queue grow into real memory.
 */
const RECEIVE_HIGH_WATER = 8 * 1024 * 1024;
const RECEIVE_LOW_WATER = 2 * 1024 * 1024;

/**
 * The chunk size to use, given what the connection said it can carry.
 *
 * `maxMessageSize` comes from the negotiated SCTP association (see
 * `lib/rtc/peer.ts`) — not from the data channel, which does not have it. A
 * safety margin is left for SCTP's own framing, and the result is clamped into
 * the range above.
 */
export function chunkSizeFor(maxMessage: number | null): number {
  const limit = maxMessage != null ? maxMessage - 1024 : 0;
  if (limit <= 0) return CHUNK_SIZE;
  return Math.max(CHUNK_SIZE, Math.min(MAX_CHUNK, limit));
}

const send = (channel: RTCDataChannel, message: Control): void => {
  channel.send(JSON.stringify(message));
};

/** Parse a control message; anything unrecognised is ignored, not thrown. */
export function parseControl(text: string): Control | null {
  try {
    const parsed = JSON.parse(text) as Control;
    return parsed && typeof parsed === "object" && typeof parsed.t === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export const metaOf = (file: File): FileMeta => ({
  name: file.name,
  size: file.size,
  type: file.type,
  modified: file.lastModified,
});

/** A moving average of throughput, so the rate shown doesn't flicker. */
export class RateMeter {
  private marks: Array<{ at: number; bytes: number }> = [];

  /** Record cumulative bytes and return bytes/second over the recent window. */
  push(bytes: number, now: number, windowMs = 3000): number {
    this.marks.push({ at: now, bytes });
    while (this.marks.length > 2 && now - this.marks[0].at > windowMs) this.marks.shift();
    const first = this.marks[0];
    const span = now - first.at;
    if (span <= 0) return 0;
    return ((bytes - first.bytes) * 1000) / span;
  }
}

export interface SendHandlers {
  onProgress?: (progress: TransferProgress) => void;
  onFileDone?: (result: FileResult) => void;
  onDone?: () => void;
  onCancelled?: (reason: string) => void;
  onError?: (message: string) => void;
  /** Re-hashing the part of a file that is being skipped on a resume. */
  onRehash?: (fraction: number) => void;
}

/** A handle on a running transfer, so the UI can stop it. */
export interface Transfer {
  cancel: (reason?: string) => void;
}

/** Wait until the channel's own buffer has drained enough to keep writing. */
function drained(channel: RTCDataChannel, highWater: number): Promise<void> {
  if (channel.bufferedAmount <= highWater) return Promise.resolve();
  return new Promise((resolve) => {
    const onLow = () => {
      channel.removeEventListener("bufferedamountlow", onLow);
      resolve();
    };
    channel.addEventListener("bufferedamountlow", onLow);
  });
}

/**
 * The sending side. Offers the list, waits for the receiver's answer, then
 * streams each file in turn — honouring both the channel's buffer and the
 * receiver's pause signal.
 */
export function sendFiles(
  channel: RTCDataChannel,
  files: File[],
  handlers: SendHandlers = {},
  /** From `maxMessageSize(pc)` — decides the chunk size, and so the speed. */
  maxMessage: number | null = null,
): Transfer {
  const metas = files.map(metaOf);
  const total = metas.reduce((sum, m) => sum + m.size, 0);
  const meter = new RateMeter();
  let cancelled = false;
  let sentTotal = 0;

  /** Set while the receiver has asked us to hold off. */
  let paused = false;
  let resumeWait: (() => void) | null = null;
  const waitWhilePaused = () =>
    paused
      ? new Promise<void>((resolve) => {
          resumeWait = resolve;
        })
      : Promise.resolve();

  const stop = (reason: string, tell = true) => {
    if (cancelled) return;
    cancelled = true;
    resumeWait?.();
    if (tell && channel.readyState === "open") send(channel, { t: "cancel", reason });
    handlers.onCancelled?.(reason);
  };

  // Sized to what this connection negotiated, and buffered a few chunks deep:
  // enough in flight to keep the wire busy, not enough to bloat memory.
  const chunkSize = chunkSizeFor(maxMessage);
  const highWater = chunkSize * 8;
  channel.bufferedAmountLowThreshold = chunkSize * 2;
  channel.binaryType = "arraybuffer";

  /**
   * CRC of the bytes being skipped on a resume.
   *
   * The receiver already has them, but the whole-file checksum has to cover the
   * whole file — so the prefix is read back and hashed. Reading a few gigabytes
   * off local disk takes seconds; re-sending them would take minutes.
   */
  const hashPrefix = async (file: File, upto: number): Promise<number> => {
    const STEP = 8 * 1024 * 1024;
    let crc = 0;
    for (let at = 0; at < upto; at += STEP) {
      if (cancelled) return crc;
      const slice = await file.slice(at, Math.min(at + STEP, upto)).arrayBuffer();
      crc = crc32(new Uint8Array(slice), crc);
      handlers.onRehash?.(Math.min(1, (at + STEP) / upto));
    }
    return crc;
  };

  const run = async (skip: Record<number, number>) => {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const meta = metas[index];
      // Never trust the offset: it comes from the other device, and a value past
      // the end of the file would silently send nothing.
      const offset = Math.max(0, Math.min(skip[index] ?? 0, file.size));

      send(channel, { t: "file", index, meta, offset });

      let crc = offset > 0 ? await hashPrefix(file, offset) : 0;
      if (cancelled) return;
      // Bytes already at the other end still count as progress, or the bar would
      // restart from zero on a resumed transfer.
      sentTotal += offset;

      /*
       * One chunk read ahead of the one being sent. `slice` is a view on the file
       * rather than a copy, so this holds two chunks at a time no matter how
       * large the file is — and overlapping the disk read with the wait for the
       * send window is most of the difference in throughput on a big file.
       */
      const read = (at: number) =>
        at < file.size ? file.slice(at, at + chunkSize).arrayBuffer() : null;
      let pending = read(offset);

      for (let at = offset; at < file.size; at += chunkSize) {
        if (cancelled || !pending) return;
        const chunk = await pending;
        pending = read(at + chunkSize);

        await waitWhilePaused();
        await drained(channel, highWater);
        if (cancelled || channel.readyState !== "open") return;

        crc = crc32(new Uint8Array(chunk), crc);
        channel.send(chunk);

        sentTotal += chunk.byteLength;
        handlers.onProgress?.({
          index,
          fileBytes: Math.min(at + chunk.byteLength, file.size),
          totalBytes: sentTotal,
          rate: meter.push(sentTotal, Date.now()),
        });
      }

      send(channel, { t: "end", index, crc: crcHex(crc) });
      handlers.onFileDone?.({
        meta,
        verified: true,
        saved: "sent",
        resumedFrom: offset > 0 ? offset : undefined,
      });
    }

    if (cancelled) return;
    send(channel, { t: "done" });
    handlers.onDone?.();
  };

  // The receiver's replies drive everything from here.
  channel.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    const message = parseControl(event.data);
    if (!message) return;
    switch (message.t) {
      case "accept":
        void run(message.skip ?? {}).catch(() =>
          handlers.onError?.("The transfer stopped unexpectedly."),
        );
        break;
      case "pause":
        paused = true;
        break;
      case "resume":
        paused = false;
        resumeWait?.();
        resumeWait = null;
        break;
      case "decline":
        stop("The other device declined the transfer.", false);
        break;
      case "cancel":
        stop(message.reason || "The other device stopped the transfer.", false);
        break;
      default:
        break;
    }
  });

  channel.addEventListener("close", () => stop("The connection closed.", false));

  // Offer first: the receiver sees what is coming and how big it is before
  // anything starts moving.
  send(channel, { t: "offer", files: metas, total });

  return { cancel: (reason = "You stopped the transfer.") => stop(reason) };
}

export interface ReceiveHandlers {
  /** The sender has described what it wants to send; call accept/decline. */
  onOffer?: (files: FileMeta[], total: number) => void;
  onProgress?: (progress: TransferProgress) => void;
  onFileDone?: (result: FileResult) => void;
  onDone?: (results: FileResult[]) => void;
  onCancelled?: (reason: string) => void;
  onError?: (message: string) => void;
}

export interface Receiver extends Transfer {
  /**
   * Take the offer, writing into `sink`. `skip` says how many bytes of each file
   * are already on disk from an interrupted attempt, with the CRC of those bytes
   * so the finished file still verifies.
   */
  accept: (sink: Sink, resume?: Record<number, { bytes: number; crc: number }>) => void;
  decline: () => void;
}

/**
 * The receiving side. Nothing is written until {@link Receiver.accept} is called
 * with a sink — an unattended tab cannot be made to save files.
 */
export function receiveFiles(channel: RTCDataChannel, handlers: ReceiveHandlers = {}): Receiver {
  const meter = new RateMeter();
  const results: FileResult[] = [];

  let sink: Sink | null = null;
  let resumePoints: Record<number, { bytes: number; crc: number }> = {};
  let writer: Awaited<ReturnType<Sink["open"]>> | null = null;
  let current: { index: number; meta: FileMeta; written: number; crc: number } | null = null;
  let receivedTotal = 0;
  let cancelled = false;

  /**
   * Bytes accepted from the channel but not yet written to the sink, and the
   * chain writing them. The chain keeps writes in order; the counter is what
   * stops it growing without limit — past the high-water mark the sender is told
   * to pause, which is the only thing standing between a fast link and a dead
   * tab on a multi-gigabyte file.
   */
  let queued = 0;
  let paused = false;
  let queue: Promise<void> = Promise.resolve();

  channel.binaryType = "arraybuffer";

  const tellPause = () => {
    if (paused || cancelled || channel.readyState !== "open") return;
    paused = true;
    send(channel, { t: "pause" });
  };
  const tellResume = () => {
    if (!paused || cancelled || channel.readyState !== "open") return;
    paused = false;
    send(channel, { t: "resume" });
  };

  const stop = (reason: string, tell = true) => {
    if (cancelled) return;
    cancelled = true;
    if (tell && channel.readyState === "open") send(channel, { t: "cancel", reason });
    // Keep whatever has been written: that partial file is what a resume
    // continues from.
    void writer?.keep();
    writer = null;
    current = null;
    handlers.onCancelled?.(reason);
  };

  const openFile = (index: number, meta: FileMeta, offset: number) => {
    queue = queue.then(async () => {
      if (cancelled || !sink) return;
      // Close whatever came before, in case an "end" was missed.
      if (writer) await writer.close().catch(() => {});
      const resume = resumePoints[index];
      const from = resume && resume.bytes === offset ? resume : null;
      current = {
        index,
        meta,
        written: offset,
        // Seeded with the CRC of what is already on disk, so the finished file
        // verifies as a whole rather than only from the resume point on.
        crc: from ? from.crc : 0,
      };
      receivedTotal += offset;
      writer = await sink.open(meta, offset);
    });
  };

  const writeChunk = (chunk: ArrayBuffer) => {
    queued += chunk.byteLength;
    if (queued > RECEIVE_HIGH_WATER) tellPause();

    queue = queue.then(async () => {
      try {
        if (cancelled || !writer || !current) return;
        current.crc = crc32(new Uint8Array(chunk), current.crc);
        // The sink's `write` resolves when it has actually taken the bytes, so
        // this await *is* the disk's backpressure.
        await writer.write(chunk);
        current.written += chunk.byteLength;
        receivedTotal += chunk.byteLength;
        handlers.onProgress?.({
          index: current.index,
          fileBytes: current.written,
          totalBytes: receivedTotal,
          rate: meter.push(receivedTotal, Date.now()),
        });
      } catch {
        stop("Saving the file failed — the disk may be full.");
      } finally {
        queued -= chunk.byteLength;
        if (queued <= RECEIVE_LOW_WATER) tellResume();
      }
    });
  };

  const finishFile = (crc: string) => {
    queue = queue.then(async () => {
      if (cancelled || !writer || !current) return;
      const { meta, index } = current;
      const verified = crcHex(current.crc) === crc && current.written === meta.size;
      if (verified) {
        await writer.close();
      } else {
        // Discarded, not kept: a full-length file with the right name that
        // failed its checksum is worse than no file, because a later resume
        // would see the size and assume it was finished.
        await writer.abort();
      }
      const resumed = resumePoints[index]?.bytes;
      const result: FileResult = {
        meta,
        verified,
        saved: sink?.kind === "disk" ? "disk" : sink?.kind === "stream" ? "stream" : "download",
        resumedFrom: resumed && resumed > 0 ? resumed : undefined,
      };
      results.push(result);
      handlers.onFileDone?.(result);
      writer = null;
      current = null;
    });
  };

  channel.addEventListener("message", (event) => {
    if (cancelled) return;
    if (typeof event.data !== "string") {
      writeChunk(event.data as ArrayBuffer);
      return;
    }
    const message = parseControl(event.data);
    if (!message) return;
    switch (message.t) {
      case "offer":
        handlers.onOffer?.(message.files, message.total);
        break;
      case "file":
        openFile(message.index, message.meta, message.offset ?? 0);
        break;
      case "end":
        finishFile(message.crc);
        break;
      case "done":
        queue = queue.then(() => handlers.onDone?.(results));
        break;
      case "cancel":
        stop(message.reason || "The other device stopped the transfer.", false);
        break;
      default:
        break;
    }
  });

  channel.addEventListener("close", () => {
    // A close after "done" is just tidy-up; before it, the transfer was cut off —
    // and what has been written stays, so it can be resumed.
    if (current || writer) {
      stop("The connection closed before the transfer finished. What arrived is kept.", false);
    }
  });

  return {
    accept: (chosen, resume = {}) => {
      sink = chosen;
      resumePoints = resume;
      const skip: Record<number, number> = {};
      for (const [index, point] of Object.entries(resume)) skip[Number(index)] = point.bytes;
      send(channel, { t: "accept", skip });
    },
    decline: () => {
      send(channel, { t: "decline" });
      cancelled = true;
    },
    cancel: (reason = "You stopped the transfer.") => stop(reason),
  };
}
