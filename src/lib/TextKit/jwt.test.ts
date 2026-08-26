import { describe, expect, it } from "vitest";
import { decodeJwt } from "./jwt";

/**
 * JWT decoding.
 *
 * The cases that matter are the malformed ones. A token is pasted from somewhere
 * — a log, a browser devtools panel, a colleague's message — so it arrives
 * truncated, with a "Bearer " prefix, or as an unsecured `alg: none` token. Each
 * has to produce a useful answer rather than a blank panel.
 */

/** A token that expired in November 2023. */
const EXPIRED =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJpc3MiOiJhY21lIiwiZXhwIjoxNzAwMDAwMDAwLCJpYXQiOjE2OTkwMDAwMDB9.sig";

/** An unsecured token — no signature at all. */
const UNSECURED = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.sig";

describe("decodeJwt", () => {
  it("decodes the header and payload as formatted JSON", () => {
    const r = decodeJwt(EXPIRED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.header).toContain('"alg": "HS256"');
    expect(r.parts.payload).toContain('"sub": "123"');
    expect(r.parts.signature).toBe("sig");
    expect(r.parts.algorithm).toBe("HS256");
  });

  it("reports an expired token as expired", () => {
    const r = decodeJwt(EXPIRED);
    if (!r.ok) throw new Error("expected a decode");
    expect(r.parts.expiry).not.toBeNull();
    expect(r.parts.expiry?.expired).toBe(true);
    expect(r.parts.expiry?.note).toContain("Expired");
  });

  it("reports a future token as still valid", () => {
    // Built here so the test does not expire with the calendar.
    const future = Math.floor(Date.now() / 1000) + 3600;
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${b64({ alg: "HS256" })}.${b64({ exp: future })}.sig`;

    const r = decodeJwt(token);
    if (!r.ok) throw new Error("expected a decode");
    expect(r.parts.expiry?.expired).toBe(false);
    expect(r.parts.expiry?.note).toContain("Valid until");
  });

  it("flags a token that is not valid yet", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${b64({ alg: "HS256" })}.${b64({ nbf: future })}.sig`;

    const r = decodeJwt(token);
    if (!r.ok) throw new Error("expected a decode");
    expect(r.parts.notYetValid).toContain("Not valid until");
  });

  it("annotates registered claims and renders time claims as dates", () => {
    const r = decodeJwt(EXPIRED);
    if (!r.ok) throw new Error("expected a decode");

    const iss = r.parts.claims.find((c) => c.name === "iss");
    expect(iss?.value).toBe("acme");
    expect(iss?.note).toContain("Issuer");

    const exp = r.parts.claims.find((c) => c.name === "exp");
    // Not the bare epoch number — the point of the annotation.
    expect(exp?.note).toMatch(/ago|in /);
  });

  it("strips a Bearer prefix, which is how tokens are usually pasted", () => {
    expect(decodeJwt(`Bearer ${EXPIRED}`).ok).toBe(true);
    expect(decodeJwt(`bearer   ${EXPIRED}`).ok).toBe(true);
  });

  it("reads an unsecured token and surfaces alg none", () => {
    const r = decodeJwt(UNSECURED);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.algorithm).toBe("none");
  });

  it("accepts a two-segment token", () => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const r = decodeJwt(`${b64({ alg: "none" })}.${b64({ sub: "x" })}`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.signature).toBe("");
  });

  it("says how many parts it found when the count is wrong", () => {
    const r = decodeJwt("only-one-part");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("this has 1");
  });

  it("reports which segment failed rather than failing blankly", () => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    expect(decodeJwt("!!!.eyJhIjoxfQ.sig").ok).toBe(false);

    const badPayload = decodeJwt(`${b64({ alg: "HS256" })}.!!!.sig`);
    expect(badPayload.ok).toBe(false);
    if (badPayload.ok) return;
    expect(badPayload.error).toContain("payload");
  });

  it("reports a segment that decodes but is not JSON", () => {
    const notJson = Buffer.from("hello").toString("base64url");
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const r = decodeJwt(`${b64({ alg: "HS256" })}.${notJson}.sig`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("JSON");
  });

  it("asks for input rather than erroring on empty", () => {
    const r = decodeJwt("   ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("Paste");
  });
});
