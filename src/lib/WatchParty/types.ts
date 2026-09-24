/**
 * Watch Party's data model — what a room is, as every member sees it.
 *
 * A room is a **star**: the host's browser is the hub and every guest holds one
 * WebRTC connection, to the host. There is no server to be the hub instead, and
 * no mesh, because each extra connection in a mesh costs another pair of codes
 * carried by hand. So the host owns the truth — the member list, the queue and
 * the playback clock — and publishes it as a {@link RoomSnapshot}; guests render
 * whatever they were last sent and ask the host to change it.
 */

/** The most people one room holds, host included. Past this the host's upload
 *  (one copy of a streamed file per guest) stops being something a home
 *  connection can carry. */
export const MAX_MEMBERS = 8;

export type Role = "host" | "guest";

/**
 * Where a queued thing plays from.
 *
 * - `youtube` / `url` — everyone loads it themselves and plays in sync.
 * - `file`   — a file on the host's device, streamed to guests live (or played
 *              from a guest's own copy of the same file, in sync).
 * - `screen` — a tab, window or screen the host is sharing. Live only.
 */
export type MediaKind = "youtube" | "url" | "file" | "screen";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  /** The YouTube video id, or the media URL. Empty for files and screens, which
   *  never leave the host's device as anything but a stream. */
  src: string;
  /** Sound with no picture — drawn as music rather than as a black frame. */
  audio: boolean;
  /** Length in seconds, once a player has read it. */
  duration: number | null;
  /** File size in bytes, so a guest can tell whether their copy is the same file. */
  size?: number;
  /** Display name of whoever queued it. */
  addedBy: string;
}

/**
 * The shared clock — the one thing every player in the room steers by.
 *
 * Not "the time now" but a line: at host time `at` the position was `position`,
 * moving at `rate` seconds per second while playing. Anyone can extrapolate the
 * position for any moment from that, so the host only sends a new one when the
 * line itself changes (play, pause, seek, rate, or the host falling behind).
 */
export interface Playback {
  status: "playing" | "paused";
  position: number;
  rate: number;
  /** Host clock, in ms since the epoch (`performance.timeOrigin`-based). */
  at: number;
  /**
   * True when the host moved the line to match its own player (it buffered, or
   * a new item took time to load), rather than because someone pressed a
   * control. The host's own player follows deliberate changes and never chases
   * its own re-anchors — see `usePlaybackSync`.
   */
  anchor?: boolean;
}

export interface Member {
  id: string;
  name: string;
  /** 0 for the host, 1… for guests — picks the member's colour. Reused once freed. */
  slot: number;
  host: boolean;
  /** Whether their microphone is open to the room. */
  mic: boolean;
}

/** How a member's playback is going, as they last reported it to the host. */
export interface MemberStatus {
  /** Round trip to the host in ms. */
  rtt: number | null;
  /** Seconds ahead (+) or behind (−) the room. Null while not syncing. */
  drift: number | null;
  buffering: boolean;
  /** `sync` — playing their own copy in step; `stream` — watching the host's
   *  stream; `idle` — nothing playing. */
  mode: "sync" | "stream" | "idle";
}

export interface RoomSettings {
  /** Guests may play, pause, seek and change speed. */
  guestControl: boolean;
  /** Guests may add links to the queue. */
  guestQueue: boolean;
  /** A majority of the room can skip what is playing. */
  voteSkip: boolean;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  guestControl: true,
  guestQueue: true,
  voteSkip: true,
};

export interface RoomSnapshot {
  name: string;
  members: Member[];
  status: Record<string, MemberStatus>;
  settings: RoomSettings;
  now: MediaItem | null;
  queue: MediaItem[];
  /** Most recent first. */
  history: MediaItem[];
  playback: Playback;
  /** Member ids who have asked to skip what is playing now. */
  skipVotes: string[];
}

export interface ChatMessage {
  id: string;
  /** Member id, or null for the room's own notices ("Asha joined"). */
  from: string | null;
  name: string;
  slot: number;
  text: string;
  /** Epoch ms, as stamped by the host. */
  at: number;
}

export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** The reactions anyone can throw at the screen. A fixed set, so the host can
 *  refuse anything else rather than render whatever a peer sends. */
export const REACTIONS = ["😂", "❤️", "😮", "👏", "🔥", "😢", "🎉", "👀"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const isReaction = (value: unknown): value is Reaction =>
  typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
