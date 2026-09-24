import {
  isReaction,
  type ChatMessage,
  type Cue,
  type MemberStatus,
  type Reaction,
  type RoomSnapshot,
} from "./types";

/**
 * What travels over a room's data channel, and the checks on the way in.
 *
 * Everything is JSON on one ordered, reliable channel per guest. The host reads
 * messages from browsers it does not control, so every guest message is
 * validated field by field before the host acts on it — a guest can ask for
 * anything, and gets only what the room's settings allow. Guests check the
 * host's messages for shape too, so a malformed one is dropped rather than
 * crashing the page that renders it.
 */

export const PROTOCOL = 1;

/** Longest chat line, display name and room name accepted from anyone. */
export const MAX_CHAT = 500;
export const MAX_NAME = 32;
export const MAX_ROOM_NAME = 48;

export type Control =
  | { action: "play"; position?: number }
  | { action: "pause"; position?: number }
  | { action: "seek"; position: number }
  | { action: "rate"; rate: number };

/** Guest → host. */
export type GuestMsg =
  | { t: "hello"; name: string; v: number }
  | { t: "ping"; t0: number }
  | { t: "chat"; text: string }
  | { t: "react"; emoji: Reaction }
  | ({ t: "control" } & Control)
  | { t: "add"; link: string; next: boolean }
  | { t: "vote" }
  | ({ t: "stat" } & MemberStatus)
  | { t: "mic"; on: boolean }
  | { t: "sdp"; sdp: string }
  | { t: "bye" };

/** Which transceiver carries what, by `mid`, after the host renegotiates. */
export interface Mids {
  video: string;
  audio: string;
  voice: string;
  mic: string;
}

export interface SharedSubs {
  itemId: string;
  cues: Cue[];
}

/** Host → guest. */
export type HostMsg =
  | { t: "welcome"; you: string; room: RoomSnapshot; chat: ChatMessage[]; subs: SharedSubs | null }
  | { t: "room"; room: RoomSnapshot }
  | { t: "pong"; t0: number; h: number }
  | { t: "chat"; msg: ChatMessage }
  | { t: "react"; from: string; emoji: Reaction }
  | { t: "subs"; subs: SharedSubs | null }
  | { t: "sdp"; sdp: string; mids: Mids }
  | { t: "speaking"; ids: string[] }
  | { t: "notice"; text: string }
  | { t: "bye"; reason: string };

/* ------------------------------ validation ------------------------------ */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown, max = Infinity): v is string => typeof v === "string" && v.length <= max;
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

/** Collapse whitespace and trim to a length — what every name goes through. */
export function cleanName(raw: string, max = MAX_NAME): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

function parseControl(m: Obj): Control | null {
  switch (m.action) {
    case "play":
    case "pause":
      if (m.position !== undefined && !(isNum(m.position) && m.position >= 0)) return null;
      return { action: m.action, position: m.position as number | undefined };
    case "seek":
      return isNum(m.position) && m.position >= 0 ? { action: "seek", position: m.position } : null;
    case "rate":
      return isNum(m.rate) && m.rate >= 0.25 && m.rate <= 2 ? { action: "rate", rate: m.rate } : null;
    default:
      return null;
  }
}

/** A guest's message, or null if it is not one the host will act on. */
export function parseGuest(raw: unknown): GuestMsg | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case "hello":
      return isStr(raw.name, 200) && isNum(raw.v) ? { t: "hello", name: raw.name, v: raw.v } : null;
    case "ping":
      return isNum(raw.t0) ? { t: "ping", t0: raw.t0 } : null;
    case "chat":
      return isStr(raw.text, MAX_CHAT * 2) && raw.text.trim() ? { t: "chat", text: raw.text } : null;
    case "react":
      return isReaction(raw.emoji) ? { t: "react", emoji: raw.emoji } : null;
    case "control": {
      const control = parseControl(raw);
      return control ? { t: "control", ...control } : null;
    }
    case "add":
      return isStr(raw.link, 2048) ? { t: "add", link: raw.link, next: raw.next === true } : null;
    case "vote":
      return { t: "vote" };
    case "stat":
      if (!(raw.rtt === null || isNum(raw.rtt))) return null;
      if (!(raw.drift === null || isNum(raw.drift))) return null;
      if (!isBool(raw.buffering)) return null;
      if (raw.mode !== "sync" && raw.mode !== "stream" && raw.mode !== "idle") return null;
      return { t: "stat", rtt: raw.rtt, drift: raw.drift, buffering: raw.buffering, mode: raw.mode };
    case "mic":
      return isBool(raw.on) ? { t: "mic", on: raw.on } : null;
    case "sdp":
      return isStr(raw.sdp, 200_000) ? { t: "sdp", sdp: raw.sdp } : null;
    case "bye":
      return { t: "bye" };
    default:
      return null;
  }
}

function isRoom(v: unknown): v is RoomSnapshot {
  if (!isObj(v)) return false;
  if (!isStr(v.name) || !Array.isArray(v.members) || !Array.isArray(v.queue)) return false;
  if (!Array.isArray(v.history) || !Array.isArray(v.skipVotes)) return false;
  if (!isObj(v.status) || !isObj(v.settings)) return false;
  const p = v.playback;
  if (!isObj(p) || !isNum(p.position) || !isNum(p.rate) || !isNum(p.at)) return false;
  if (p.status !== "playing" && p.status !== "paused") return false;
  return v.members.every((m) => isObj(m) && isStr(m.id) && isStr(m.name) && isNum(m.slot));
}

const isChat = (v: unknown): v is ChatMessage =>
  isObj(v) && isStr(v.id) && isStr(v.name) && isStr(v.text) && isNum(v.at) && isNum(v.slot);

const isCues = (v: unknown): v is Cue[] =>
  Array.isArray(v) && v.every((c) => isObj(c) && isNum(c.start) && isNum(c.end) && isStr(c.text));

const parseSubs = (v: unknown): SharedSubs | null | undefined => {
  if (v === null) return null;
  if (isObj(v) && isStr(v.itemId) && isCues(v.cues)) return { itemId: v.itemId, cues: v.cues };
  return undefined;
};

/** The host's message, or null if it is malformed. */
export function parseHost(raw: unknown): HostMsg | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case "welcome": {
      const subs = parseSubs(raw.subs);
      if (!isStr(raw.you) || !isRoom(raw.room) || subs === undefined) return null;
      const chat = Array.isArray(raw.chat) ? raw.chat.filter(isChat) : [];
      return { t: "welcome", you: raw.you, room: raw.room, chat, subs };
    }
    case "room":
      return isRoom(raw.room) ? { t: "room", room: raw.room } : null;
    case "pong":
      return isNum(raw.t0) && isNum(raw.h) ? { t: "pong", t0: raw.t0, h: raw.h } : null;
    case "chat":
      return isChat(raw.msg) ? { t: "chat", msg: raw.msg } : null;
    case "react":
      return isStr(raw.from) && isReaction(raw.emoji)
        ? { t: "react", from: raw.from, emoji: raw.emoji }
        : null;
    case "subs": {
      const subs = parseSubs(raw.subs);
      return subs === undefined ? null : { t: "subs", subs };
    }
    case "sdp": {
      const mids = raw.mids;
      if (!isStr(raw.sdp) || !isObj(mids)) return null;
      if (![mids.video, mids.audio, mids.voice, mids.mic].every((mid) => isStr(mid))) return null;
      return { t: "sdp", sdp: raw.sdp, mids: mids as unknown as Mids };
    }
    case "speaking":
      return Array.isArray(raw.ids) && raw.ids.every((id) => isStr(id))
        ? { t: "speaking", ids: raw.ids as string[] }
        : null;
    case "notice":
      return isStr(raw.text, 500) ? { t: "notice", text: raw.text } : null;
    case "bye":
      return { t: "bye", reason: isStr(raw.reason, 300) ? raw.reason : "The room was closed." };
    default:
      return null;
  }
}

/* ------------------------------- framing -------------------------------- */

/**
 * Messages above this are cut into pieces. Browsers disagree on the largest
 * single message a data channel carries (and some tear the channel down past
 * it), while 16 KB is safe everywhere. Almost everything a room says is far
 * smaller; a subtitle file is the thing that is not.
 */
export const FRAME_CHARS = 16_000;

/**
 * How much of the message goes in each piece. Half the frame, because a piece
 * carries its slice as a JSON *string* — every quote in the slice is escaped to
 * two characters — so a slice of JSON can grow to nearly twice its length.
 */
const PIECE_CHARS = FRAME_CHARS / 2;

/** A reassembled message may not exceed this, nor arrive in more pieces. */
const MAX_ASSEMBLED = 3_000_000;
const MAX_PIECES = Math.ceil(MAX_ASSEMBLED / PIECE_CHARS);

let frameSeq = 0;

/** One message as the strings to send — usually exactly one. */
export function encodeFrames(message: HostMsg | GuestMsg): string[] {
  const json = JSON.stringify(message);
  if (json.length <= FRAME_CHARS) return [json];
  const id = `${Date.now().toString(36)}${(frameSeq++).toString(36)}`;
  const n = Math.ceil(json.length / PIECE_CHARS);
  const frames: string[] = [];
  for (let i = 0; i < n; i++) {
    frames.push(JSON.stringify({ t: "piece", id, i, n, d: json.slice(i * PIECE_CHARS, (i + 1) * PIECE_CHARS) }));
  }
  return frames;
}

/**
 * Puts pieces back together. Feed it every string that arrives; it hands back a
 * parsed message when one is complete, and null for pieces and garbage alike.
 */
export class Reassembler {
  private partial = new Map<string, { n: number; got: number; parts: string[] }>();

  accept(raw: string): unknown {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isObj(value) || value.t !== "piece") return value;

    const { id, i, n, d } = value;
    if (!isStr(id, 40) || !isNum(i) || !isNum(n) || !isStr(d, PIECE_CHARS)) return null;
    if (n < 1 || n > MAX_PIECES || i < 0 || i >= n || !Number.isInteger(i)) return null;

    let entry = this.partial.get(id);
    if (!entry) {
      // A peer opening endless half-finished messages would grow this forever.
      if (this.partial.size >= 4) this.partial.delete(this.partial.keys().next().value!);
      entry = { n, got: 0, parts: new Array<string>(n) };
      this.partial.set(id, entry);
    }
    if (entry.n !== n) return null;
    if (entry.parts[i] === undefined) entry.got += 1;
    entry.parts[i] = d;
    if (entry.got < n) return null;

    this.partial.delete(id);
    try {
      return JSON.parse(entry.parts.join(""));
    } catch {
      return null;
    }
  }
}
