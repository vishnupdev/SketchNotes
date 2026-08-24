import { createAnswer, createOffer, rtcSupported, whenOpen, type Peer } from "@/lib/rtc/peer";

/**
 * Handoff's fast lane: a direct data channel carrying the backup document.
 *
 * Showing a payload as a chain of QR codes is dependable and needs nothing but a
 * camera, but it moves a few kilobytes a second — fine for a task list, painful
 * for a sketchbook. This transport carries any size in seconds instead, and
 * still involves no server:
 *
 *  1. the sender builds an offer and shows it as QR frames;
 *  2. the receiver scans it, builds an answer and shows *that* as QR frames;
 *  3. the sender scans the answer, the channel opens, the document goes across.
 *
 * The connection itself is `lib/rtc/peer.ts`, shared with File Drop — the two
 * apps need the same introduction dance and only differ in what they then send.
 * Handoff always uses `local` reach: it is the "send this to my phone" case, so
 * no third-party server is contacted at all, and it works with no internet.
 *
 * What travels here is text (a backup document), so the payload is chunked as
 * strings with an end marker. File Drop's own protocol handles binary streams.
 */

/** Chunk size for sending over the channel; comfortably under the 64 KB cap. */
const SEND_CHUNK = 16 * 1024;

/** End-of-payload marker, so the receiver knows the last chunk has arrived. */
const EOF = "OAH-EOF";

export interface HandoffLink {
  /** The local description to show as QR frames. */
  description: string;
  /** Feed the description scanned from the other device. */
  accept: (description: string) => Promise<void>;
  /** Send a payload (sender side only). Resolves when the last byte is queued. */
  send: (payload: string) => Promise<void>;
  close: () => void;
}

export { rtcSupported as webrtcSupported };

interface LinkHandlers {
  /** A complete payload arrived (receiver side). */
  onPayload?: (payload: string) => void;
  /** 0..1 while sending; -1 while receiving, where the total isn't known yet. */
  onProgress?: (fraction: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
}

/** Wire a data channel up to the handlers, including reassembly. */
function attach(channel: RTCDataChannel, handlers: LinkHandlers): void {
  let received = "";
  channel.binaryType = "arraybuffer";
  channel.onopen = () => handlers.onOpen?.();
  channel.onclose = () => handlers.onClose?.();
  channel.onerror = () => handlers.onError?.("The direct link failed.");
  channel.onmessage = (event) => {
    const text = typeof event.data === "string" ? event.data : "";
    if (!text) return;
    if (text.endsWith(EOF)) {
      received += text.slice(0, -EOF.length);
      handlers.onPayload?.(received);
      received = "";
      return;
    }
    received += text;
    handlers.onProgress?.(-1); // size is unknown until EOF; -1 means "working"
  };
}

/** Send a string down the channel in chunks, waiting when the buffer fills. */
async function sendChunks(
  channel: RTCDataChannel,
  payload: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  channel.bufferedAmountLowThreshold = SEND_CHUNK * 4;
  for (let at = 0; at < payload.length; at += SEND_CHUNK) {
    // Back-pressure: filling the buffer without waiting closes the channel.
    if (channel.bufferedAmount > SEND_CHUNK * 8) {
      await new Promise<void>((resolve) => {
        const onLow = () => {
          channel.removeEventListener("bufferedamountlow", onLow);
          resolve();
        };
        channel.addEventListener("bufferedamountlow", onLow);
      });
    }
    channel.send(payload.slice(at, at + SEND_CHUNK));
    onProgress?.(Math.min(1, (at + SEND_CHUNK) / payload.length));
  }
  channel.send(EOF);
  onProgress?.(1);
}

/** The sending side: builds the offer, waits for an answer, then transfers. */
export async function createSender(handlers: LinkHandlers = {}): Promise<HandoffLink> {
  const { peer, channel } = await createOffer("local", "oneapp-handoff", {
    onUnreachable: () => handlers.onError?.("No direct path to the other device was found."),
  });
  attach(channel, handlers);
  return linkOf(peer, channel, handlers);
}

/** The receiving side: takes the offer, produces an answer, waits for data. */
export async function createReceiver(
  offer: string,
  handlers: LinkHandlers = {},
): Promise<HandoffLink> {
  const { peer, channel } = await createAnswer(offer, "local", {
    onUnreachable: () => handlers.onError?.("No direct path to the other device was found."),
  });
  // The channel is opened by the other side, so it arrives asynchronously.
  void channel.then((c) => attach(c, handlers));
  return {
    description: peer.description,
    accept: async () => {
      // The receiver has nothing further to accept; the offer came in above.
    },
    send: async () => {
      throw new Error("The receiving side doesn't send.");
    },
    close: () => peer.close(),
  };
}

function linkOf(peer: Peer, channel: RTCDataChannel, handlers: LinkHandlers): HandoffLink {
  return {
    description: peer.description,
    accept: peer.accept,
    send: async (payload) => {
      await whenOpen(channel);
      await sendChunks(channel, payload, handlers.onProgress);
    },
    close: () => {
      try {
        channel.close();
      } finally {
        peer.close();
      }
    },
  };
}
