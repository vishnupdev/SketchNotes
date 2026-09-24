import { describe, expect, it } from "vitest";
import { packSdp, unpackSdp } from "./compact-sdp";
import { decodeCode, encodeCode, encodeShortCode, extractCode } from "./code";

/**
 * The short connection code. What matters is that everything a browser checks
 * survives the trip — credentials, fingerprint, role, session id, media id and
 * every usable candidate — and that anything the short form can't carry falls
 * back to the ordinary code rather than going out incomplete.
 */

const FP = Array.from({ length: 32 }, (_, i) => ((i * 37 + 11) & 0xff).toString(16).padStart(2, "0").toUpperCase()).join(":");

/** What Chrome writes for a lone data channel: mDNS host, STUN reflexive, IPv6, TCP. */
const chromeOffer = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 0.0.0.0",
  "a=candidate:3296254410 1 udp 2113937151 7c2f5d1a-94be-4c51-9f0e-0b3a6c2d8e41.local 54400 typ host generation 0 network-cost 999",
  "a=candidate:842163049 1 udp 1677729535 203.0.113.77 54400 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999",
  "a=candidate:1 1 udp 2113939711 2001:db8::1f 61000 typ host generation 0",
  "a=candidate:4 1 tcp 1518280447 192.168.1.20 9 typ host tcptype active generation 0",
  "a=ice-ufrag:aB3x",
  "a=ice-pwd:Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9",
  "a=ice-options:trickle",
  `a=fingerprint:sha-256 ${FP}`,
  "a=setup:actpass",
  "a=mid:0",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  "",
].join("\r\n");

/** Firefox's answer: longer credentials, an IPv4 host, setup active. */
const firefoxAnswer = [
  "v=0",
  "o=mozilla...THIS_IS_SDPARTA-99.0 8215430937424937291 0 IN IP4 0.0.0.0",
  "s=-",
  "t=0 0",
  "a=sendrecv",
  `a=fingerprint:sha-256 ${FP}`,
  "a=group:BUNDLE 0",
  "a=ice-options:trickle",
  "a=msid-semantic:WMS *",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 0.0.0.0",
  "a=candidate:0 1 UDP 2122252543 192.168.1.34 50123 typ host",
  "a=sendrecv",
  "a=end-of-candidates",
  "a=ice-pwd:4b0a7a9e2f1d4c6b8e3a5f7d9c1b3e5a",
  "a=ice-ufrag:9c1e4f2a",
  "a=mid:0",
  "a=setup:active",
  "a=sctp-port:5000",
  "a=max-message-size:1073741823",
  "",
].join("\r\n");

const lines = (sdp: string) => sdp.split("\r\n");

describe("packSdp / unpackSdp", () => {
  it("carries everything a browser checks in Chrome's offer", () => {
    const packed = packSdp({ type: "offer", sdp: chromeOffer })!;
    expect(packed).not.toBeNull();
    const { type, sdp } = unpackSdp(packed);
    const out = lines(sdp);
    expect(type).toBe("offer");
    expect(out).toContain("o=- 4611731400430051336 2 IN IP4 127.0.0.1");
    expect(out).toContain("a=group:BUNDLE 0");
    expect(out).toContain("a=ice-ufrag:aB3x");
    expect(out).toContain("a=ice-pwd:Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9");
    expect(out).toContain(`a=fingerprint:sha-256 ${FP}`);
    expect(out).toContain("a=setup:actpass");
    expect(out).toContain("a=mid:0");
    expect(out).toContain("a=sctp-port:5000");
    expect(out).toContain("a=max-message-size:262144");
    expect(out.filter((l) => l.startsWith("a=candidate:"))).toEqual([
      "a=candidate:1 1 udp 2113937151 7c2f5d1a-94be-4c51-9f0e-0b3a6c2d8e41.local 54400 typ host",
      "a=candidate:2 1 udp 1677729535 203.0.113.77 54400 typ srflx raddr 0.0.0.0 rport 0",
      "a=candidate:3 1 udp 2113939711 2001:db8:0:0:0:0:0:1f 61000 typ host",
    ]);
  });

  it("carries Firefox's answer, with its session id and role", () => {
    const { type, sdp } = unpackSdp(packSdp({ type: "answer", sdp: firefoxAnswer })!);
    const out = lines(sdp);
    expect(type).toBe("answer");
    expect(out).toContain("o=- 8215430937424937291 0 IN IP4 127.0.0.1");
    expect(out).toContain("a=setup:active");
    expect(out).toContain("a=ice-ufrag:9c1e4f2a");
    expect(out).toContain("a=ice-pwd:4b0a7a9e2f1d4c6b8e3a5f7d9c1b3e5a");
    expect(out).toContain("a=max-message-size:1073741823");
    expect(out).toContain("a=candidate:1 1 udp 2122252543 192.168.1.34 50123 typ host");
  });

  it("refuses what it can't carry, rather than dropping it", () => {
    const withMedia = chromeOffer.replace("a=group:BUNDLE 0", "a=group:BUNDLE 0 1") + "m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n";
    expect(packSdp({ type: "offer", sdp: withMedia })).toBeNull();
    expect(packSdp({ type: "offer", sdp: chromeOffer.replace("sha-256", "sha-1") })).toBeNull();
    expect(packSdp({ type: "offer", sdp: chromeOffer.replace(/a=candidate:.*\r\n/g, "") })).toBeNull();
    expect(packSdp({ type: "pranswer", sdp: chromeOffer })).toBeNull();
  });

  it("rejects cut-short or padded bytes", () => {
    const packed = packSdp({ type: "offer", sdp: chromeOffer })!;
    expect(() => unpackSdp(packed.slice(0, -3))).toThrow();
    expect(() => unpackSdp(Uint8Array.from([...packed, 0]))).toThrow();
  });
});

describe("encodeShortCode", () => {
  const offer = JSON.stringify({ type: "offer", sdp: chromeOffer });

  it("round-trips through decodeCode and is far shorter than the ordinary code", async () => {
    const short = await encodeShortCode(offer);
    const long = await encodeCode(offer);
    expect(short.startsWith("OAD2.")).toBe(true);
    expect(short.length).toBeLessThan(220);
    expect(short.length * 2).toBeLessThan(long.length);
    const back = JSON.parse(await decodeCode(short)) as { type: string; sdp: string };
    expect(back.type).toBe("offer");
    expect(back.sdp).toContain("a=ice-pwd:Zq8VbM2n7Lk4Ty1Wd6Rf0Hs9");
  });

  it("falls back to the ordinary code for a description it can't pack", async () => {
    const media = JSON.stringify({ type: "offer", sdp: chromeOffer + "m=video 9 UDP/TLS/RTP/SAVPF 96\r\n" });
    const code = await encodeShortCode(media);
    expect(code.startsWith("OAD1.")).toBe(true);
    expect(await decodeCode(code)).toBe(media);
  });

  it("is found inside a link, and says so when it has been damaged", async () => {
    const short = await encodeShortCode(offer);
    expect(extractCode(`https://example.com/watchparty#i=${short}`)).toBe(short);
    const [p, h, body] = short.slice(0, -1).split(".");
    const flipped = `${p}.${h}.${body.slice(0, 10)}${body[10] === "A" ? "B" : "A"}${body.slice(11)}.`;
    await expect(decodeCode(flipped)).rejects.toThrow(/damaged/);
    await expect(decodeCode(short.slice(0, 40))).rejects.toThrow(/incomplete/);
  });
});
