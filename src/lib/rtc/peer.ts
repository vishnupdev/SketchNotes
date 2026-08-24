/**
 * A direct connection between two browsers, with no signalling server.
 *
 * WebRTC normally needs a server in the middle to introduce two peers. This
 * workspace has no such server and no account, so the introduction is done *by
 * the user*: the offer and the answer are turned into text (`./code.ts`) and
 * carried across by whatever the user already has — a QR code held up to a
 * camera, or a message pasted into any chat app. Once they have been swapped the
 * data path is peer-to-peer and nothing else is involved.
 *
 * Two reach modes, and the difference matters enough to be a user-facing choice:
 *
 *  - **`local`** — an empty `iceServers` list, so only addresses on this network
 *    are gathered. Nothing outside the network is contacted, not even to learn
 *    our own address, and it works with no internet connection at all. Both
 *    devices must be on the same network (a phone hotspot counts).
 *  - **`internet`** — adds public STUN servers, which is what lets two devices on
 *    *different* networks find each other. A STUN server is asked one question
 *    ("what address do I look like from outside?") and never sees the data, but
 *    it is a third party being contacted, so the app says so and never picks this
 *    mode on its own.
 *
 * There is deliberately no TURN server. TURN would relay the actual bytes
 * through someone else's machine — the one thing this workspace does not do — and
 * it cannot be offered for free anyway. The cost is honest and stated in the UI:
 * a small share of network pairs (both ends behind strict carrier NAT) cannot be
 * connected directly, and those transfers have to fall back to the same network.
 *
 * Non-trickle by necessity: candidates are gathered *before* the description is
 * shown, because a QR code or a pasted message cannot be amended afterwards.
 */

export type ReachMode = "local" | "internet";

/**
 * Public STUN servers, used only in `internet` mode. Two providers, because a
 * single unreachable one would silently cost the user their public candidates —
 * and both are STUN-only endpoints, which by protocol cannot carry data.
 */
export const STUN_SERVERS = ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"];

const configFor = (mode: ReachMode): RTCConfiguration =>
  mode === "internet" ? { iceServers: [{ urls: STUN_SERVERS }] } : { iceServers: [] };

/**
 * How long to keep collecting candidates before showing the code.
 *
 * Local gathering finishes in milliseconds. With STUN it means a round trip to
 * two servers, so the budget is longer — but capped, because a network that
 * silently drops STUN would otherwise leave the user watching a spinner forever.
 * Whatever has been gathered by the deadline is used.
 */
const GATHER_MS: Record<ReachMode, number> = { local: 2500, internet: 6000 };

export function rtcSupported(): boolean {
  return typeof window !== "undefined" && typeof window.RTCPeerConnection === "function";
}

/** Wait for ICE gathering to finish, or for the budget to run out. */
function gathered(pc: RTCPeerConnection, mode: ReachMode): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      window.clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const timer = window.setTimeout(done, GATHER_MS[mode]);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

/** Serialised session description — what travels between the two devices. */
export const serializeDescription = (description: RTCSessionDescription | null): string =>
  JSON.stringify({ type: description?.type, sdp: description?.sdp });

export function parseDescription(text: string): RTCSessionDescriptionInit {
  let parsed: { type?: string; sdp?: string };
  try {
    parsed = JSON.parse(text) as { type?: string; sdp?: string };
  } catch {
    throw new Error("That isn't a connection code.");
  }
  if (parsed.type !== "offer" && parsed.type !== "answer") {
    throw new Error("That code isn't a connection offer or reply.");
  }
  if (typeof parsed.sdp !== "string" || !parsed.sdp) {
    throw new Error("That connection code is incomplete.");
  }
  return { type: parsed.type, sdp: parsed.sdp };
}

/** What the caller gets back: the connection, plus its description to pass on. */
export interface Peer {
  pc: RTCPeerConnection;
  /** The local description, ready to be encoded and carried to the other device. */
  description: string;
  /** Apply the description that came back. */
  accept: (remote: string) => Promise<void>;
  close: () => void;
}

export interface PeerHandlers {
  /** Connection state, for the "connecting… / connected / lost" line in the UI. */
  onState?: (state: RTCPeerConnectionState) => void;
  /** ICE gave up: on this pair of networks a direct path could not be found. */
  onUnreachable?: () => void;
}

function watch(pc: RTCPeerConnection, handlers: PeerHandlers): void {
  pc.onconnectionstatechange = () => handlers.onState?.(pc.connectionState);
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") handlers.onUnreachable?.();
  };
}

/**
 * The offering side. The data channel is created here, so the caller can wire it
 * up before the connection is live.
 */
export async function createOffer(
  mode: ReachMode,
  label: string,
  handlers: PeerHandlers = {},
): Promise<{ peer: Peer; channel: RTCDataChannel }> {
  const pc = new RTCPeerConnection(configFor(mode));
  watch(pc, handlers);
  const channel = pc.createDataChannel(label, { ordered: true });

  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc, mode);

  return { peer: peerOf(pc), channel };
}

/**
 * The answering side. The channel is opened by the *other* peer, so it arrives as
 * an event — the promise resolves when it does.
 */
export async function createAnswer(
  offer: string,
  mode: ReachMode,
  handlers: PeerHandlers = {},
): Promise<{ peer: Peer; channel: Promise<RTCDataChannel> }> {
  const pc = new RTCPeerConnection(configFor(mode));
  watch(pc, handlers);

  const channel = new Promise<RTCDataChannel>((resolve) => {
    pc.ondatachannel = (event) => resolve(event.channel);
  });

  await pc.setRemoteDescription(parseDescription(offer));
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc, mode);

  return { peer: peerOf(pc), channel };
}

function peerOf(pc: RTCPeerConnection): Peer {
  return {
    pc,
    description: serializeDescription(pc.localDescription),
    accept: async (remote) => {
      await pc.setRemoteDescription(parseDescription(remote));
    },
    close: () => pc.close(),
  };
}

/**
 * The largest single message this connection will carry, once negotiated.
 *
 * Lives on the SCTP association rather than on the data channel, which is easy
 * to get wrong — and getting it wrong costs throughput silently, because the
 * fallback is the small safe chunk. Returns null until the association exists.
 */
export function maxMessageSize(pc: RTCPeerConnection): number | null {
  const size = pc.sctp?.maxMessageSize;
  return typeof size === "number" && size > 0 ? size : null;
}

/** Resolve once the channel is open, or reject if it never gets there. */
export function whenOpen(channel: RTCDataChannel, timeoutMs = 20_000): Promise<void> {
  if (channel.readyState === "open") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("The connection didn't open."));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      channel.removeEventListener("open", onOpen);
      channel.removeEventListener("close", onClose);
      channel.removeEventListener("error", onClose);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("The connection closed before it opened."));
    };
    channel.addEventListener("open", onOpen);
    channel.addEventListener("close", onClose);
    channel.addEventListener("error", onClose);
  });
}
