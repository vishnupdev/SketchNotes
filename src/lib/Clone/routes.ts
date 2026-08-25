import type { ReachMode } from "@/lib/rtc/peer";
import { CHUNK_BYTES } from "@/lib/qr/frames";
import type { CloneRoute, CloneTransport } from "./types";

/**
 * The three ways two devices can be joined, and what each one honestly costs.
 *
 * This is the app's first screen and its whole premise: what you have to hand
 * decides what is possible. A wire, a network, or neither — and the answer
 * changes not just the speed but *who else is involved*, which is the part a
 * person has a right to decide rather than have chosen for them.
 *
 * The copy here is the specification, not decoration. Every claim in it is one
 * the code keeps:
 *
 *  - "nothing outside the two devices is contacted" means an empty `iceServers`
 *    list (`lib/rtc/peer.ts`), so not one packet leaves the link — not even to
 *    ask what this device's own address is.
 *  - "needs the internet" appears on exactly one option, the one that asks a
 *    public STUN server for this device's public address.
 *  - there is no relay anywhere. Bytes go device to device or they don't go.
 */

export interface TransportInfo {
  id: CloneTransport;
  label: string;
  /** One line, written for the button. */
  blurb: string;
  /** Roughly how fast, in the terms a person cares about. */
  speed: string;
}

export const TRANSPORTS: Record<CloneTransport, TransportInfo> = {
  link: {
    id: "link",
    label: "Direct link",
    blurb: "A live connection between the two browsers. The whole clone crosses in one go.",
    speed: "Seconds, whatever the size",
  },
  drive: {
    id: "drive",
    label: "Clone file",
    blurb:
      "Write the clone to a USB drive, memory card or folder, carry it across, and read it back on the other device.",
    speed: "As fast as the drive",
  },
  codes: {
    id: "codes",
    label: "On-screen codes",
    blurb:
      "The clone becomes a loop of QR codes. The other device reads them off this screen with its camera.",
    speed: "About 6 KB a second",
  },
};

export interface RouteInfo {
  id: CloneRoute;
  label: string;
  /** The situation this route is for, in the user's words. */
  blurb: string;
  /** Transports this route offers, best first. */
  transports: CloneTransport[];
  /** What has to be true before it can work. */
  needs: string[];
  /**
   * Everything outside the two devices that gets contacted. An empty list is a
   * promise, and it is kept by the reach mode this route uses.
   */
  contacts: string[];
  /** Setting-up instructions, where a route has any. */
  steps?: string[];
}

export const ROUTES: RouteInfo[] = [
  {
    id: "cable",
    label: "By cable",
    blurb: "A wire between the two devices — or a drive carried from one to the other.",
    transports: ["link", "drive"],
    needs: ["A USB cable, or a USB drive or memory card"],
    contacts: [],
    steps: [
      "Plug the phone into the computer with its cable.",
      "On the phone, turn on USB tethering (Settings → Network → Hotspot & tethering). Both devices are now on one network that exists only inside the cable.",
      "Open Clone on both, choose By cable, and use the direct link below.",
      "No cable that can carry a network? Write a clone file to a USB drive instead, then plug it into the other device and read it back.",
    ],
  },
  {
    id: "network",
    label: "Over a network",
    blurb: "Both devices on the same Wi-Fi — or on different networks anywhere in the world.",
    transports: ["link", "drive"],
    needs: ["Both devices online, and both able to open this page"],
    contacts: [
      "Same network: nothing at all.",
      "Different networks: a public STUN server, asked one question — what address this device looks like from outside. It never sees the clone.",
    ],
  },
  {
    id: "offline",
    label: "Without a network",
    blurb: "No wire, no Wi-Fi, no internet. A screen on one device and a camera on the other.",
    transports: ["codes", "drive"],
    needs: ["A camera on the receiving device"],
    contacts: [],
    steps: [
      "Open Clone → Receive on the other device and point its camera at this screen.",
      "Hold it there until it says it has every part. The codes loop, so parts can be read in any order and as many times as needed.",
    ],
  },
];

export const ROUTE_MAP: Record<CloneRoute, RouteInfo> = Object.fromEntries(
  ROUTES.map((r) => [r.id, r]),
) as Record<CloneRoute, RouteInfo>;

/**
 * How far the connection is allowed to reach, per route.
 *
 * A cable link is always `local`: the whole point of a wire is that nothing
 * else is involved, and gathering a public address over a USB tether would
 * contact a third party for no benefit whatsoever. Only the network route can
 * ask for `internet`, and only when the user picks it.
 */
export const reachFor = (route: CloneRoute, wide: boolean): ReachMode =>
  route === "network" && wide ? "internet" : "local";

/**
 * Whether a clone this size is sensible to send as QR codes.
 *
 * Frames carry {@link CHUNK_BYTES} of compressed payload each and play at a
 * few a second, so a full device clone — which is usually dominated by base64
 * image data in sketches — can easily be thousands of frames. Better to say so
 * before someone holds a phone up for twenty minutes.
 */
export const frameEstimate = (bytes: number): number => Math.ceil(bytes / 3 / CHUNK_BYTES);

/** Above this, the codes route is offered but no longer recommended. */
export const CODES_COMFORTABLE_BYTES = 120_000;
