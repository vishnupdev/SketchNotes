import { describe, expect, it } from "vitest";
import { CodeError, decodeCode, encodeCode, extractCode, inviteLink } from "./code";

/**
 * Connection codes.
 *
 * These are the one thing a *person* has to carry between two devices, so they
 * get handled the way people actually handle text: pasted with a stray newline,
 * wrapped in a sentence, delivered as a whole URL, or — the common failure —
 * copied halfway. Each of those has a test, because the difference between "that
 * code is incomplete" and an unexplained connection failure is the difference
 * between a user retrying and a user giving up.
 */

/** A description of about the size a real one is, so compression is exercised. */
const description = JSON.stringify({
  type: "offer",
  sdp: [
    "v=0",
    "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
    "s=-",
    "t=0 0",
    "a=group:BUNDLE 0",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 0.0.0.0",
    "a=ice-ufrag:aBc1",
    "a=ice-pwd:0123456789abcdef0123456789",
    "a=fingerprint:sha-256 AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
    "a=setup:actpass",
    "a=mid:0",
    "a=sctp-port:5000",
    ...Array.from(
      { length: 8 },
      (_, i) => `a=candidate:${i} 1 udp 2122260223 192.168.1.${i + 2} 5${i}000 typ host`,
    ),
  ].join("\r\n"),
});

describe("encodeCode / decodeCode", () => {
  it("round-trips a session description", async () => {
    const code = await encodeCode(description);
    expect(await decodeCode(code)).toBe(description);
  });

  it("produces something that can be pasted anywhere", async () => {
    const code = await encodeCode(description);
    expect(code.startsWith("OAD1.")).toBe(true);
    // No whitespace, no characters a URL or a chat app would mangle.
    expect(/^[\w.-]+$/.test(code)).toBe(true);
  });

  it("compresses rather than just re-encoding", async () => {
    const code = await encodeCode(description);
    // SDP is highly repetitive; a code no smaller than the input means the
    // compression step has silently stopped happening.
    expect(code.length).toBeLessThan(description.length);
  });

  it("survives a paste with line breaks and surrounding chatter", async () => {
    const code = await encodeCode(description);
    const messy = `here you go:\n${code.slice(0, 40)}\n${code.slice(40)}\nopen that`;
    expect(await decodeCode(messy)).toBe(description);
  });

  it("reads the code out of a full invite link", async () => {
    const code = await encodeCode(description);
    const link = inviteLink("https://example.com", "/drop", code);
    expect(link).toContain("#i=");
    expect(await decodeCode(link)).toBe(description);
  });

  it("says so when a code was copied halfway", async () => {
    const code = await encodeCode(description);
    // Truncation is the most common real failure and must not look like a
    // network problem.
    await expect(decodeCode(code.slice(0, code.length - 12))).rejects.toThrow(/incomplete/i);
  });

  it("refuses things that aren't codes", async () => {
    await expect(decodeCode("")).rejects.toThrow(CodeError);
    await expect(decodeCode("hello there")).rejects.toThrow(CodeError);
    await expect(decodeCode("https://example.com/drop")).rejects.toThrow(CodeError);
  });
});

describe("extractCode", () => {
  it("finds a code among other text, and nothing when there is none", () => {
    // The trailing dot is the end marker, so neighbouring words cannot leak in.
    expect(extractCode("prefix OAD1.deadbeef.bAAAA. suffix")).toBe("OAD1.deadbeef.bAAAA.");
    expect(extractCode("OAD1.deadbeef.bAAAA")).toBeNull();
    expect(extractCode("no code here")).toBeNull();
    expect(extractCode("   ")).toBeNull();
  });
});
