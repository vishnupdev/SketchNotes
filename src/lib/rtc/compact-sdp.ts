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

  const candidates: string[] = [];
  for (let i = 0; i < count; i++) {
    const kind = r.u8();
    const ctype = TYPES[kind >> 2];
    if (!ctype) throw new RangeError("candidate");
    const priority = r.u32();
    const port = r.u16();
    const address = readAddress(r, kind & 0x3);
    const related = ctype === "host" ? "" : " raddr 0.0.0.0 rport 0";
    candidates.push(`a=candidate:${i + 1} 1 udp ${priority} ${address} ${port} typ ${ctype}${related}`);
  }
  if (!r.finished) throw new RangeError("trailing");

  const sdp = [
    "v=0",
    `o=- ${sessionId} ${sessionVersion} IN IP4 127.0.0.1`,
    "s=-",
    "t=0 0",
    `a=group:BUNDLE ${mid}`,
    "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 0.0.0.0",
    ...candidates,
    `a=ice-ufrag:${ufrag}`,
    `a=ice-pwd:${pwd}`,
    `a=fingerprint:sha-256 ${fingerprint}`,
    `a=setup:${setup}`,
    `a=mid:${mid}`,
    `a=sctp-port:${sctpPort}`,
    `a=max-message-size:${maxMessageSize}`,
    "a=end-of-candidates",
    "",
  ].join("\r\n");
  return { type, sdp };
}
