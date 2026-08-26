/**
 * Encoders and decoders.
 *
 * base64, URL escaping, HTML entities and JSON string quoting — the four that
 * come up constantly and that people otherwise paste into a stranger's website.
 * Doing it locally is the entire point: the text being encoded is quite often the
 * text you would least like to upload.
 *
 * Every decoder reports failure as a message rather than throwing, because the
 * input is whatever was pasted and "that isn't valid base64" is a useful answer.
 */

export type Codec =
  | "base64"
  | "base64url"
  | "url"
  | "urlComponent"
  | "html"
  | "jsonString"
  | "jwt";

export const CODECS: Array<{ id: Codec; label: string; hint: string }> = [
  { id: "base64", label: "Base64", hint: "Standard, with padding" },
  { id: "base64url", label: "Base64 (URL-safe)", hint: "-_ instead of +/, no padding" },
  { id: "url", label: "URL", hint: "Whole URL — keeps / ? & #" },
  { id: "urlComponent", label: "URL component", hint: "One parameter — escapes everything" },
  { id: "html", label: "HTML entities", hint: "& < > \" '" },
  { id: "jsonString", label: "JSON string", hint: "Quoted, with escapes" },
  { id: "jwt", label: "JWT", hint: "Read a token's header, claims and expiry — decode only" },
];

/**
 * Codecs that only go one way.
 *
 * A JWT is read, never written: minting one requires signing it, which requires a
 * key. The panel hides the direction toggle for these rather than offering an
 * "encode" that could not work.
 */
export const DECODE_ONLY = new Set<Codec>(["jwt"]);

export type CodecResult = { ok: true; text: string } | { ok: false; error: string };

const ok = (text: string): CodecResult => ({ ok: true, text });
const fail = (error: string): CodecResult => ({ ok: false, error });

/** UTF-8 safe base64: `btoa` alone throws on anything outside Latin-1. */
function toBase64(text: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base = btoa(binary);
  return urlSafe ? base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : base;
}

function fromBase64(text: string): CodecResult {
  const cleaned = text.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!cleaned) return ok("");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return fail("That isn't valid base64.");
  try {
    const binary = atob(cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // `fatal` so mis-decoded bytes are reported rather than turned into U+FFFD.
    return ok(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return fail("That decodes to bytes that aren't text.");
  }
}

const HTML_ENTITIES: Array<[RegExp, string]> = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
  [/'/g, "&#39;"],
];

export function encode(text: string, codec: Codec): CodecResult {
  try {
    switch (codec) {
      case "base64":
        return ok(toBase64(text, false));
      case "base64url":
        return ok(toBase64(text, true));
      case "url":
        return ok(encodeURI(text));
      case "urlComponent":
        return ok(encodeURIComponent(text));
      case "html":
        return ok(HTML_ENTITIES.reduce((out, [re, to]) => out.replace(re, to), text));
      case "jsonString":
        return ok(JSON.stringify(text));
      case "jwt":
        // Minting a JWT means signing it, which means a key. Reading one is the
        // useful half and the only half this app can honestly offer.
        return fail("A JWT can only be read here — writing one requires the signing key.");
    }
  } catch {
    return fail("That couldn't be encoded.");
  }
}

export function decode(text: string, codec: Codec): CodecResult {
  try {
    switch (codec) {
      case "base64":
      case "base64url":
        return fromBase64(text);
      case "url":
      case "urlComponent":
        // Both directions of URL escaping are the same operation; a stray "%"
        // is the usual failure and gets a plain answer.
        return ok(decodeURIComponent(text.replace(/\+/g, " ")));
      case "html":
        return ok(
          text
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#0?39;|&apos;/g, "'")
            // Ampersand last, or "&amp;lt;" would decode twice.
            .replace(/&amp;/g, "&"),
        );
      case "jsonString": {
        const parsed = JSON.parse(text.trim());
        if (typeof parsed !== "string") return fail("That JSON isn't a string.");
        return ok(parsed);
      }
      case "jwt":
        // A token's three parts are structured, not one string, so the panel
        // renders `JwtView` instead of a result field. See `lib/TextKit/jwt.ts`.
        return fail("A JWT is shown as its parts rather than as one string.");
    }
  } catch {
    return fail(
      codec === "jsonString"
        ? "That isn't a valid JSON string."
        : "That couldn't be decoded — check for a stray % or a truncated escape.",
    );
  }
}
