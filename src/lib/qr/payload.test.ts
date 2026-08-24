import { describe, expect, it } from "vitest";
import { buildPayload, readPayload, safeHref } from "./payload";

/**
 * QR payload formats.
 *
 * Two reasons this is tested rather than eyeballed. First, the formats are a
 * contract with *other people's* scanners — a stray separator or a missing
 * escape produces a code that looks fine here and does nothing on a phone, which
 * is not something a screenshot reveals. Second, `safeHref` is a security
 * boundary: a QR code is a string a stranger printed, and the day it can put a
 * `javascript:` URL behind a button is the day this app becomes a hazard.
 */

describe("buildPayload", () => {
  it("assumes https for a bare link, and leaves a real scheme alone", () => {
    expect(buildPayload("link", { url: "example.com/docs" })).toBe("https://example.com/docs");
    expect(buildPayload("link", { url: "http://example.com" })).toBe("http://example.com");
  });

  it("writes a Wi-Fi code in the format cameras act on", () => {
    expect(buildPayload("wifi", { ssid: "Cafe", password: "hunter2", security: "WPA" })).toBe(
      "WIFI:T:WPA;S:Cafe;P:hunter2;;",
    );
  });

  it("escapes the reserved characters in a network name or password", () => {
    // A password containing ";" would otherwise end the field early and produce
    // a code that joins the wrong network — or no network.
    expect(buildPayload("wifi", { ssid: "A;B", password: "p:1", security: "WPA" })).toBe(
      "WIFI:T:WPA;S:A\\;B;P:p\\:1;;",
    );
  });

  it("omits the password for an open network", () => {
    expect(buildPayload("wifi", { ssid: "Free", password: "ignored", security: "nopass" })).toBe(
      "WIFI:T:nopass;S:Free;;",
    );
  });

  it("builds a mailto with only the parts that were filled in", () => {
    expect(buildPayload("email", { email: "a@b.com" })).toBe("mailto:a@b.com");
    expect(buildPayload("email", { email: "a@b.com", subject: "Hi there" })).toBe(
      "mailto:a@b.com?subject=Hi+there",
    );
  });

  it("strips anything undialable from a number", () => {
    expect(buildPayload("phone", { phone: "+91 (98765) 43210" })).toBe("tel:+919876543210");
    expect(buildPayload("sms", { phone: "555-0100", message: "hello" })).toBe(
      "SMSTO:5550100:hello",
    );
  });

  it("builds a CRLF-delimited vCard", () => {
    const card = buildPayload("contact", { name: "Ada Lovelace", org: "Analytical Engines" });
    expect(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(card).toContain("FN:Ada Lovelace");
    expect(card.endsWith("END:VCARD")).toBe(true);
  });

  it("returns nothing when the essential field is empty", () => {
    expect(buildPayload("wifi", { password: "x" })).toBe("");
    expect(buildPayload("link", { url: "  " })).toBe("");
    expect(buildPayload("geo", { lat: "abc", lon: "1" })).toBe("");
    expect(buildPayload("contact", {})).toBe("");
  });
});

describe("readPayload", () => {
  it("reads back what buildPayload wrote", () => {
    const wifi = readPayload(buildPayload("wifi", { ssid: "A;B", password: "p:1" }));
    expect(wifi.kind).toBe("wifi");
    expect(wifi.fields).toEqual(
      expect.arrayContaining([
        { name: "Network", value: "A;B" },
        { name: "Password", value: "p:1" },
      ]),
    );
  });

  it("recognises every kind it can write", () => {
    expect(readPayload("https://example.com").kind).toBe("link");
    expect(readPayload("mailto:a@b.com").kind).toBe("email");
    expect(readPayload("tel:+15550100").kind).toBe("phone");
    expect(readPayload("SMSTO:5550100:hi").kind).toBe("sms");
    expect(readPayload("geo:10.5,76.2").kind).toBe("geo");
    expect(readPayload("BEGIN:VCARD\r\nFN:Ada\r\nEND:VCARD").kind).toBe("contact");
    expect(readPayload("just some words").kind).toBe("text");
  });

  it("offers an action only for something safe to open", () => {
    expect(readPayload("https://example.com").action?.href).toBe("https://example.com/");
    expect(readPayload("javascript:alert(1)").action).toBeUndefined();
    expect(readPayload("data:text/html,<script>x</script>").action).toBeUndefined();
    // Wi-Fi and plain text have nothing to open.
    expect(readPayload("WIFI:T:WPA;S:x;;").action).toBeUndefined();
    expect(readPayload("hello").action).toBeUndefined();
  });

  it("builds its own map link rather than trusting the code", () => {
    const geo = readPayload("geo:10.5,76.2");
    expect(geo.action?.href.startsWith("https://www.openstreetmap.org/")).toBe(true);
  });

  it("never leaves the label empty", () => {
    expect(readPayload("").label).toBeTruthy();
    expect(readPayload("x".repeat(300)).label.length).toBeLessThan(70);
  });
});

describe("safeHref", () => {
  it("passes the four schemes a scanned code may open", () => {
    expect(safeHref("https://example.com")).toBeTruthy();
    expect(safeHref("http://example.com")).toBeTruthy();
    expect(safeHref("mailto:a@b.com")).toBeTruthy();
    expect(safeHref("tel:+15550100")).toBeTruthy();
  });

  it("refuses everything else", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JavaScript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("file:///etc/passwd")).toBeNull();
    expect(safeHref("not a url")).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});
