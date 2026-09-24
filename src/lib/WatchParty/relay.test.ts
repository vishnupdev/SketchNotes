import { describe, expect, it } from "vitest";
import { openReply, publishPacket, readPublish, relayKeyFor, sealReply, takePackets } from "./relay";

/**
 * The relay's pure half. The brokers themselves can only be reached from a
 * real browser; what is checked here is what makes using them safe — both ends
 * derive the same topic and key from the invite alone, nothing else can open a
 * sealed reply, and the MQTT framing survives the way WebSocket frames arrive.
 */

const offer = (ufrag: string, pwd: string) =>
  JSON.stringify({ type: "offer", sdp: `v=0\r\na=ice-ufrag:${ufrag}\r\na=ice-pwd:${pwd}\r\n` });

describe("relayKeyFor", () => {
  it("gives host and guest the same topic from the same invite, and a new one for every invite", async () => {
    const a = await relayKeyFor(offer("aB3x", "Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9"));
    const b = await relayKeyFor(offer("aB3x", "Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9"));
    const c = await relayKeyFor(offer("aB3x", "Zq8VbM2n7Lk4Ty1Wd6Rf0Hs8"));
    expect(a!.topic).toBe(b!.topic);
    expect(a!.topic).not.toBe(c!.topic);
    expect(a!.topic).toMatch(/^oneapp\/wp\/[0-9a-f]{32}$/);
    // The topic must not give the secret away.
    expect(a!.topic).not.toContain("aB3x");
  });

  it("has nothing to derive from a description without ICE credentials", async () => {
    expect(await relayKeyFor(JSON.stringify({ type: "offer", sdp: "v=0\r\n" }))).toBeNull();
    expect(await relayKeyFor("not json")).toBeNull();
  });
});

describe("sealReply / openReply", () => {
  it("opens with the invite's key, and with no other", async () => {
    const mine = (await relayKeyFor(offer("aB3x", "Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9")))!;
    const other = (await relayKeyFor(offer("zzzz", "0000000000000000000000000")))!;
    const sealed = await sealReply(mine.key, { name: "Sunny Koala", code: "OAD3.abc." });
    expect(await openReply(mine.key, sealed)).toEqual({ name: "Sunny Koala", code: "OAD3.abc." });
    expect(await openReply(other.key, sealed)).toBeNull();
  });

  it("refuses a reply that was tampered with, or is too short to be one", async () => {
    const { key } = (await relayKeyFor(offer("aB3x", "Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9")))!;
    const sealed = await sealReply(key, { name: "A", code: "OAD3.x." });
    sealed[sealed.length - 1] ^= 1;
    expect(await openReply(key, sealed)).toBeNull();
    expect(await openReply(key, new Uint8Array(5))).toBeNull();
  });

  it("never seals the same reply to the same bytes twice", async () => {
    const { key } = (await relayKeyFor(offer("aB3x", "Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9")))!;
    const reply = { name: "A", code: "OAD3.x." };
    expect(Array.from(await sealReply(key, reply))).not.toEqual(Array.from(await sealReply(key, reply)));
  });
});

describe("MQTT framing", () => {
  it("reads back a PUBLISH it wrote, retained or not", () => {
    const payload = Uint8Array.from({ length: 300 }, (_, i) => i & 0xff); // > 127: two-byte length
    const bytes = publishPacket("oneapp/wp/abc", payload, true);
    expect(bytes[0]).toBe(0x31);
    const { packets, rest } = takePackets(bytes);
    expect(rest.length).toBe(0);
    const msg = readPublish(packets[0].type, packets[0].body)!;
    expect(msg.topic).toBe("oneapp/wp/abc");
    expect(Array.from(msg.payload)).toEqual(Array.from(payload));
  });

  it("splits packets that arrive glued together, and keeps a half-arrived one for later", () => {
    const one = publishPacket("t/1", Uint8Array.from([1, 2, 3]), false);
    const two = publishPacket("t/2", Uint8Array.from([4, 5]), false);
    const glued = Uint8Array.from([...one, ...two.slice(0, 4)]);
    const first = takePackets(glued);
    expect(first.packets).toHaveLength(1);
    expect(first.rest.length).toBe(4);
    const second = takePackets(Uint8Array.from([...first.rest, ...two.slice(4)]));
    expect(second.packets).toHaveLength(1);
    expect(readPublish(second.packets[0].type, second.packets[0].body)!.topic).toBe("t/2");
  });
});
