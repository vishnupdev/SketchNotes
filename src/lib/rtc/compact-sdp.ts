/**
 * A data-channel session description, cut down to the bytes that matter.
 *
 * A browser's offer for a lone data channel is about a kilobyte of SDP, and
 * nearly all of it is boilerplate every browser writes the same way. What is
 * actually specific to one connection is small:
 *
 *   - the ICE username fragment and password,
 *   - the DTLS certificate fingerprint (32 bytes for SHA-256),
 *   - the DTLS role, the session id and version, the media id,
 *   - the SCTP port and message size,
 *   - each candidate's type, priority, address and port.
 *
 * Packed as bytes that comes to 80–150, against 700–1,000 characters of
 * deflated SDP — a link a third of the length, and a QR code with far fewer,
 * larger modules that a phone reads from across a room.
 *
 * `unpackSdp` writes a *minimal* SDP back from those fields. It is the grammar
 * every browser accepts for a data-channel offer or answer, and the parts that
 * later renegotiation checks against (session id and version, media id, the
 * BUNDLE group) are carried exactly, so adding sound and video over the open
 * channel afterwards works as it would with the original.
 *
 * `packSdp` returns null for anything it cannot represent faithfully — media
 * sections, a second m-line, an unknown hash — and the caller falls back to the
 * plain deflated code. Being smaller is never allowed to cost a connection.
 * TCP and RTCP candidates are left out: with bundling and no TURN relay they
 * add length and never produce a path UDP would not.
 */

const VERSION = 1;

const SETUPS = ["actpass", "active", "passive"] as const;
const TYPES = ["host", "srflx", "prflx", "relay"] as const;
type CandidateType = (typeof TYPES)[number];

/** Address forms: IPv4, IPv6, a browser's mDNS name (a UUID + ".local"), or text. */
const ADDR = { v4: 0, v6: 1, mdns: 2, text: 3 } as const;

const MDNS_RE = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;

interface Candidate {
  type: CandidateType;
  priority: number;
  address: string;
  port: number;
}

interface Fields {
  type: "offer" | "answer";
  setup: (typeof SETUPS)[number];
  ufrag: string;
  pwd: string;
  fingerprint: Uint8Array;
  sessionId: bigint;
  sessionVersion: number;
  mid: string;
  sctpPort: number;
  maxMessageSize: number;
  candidates: Candidate[];
}

/* ------------------------------- bytes out ------------------------------- */

class Writer {
  private bytes: number[] = [];
  u8(v: number) {
    this.bytes.push(v & 0xff);
  }
  u16(v: number) {
    this.u8(v >>> 8);
    this.u8(v);
  }
  u32(v: number) {
    this.u16(v >>> 16);
    this.u16(v & 0xffff);
  }
  u64(v: bigint) {
    this.u32(Number((v >> 32n) & 0xffffffffn));
    this.u32(Number(v & 0xffffffffn));
  }
  raw(b: ArrayLike<number>) {
    for (let i = 0; i < b.length; i++) this.u8(b[i]);
  }
  /** ASCII only — every string carried here is ICE or SDP token text. */
  str(s: string) {
    this.u8(s.length);
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i));
  }
  done(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

class Reader {
  private at = 0;
  constructor(private bytes: Uint8Array) {}
  u8(): number {
    if (this.at >= this.bytes.length) throw new RangeError("short");
    return this.bytes[this.at++];
  }
  u16(): number {
    return (this.u8() << 8) | this.u8();
  }
  u32(): number {
    return ((this.u16() << 16) | this.u16()) >>> 0;
  }
  u64(): bigint {
    return (BigInt(this.u32()) << 32n) | BigInt(this.u32());
  }
  raw(n: number): Uint8Array {
    if (this.at + n > this.bytes.length) throw new RangeError("short");
    const out = this.bytes.slice(this.at, this.at + n);
    this.at += n;
    return out;
  }
  str(): string {
    return String.fromCharCode(...this.raw(this.u8()));
  }
  get finished(): boolean {
    return this.at === this.bytes.length;
  }
}

/* ------------------------------- addresses ------------------------------- */

function parseV4(s: string): number[] | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null;
}

function parseV6(s: string): number[] | null {
  if (!s.includes(":") || /[^0-9a-f:]/i.test(s)) return null;
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return groups.flatMap((g) => {
    const n = parseInt(g, 16);
    return [n >>> 8, n & 0xff];
  });
}

const hex = (b: ArrayLike<number>, from: number, to: number): string =>
  Array.from({ length: to - from }, (_, i) => b[from + i].toString(16).padStart(2, "0")).join("");

function writeAddress(w: Writer, address: string): number {
  const v4 = parseV4(address);
  if (v4) {
    w.raw(v4);
    return ADDR.v4;
  }
  const mdns = MDNS_RE.exec(address);
  if (mdns) {
    const h = mdns.slice(1).join("");
    for (let i = 0; i < 32; i += 2) w.u8(parseInt(h.slice(i, i + 2), 16));
    return ADDR.mdns;
  }
  const v6 = parseV6(address);
  if (v6) {
    w.raw(v6);
    return ADDR.v6;
  }
  w.str(address);
  return ADDR.text;
}

function readAddress(r: Reader, form: number): string {
  if (form === ADDR.v4) return Array.from(r.raw(4)).join(".");
  if (form === ADDR.v6) {
    const b = r.raw(16);
    return Array.from({ length: 8 }, (_, i) => ((b[i * 2] << 8) | b[i * 2 + 1]).toString(16)).join(":");
  }
  if (form === ADDR.mdns) {
    const b = r.raw(16);
    return `${hex(b, 0, 4)}-${hex(b, 4, 6)}-${hex(b, 6, 8)}-${hex(b, 8, 10)}-${hex(b, 10, 16)}.local`;
  }
  return r.str();
}

/* --------------------------------- SDP ---------------------------------- */

const ASCII_TOKEN = /^[\x21-\x7e]{1,255}$/;

/** Read the fields out of an SDP, or null if it holds anything we'd lose. */
function readFields(type: string, sdp: string): Fields | null {
  if (type !== "offer" && type !== "answer") return null;
  const lines = sdp.split(/\r?\n/).filter(Boolean);
  const mLines = lines.filter((l) => l.startsWith("m="));
  if (mLines.length !== 1 || !/^m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel$/.test(mLines[0])) return null;

  const attr = (name: string) => lines.find((l) => l.startsWith(`a=${name}:`))?.slice(name.length + 3).trim();
  const origin = /^o=\S+ (\d+) (\d+) /.exec(lines.find((l) => l.startsWith("o=")) ?? "");
  const fp = /^sha-256 ((?:[0-9A-F]{2}:){31}[0-9A-F]{2})$/i.exec(attr("fingerprint") ?? "");
  const ufrag = attr("ice-ufrag");
  const pwd = attr("ice-pwd");
  const setup = attr("setup") as Fields["setup"] | undefined;
  const mid = attr("mid");
  if (!origin || !fp || !ufrag || !pwd || !setup || !mid) return null;
  if (![ufrag, pwd, mid].every((s) => ASCII_TOKEN.test(s)) || !SETUPS.includes(setup)) return null;

  const sessionId = BigInt(origin[1]);
  const sessionVersion = Number(origin[2]);
  if (sessionId > 0xffffffffffffffffn || !Number.isSafeInteger(sessionVersion) || sessionVersion > 0xffffffff) return null;

  const candidates: Candidate[] = [];
  for (const line of lines) {
    if (!line.startsWith("a=candidate:")) continue;
    const f = line.slice(12).split(" ");
    // foundation component transport priority address port "typ" type …
    if (f.length < 8 || f[6] !== "typ") continue;
    if (f[1] !== "1" || f[2].toLowerCase() !== "udp") continue;
    const type = f[7] as CandidateType;
    const priority = Number(f[3]);
    const port = Number(f[5]);
    if (!TYPES.includes(type) || !Number.isInteger(priority) || priority < 0 || priority > 0xffffffff) continue;
    if (!Number.isInteger(port) || port < 0 || port > 0xffff || !ASCII_TOKEN.test(f[4])) continue;
    candidates.push({ type, priority, address: f[4], port });
  }
  if (!candidates.length || candidates.length > 31) return null;

  const sctpPort = Number(attr("sctp-port") ?? 5000);
  const maxMessageSize = Number(attr("max-message-size") ?? 65536);
  if (!Number.isInteger(sctpPort) || sctpPort > 0xffff || !Number.isInteger(maxMessageSize) || maxMessageSize > 0xffffffff) {
    return null;
  }

  return {
    type,
    setup,
    ufrag,
    pwd,
    fingerprint: Uint8Array.from(fp[1].split(":").map((h) => parseInt(h, 16))),
    sessionId,
    sessionVersion,
    mid,
    sctpPort,
    maxMessageSize,
    candidates,
  };
}

/** Pack a `{type, sdp}` description. Null when it can't be done without loss. */
export function packSdp(description: { type?: string; sdp?: string }): Uint8Array | null {
  const f = readFields(description.type ?? "", description.sdp ?? "");
  if (!f) return null;
  const w = new Writer();
  w.u8(VERSION);
  // type (1 bit) · setup (2 bits) · candidate count (5 bits)
  w.u8((f.type === "answer" ? 0x80 : 0) | (SETUPS.indexOf(f.setup) << 5) | f.candidates.length);
  w.str(f.ufrag);
  w.str(f.pwd);
  w.raw(f.fingerprint);
  w.u64(f.sessionId);
  w.u32(f.sessionVersion);
  w.str(f.mid);
  w.u16(f.sctpPort);
  w.u32(f.maxMessageSize);
  for (const c of f.candidates) {
    const at = new Writer();
    const form = writeAddress(at, c.address);
    w.u8((TYPES.indexOf(c.type) << 2) | form);
    w.u32(c.priority);
    w.u16(c.port);
    w.raw(at.done());
  }
  return w.done();
}

/** Rebuild a `{type, sdp}` description from `packSdp`'s bytes. Throws if they're damaged. */
export function unpackSdp(bytes: Uint8Array): { type: "offer" | "answer"; sdp: string } {
  const r = new Reader(bytes);
  if (r.u8() !== VERSION) throw new RangeError("version");
  const head = r.u8();
  const type = head & 0x80 ? "answer" : "offer";
  const setup = SETUPS[(head >> 5) & 0x3];
  const count = head & 0x1f;
  if (!setup) throw new RangeError("setup");
  const ufrag = r.str();
  const pwd = r.str();
  const fingerprint = Array.from(r.raw(32), (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
  const sessionId = r.u64();
  const sessionVersion = r.u32();
  const mid = r.str();
  const sctpPort = r.u16();
  const maxMessageSize = r.u32();

  const candidates: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const kind = r.u8();
    const ctype = TYPES[kind >> 2];
    if (!ctype) throw new RangeError("candidate");
    const priority = r.u32();
    const port = r.u16();
    candidates.push({ type: ctype, priority, port, address: readAddress(r, kind & 0x3) });
  }
  if (!r.finished) throw new RangeError("trailing");

  return renderSdp({ type, setup, ufrag, pwd, fingerprint, sessionId, sessionVersion, mid, sctpPort, maxMessageSize, candidates });
}

/** The minimal SDP for a set of fields — the one grammar both packed forms unpack to. */
function renderSdp(f: Omit<Fields, "fingerprint"> & { fingerprint: string }): { type: "offer" | "answer"; sdp: string } {
  const candidates = f.candidates.map((c, i) => {
    const related = c.type === "host" ? "" : " raddr 0.0.0.0 rport 0";
    return `a=candidate:${i + 1} 1 udp ${c.priority} ${c.address} ${c.port} typ ${c.type}${related}`;
  });
  const sdp = [
    "v=0",
    `o=- ${f.sessionId} ${f.sessionVersion} IN IP4 127.0.0.1`,
    "s=-",
    "t=0 0",
    `a=group:BUNDLE ${f.mid}`,
    "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 0.0.0.0",
    ...candidates,
    `a=ice-ufrag:${f.ufrag}`,
    `a=ice-pwd:${f.pwd}`,
    `a=fingerprint:sha-256 ${f.fingerprint}`,
    `a=setup:${f.setup}`,
    `a=mid:${f.mid}`,
    `a=sctp-port:${f.sctpPort}`,
    `a=max-message-size:${f.maxMessageSize}`,
    "a=end-of-candidates",
    "",
  ].join("\r\n");
  return { type: f.type, sdp };
}

/* ------------------------------ tight form ------------------------------ */

/*
 * Version 2 — the same fields, spent more carefully. What it drops, and why
 * each is safe:
 *
 *  - **Candidate priorities** (4 bytes each). ICE only needs them to rank this
 *    side's candidates against each other, so they are rebuilt from type and
 *    order (RFC 8445 §5.1.2.1) — the order the browser listed them in, best first.
 *  - **8 bits per ICE character.** The ufrag and password are drawn from the
 *    64-character ice-char set, so each character is 6 bits.
 *  - **The usual values** — media id "0", SCTP port 5000, 256 KB messages, what
 *    Chrome, Edge and Safari always write — become one flag bit.
 *  - **A repeated address.** STUN reports the same public IP once per local
 *    socket; the second and later copies cost nothing.
 *  - **Session version** is almost always a single digit, so it is a varint.
 *
 * A 16-bit CRC rides at the end, inside the bytes, in place of the eight hex
 * digits the text codes carry. The first byte keeps the layout's version, so
 * a later form can still tell these apart.
 */

const TIGHT = 2;
const ICE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const ICE_RE = /^[A-Za-z0-9+/]+$/;
const STD = { mid: "0", sctpPort: 5000, maxMessageSize: 262144 } as const;
/** Candidate address forms for the tight layout — the four above, plus a repeat. */
const REPEAT = 4;
/** RFC 8445 type preferences. */
const TYPE_PREF: Record<CandidateType, number> = { host: 126, prflx: 110, srflx: 100, relay: 0 };
const MAX_TIGHT_CANDIDATES = 15;

const crc16 = (bytes: Uint8Array): number => {
  // CRC-16/CCITT-FALSE: enough to tell a mistyped or truncated code apart.
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
};

/** Pack ICE characters at six bits each. */
function packIce(w: Writer, text: string): void {
  let acc = 0;
  let bits = 0;
  for (const ch of text) {
    acc = (acc << 6) | ICE_CHARS.indexOf(ch);
    bits += 6;
    while (bits >= 8) {
      bits -= 8;
      w.u8(acc >> bits);
      acc &= (1 << bits) - 1;
    }
  }
  if (bits > 0) w.u8(acc << (8 - bits));
}

function unpackIce(r: Reader, length: number): string {
  const bytes = r.raw(Math.ceil((length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let out = "";
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 6 && out.length < length) {
      bits -= 6;
      out += ICE_CHARS[(acc >> bits) & 0x3f];
      acc &= (1 << bits) - 1;
    }
  }
  return out;
}

function writeVarint(w: Writer, n: number): void {
  while (n >= 0x80) {
    w.u8((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  w.u8(n);
}

function readVarint(r: Reader): number {
  let n = 0;
  for (let shift = 0; shift < 35; shift += 7) {
    const b = r.u8();
    n += (b & 0x7f) * 2 ** shift;
    if (!(b & 0x80)) return n;
  }
  throw new RangeError("varint");
}

/** The priority a candidate gets back, from its type and its place in the list. */
const rebuiltPriority = (type: CandidateType, index: number): number =>
  TYPE_PREF[type] * 2 ** 24 + (65535 - index) * 2 ** 8 + 255;

/** The tight form. Null when it can't carry the description exactly. */
export function packTight(description: { type?: string; sdp?: string }): Uint8Array | null {
  const f = readFields(description.type ?? "", description.sdp ?? "");
  if (!f || f.candidates.length > MAX_TIGHT_CANDIDATES) return null;
  if (!ICE_RE.test(f.ufrag) || !ICE_RE.test(f.pwd) || f.ufrag.length > 255 || f.pwd.length > 255) return null;
  const std = f.mid === STD.mid && f.sctpPort === STD.sctpPort && f.maxMessageSize === STD.maxMessageSize;

  const w = new Writer();
  w.u8(TIGHT);
  // type (1) · setup (2) · usual values (1) · candidate count (4)
  w.u8((f.type === "answer" ? 0x80 : 0) | (SETUPS.indexOf(f.setup) << 5) | (std ? 0x10 : 0) | f.candidates.length);
  w.u8(f.ufrag.length);
  w.u8(f.pwd.length);
  packIce(w, f.ufrag + f.pwd);
  w.raw(f.fingerprint);
  w.u64(f.sessionId);
  writeVarint(w, f.sessionVersion);
  if (!std) {
    w.str(f.mid);
    w.u16(f.sctpPort);
    w.u32(f.maxMessageSize);
  }
  // Best first, so the order alone can stand in for the priorities.
  const ranked = [...f.candidates].sort((a, b) => b.priority - a.priority);
  const seen: string[] = [];
  for (const c of ranked) {
    const repeat = seen.indexOf(c.address);
    if (repeat >= 0) {
      // type (2) · form (3), then which earlier address it repeats
      w.u8((TYPES.indexOf(c.type) << 6) | (REPEAT << 3));
      w.u8(repeat);
      w.u16(c.port);
      continue;
    }
    const at = new Writer();
    const form = writeAddress(at, c.address);
    w.u8((TYPES.indexOf(c.type) << 6) | (form << 3));
    w.u16(c.port);
    w.raw(at.done());
    seen.push(c.address);
  }
  const body = w.done();
  const crc = crc16(body);
  return Uint8Array.from([...body, crc >> 8, crc & 0xff]);
}

/** Rebuild a description from `packTight`'s bytes. Throws if they're damaged. */
export function unpackTight(bytes: Uint8Array): { type: "offer" | "answer"; sdp: string } {
  if (bytes.length < 3) throw new RangeError("short");
  const body = bytes.slice(0, -2);
  if (crc16(body) !== ((bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1])) throw new RangeError("crc");

  const r = new Reader(body);
  if (r.u8() !== TIGHT) throw new RangeError("version");
  const head = r.u8();
  const type = head & 0x80 ? "answer" : "offer";
  const setup = SETUPS[(head >> 5) & 0x3];
  if (!setup) throw new RangeError("setup");
  const std = !!(head & 0x10);
  const count = head & 0x0f;
  const ufragLength = r.u8();
  const pwdLength = r.u8();
  const ice = unpackIce(r, ufragLength + pwdLength);
  const fingerprint = Array.from(r.raw(32), (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
  const sessionId = r.u64();
  const sessionVersion = readVarint(r);
  const mid = std ? STD.mid : r.str();
  const sctpPort = std ? STD.sctpPort : r.u16();
  const maxMessageSize = std ? STD.maxMessageSize : r.u32();

  const seen: string[] = [];
  const candidates: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const kind = r.u8();
    const ctype = TYPES[kind >> 6];
    const form = (kind >> 3) & 0x7;
    let address: string;
    let port: number;
    if (form === REPEAT) {
      address = seen[r.u8()];
      if (address === undefined) throw new RangeError("repeat");
      port = r.u16();
    } else {
      if (form > ADDR.text) throw new RangeError("form");
      port = r.u16();
      address = readAddress(r, form);
      seen.push(address);
    }
    candidates.push({ type: ctype, priority: rebuiltPriority(ctype, i), address, port });
  }
  if (!r.finished) throw new RangeError("trailing");

  return renderSdp({
    type,
    setup,
    ufrag: ice.slice(0, ufragLength),
    pwd: ice.slice(ufragLength),
    fingerprint,
    sessionId,
    sessionVersion,
    mid,
    sctpPort,
    maxMessageSize,
    candidates,
  });
}
