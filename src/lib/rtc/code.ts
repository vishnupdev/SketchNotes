import { checksum32, deflateText, fromBase64Url, inflateText, toBase64Url } from "@/lib/pack";

/**
 * Connection details as something a person can actually carry across.
 *
 * A session description is a kilobyte or three of SDP — unreadable, full of
 * newlines, and impossible to paste reliably into a chat window. This packs one
 * into a single token instead:
 *
 *     OAD1.<checksum>.<enc><base64url payload>.
 *
 * Deflated first (SDP is extremely repetitive, so it shrinks by about two
 * thirds), then base64url so it survives a URL, a message app, a QR code and a
 * copy-paste through anything in between.
 *
 * Two details that look fussy and are not:
 *
 *  - **The trailing dot.** base64url has no `.` in its alphabet, so a full stop
 *    is an unambiguous end marker. That is what lets a code be found inside a
 *    sentence someone typed around it, and — more importantly — lets whitespace
 *    be stripped to repair a code a chat app broke across lines *without* the
 *    next word being glued onto the end.
 *  - **The checksum.** A half-copied code is the single most common failure with
 *    anything this long, and it must read as "that code is incomplete" rather
 *    than as a mysterious connection error.
 *
 * The same token is what goes in an invite *link*, after the `#`. A URL fragment
 * is never sent to the server, so an invite can travel as a link without the
 * connection details ever leaving the two devices and whatever app carried them.
 */

const PREFIX = "OAD1";

/** Prefix, checksum, payload, end marker. */
const CODE_RE = /OAD1\.[0-9a-f]{8}\.[A-Za-z0-9_-]+\./;

/** Turn a description into one pasteable token. */
export async function encodeCode(description: string): Promise<string> {
  const { data, enc } = await deflateText(description);
  const body = enc + toBase64Url(data);
  return `${PREFIX}.${checksum32(body)}.${body}.`;
}

export class CodeError extends Error {}

/**
 * Find our token inside whatever was pasted.
 *
 * Tried twice: once on the text as it arrived, and once with all whitespace
 * removed, which repairs a code that a messaging app wrapped across lines. The
 * end marker is what makes the second attempt safe.
 */
export function extractCode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  return CODE_RE.exec(text)?.[0] ?? CODE_RE.exec(text.replace(/\s+/g, ""))?.[0] ?? null;
}

/** Read a token back, with a reason for every way it can fail. */
export async function decodeCode(raw: string): Promise<string> {
  const token = extractCode(raw);
  if (!token) {
    // Naming the prefix separates "this is the wrong text entirely" from "this
    // is one of ours and it got cut off", which is a far more useful thing to
    // tell someone.
    throw new CodeError(
      raw.includes(PREFIX)
        ? "That code is incomplete — copy the whole thing and try again."
        : "That doesn't look like a connection code.",
    );
  }

  const [, hash, body] = token.slice(0, -1).split(".");
  if (checksum32(body) !== hash) {
    throw new CodeError("That code is damaged — copy it again and retry.");
  }
  const enc = body.slice(0, 1);
  if (enc !== "z" && enc !== "b") throw new CodeError("That code is in a format this can't read.");

  try {
    return await inflateText(fromBase64Url(body.slice(1)), enc);
  } catch {
    throw new CodeError("That code couldn't be unpacked.");
  }
}

/** The invite link for a code — the fragment keeps it off the wire. */
export const inviteLink = (origin: string, path: string, code: string): string =>
  `${origin}${path}#i=${code}`;

/** Read an invite out of a URL fragment, if this load carries one. */
export function inviteFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#i=")) return null;
  return extractCode(hash.slice(3));
}

/** Drop the invite from the address bar once it has been taken up. */
export function clearInviteFromLocation(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash.startsWith("#i=")) return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
