/**
 * JWT decoding.
 *
 * The one gap left in Text Kit's codec set, and the one people most often fill by
 * pasting a token into a stranger's website — which is exactly the wrong thing to
 * do with a credential. A JWT is base64url and this app already decodes base64url,
 * but doing it by hand three times and then squinting at epoch seconds is enough
 * friction that nobody does. So this reads the whole thing and answers the question
 * actually being asked: **what is in it, and has it expired.**
 *
 * Decode only, deliberately. Nothing here verifies the signature, and it says so —
 * verification needs the issuer's key, and a tool that *looked* like it verified
 * would be worse than one that plainly does not. A decoded token is untrusted input.
 */

export interface JwtClaim {
  name: string;
  /** The raw value, JSON-encoded for display. */
  value: string;
  /** What a registered claim means, and — for the time claims — when it is. */
  note?: string;
}

export interface JwtParts {
  header: string;
  payload: string;
  /** The third segment as written. Never checked — see above. */
  signature: string;
  claims: JwtClaim[];
  /** Algorithm from the header, when it has one. */
  algorithm: string | null;
  /** Expiry state, when the token carries an `exp`. */
  expiry: { at: number; expired: boolean; note: string } | null;
  /** Set when the token is not yet valid (`nbf` in the future). */
  notYetValid: string | null;
}

export type JwtResult = { ok: true; parts: JwtParts } | { ok: false; error: string };

/** The registered claims, and what each one is for. */
const REGISTERED: Record<string, string> = {
  iss: "Issuer — who minted this token",
  sub: "Subject — who or what the token is about",
  aud: "Audience — who it is intended for",
  exp: "Expires at",
  nbf: "Not valid before",
  iat: "Issued at",
  jti: "Token id, for revocation or replay checks",
  scope: "Granted scopes",
  azp: "Authorised party — the client it was issued to",
  typ: "Token type",
};

/** Claims whose value is seconds since the Unix epoch. */
const TIME_CLAIMS = new Set(["exp", "nbf", "iat", "auth_time", "updated_at"]);

/** Decode one base64url segment to text. */
function decodeSegment(segment: string): string | null {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) return null;
  try {
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const prettyJson = (text: string): string | null => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
};

/** Format an epoch-seconds claim as a readable local time plus how far away it is. */
function describeTime(seconds: number): string {
  const ms = seconds * 1000;
  const when = new Date(ms);
  if (Number.isNaN(when.getTime())) return "not a valid time";

  const delta = ms - Date.now();
  const abs = Math.abs(delta);
  const unit =
    abs < 60_000
      ? `${Math.round(abs / 1000)}s`
      : abs < 3_600_000
        ? `${Math.round(abs / 60_000)}m`
        : abs < 86_400_000
          ? `${Math.round(abs / 3_600_000)}h`
          : `${Math.round(abs / 86_400_000)}d`;

  return `${when.toLocaleString()} — ${delta >= 0 ? `in ${unit}` : `${unit} ago`}`;
}

/**
 * Decode a token.
 *
 * Three dot-separated base64url segments. A two-segment token (an unsecured JWT,
 * `alg: none`) is accepted with an empty signature, because they exist and reading
 * one is exactly when you want to know what it says.
 */
export function decodeJwt(raw: string): JwtResult {
  const token = raw.trim().replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, error: "Paste a JWT above." };

  const segments = token.split(".");
  if (segments.length !== 3 && segments.length !== 2) {
    return {
      ok: false,
      error: `A JWT has three dot-separated parts; this has ${segments.length}.`,
    };
  }

  const headerText = decodeSegment(segments[0]);
  if (headerText === null) return { ok: false, error: "The header isn't valid base64url." };
  const header = prettyJson(headerText);
  if (header === null) return { ok: false, error: "The header doesn't decode to JSON." };

  const payloadText = decodeSegment(segments[1]);
  if (payloadText === null) return { ok: false, error: "The payload isn't valid base64url." };
  const payload = prettyJson(payloadText);
  if (payload === null) return { ok: false, error: "The payload doesn't decode to JSON." };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "The payload doesn't decode to JSON." };
  }

  let algorithm: string | null = null;
  try {
    const h = JSON.parse(headerText) as { alg?: unknown };
    if (typeof h.alg === "string") algorithm = h.alg;
  } catch {
    /* already validated as JSON above */
  }

  const claims: JwtClaim[] = Object.entries(parsed).map(([name, value]) => {
    const timely = TIME_CLAIMS.has(name) && typeof value === "number";
    const registered = REGISTERED[name];
    return {
      name,
      value: typeof value === "string" ? value : JSON.stringify(value),
      note: timely
        ? `${registered ?? "A time claim"}: ${describeTime(value as number)}`
        : registered,
    };
  });

  let expiry: JwtParts["expiry"] = null;
  if (typeof parsed.exp === "number") {
    const at = parsed.exp * 1000;
    const expired = at < Date.now();
    expiry = {
      at,
      expired,
      note: expired
        ? `Expired — ${describeTime(parsed.exp)}`
        : `Valid until ${describeTime(parsed.exp)}`,
    };
  }

  let notYetValid: string | null = null;
  if (typeof parsed.nbf === "number" && parsed.nbf * 1000 > Date.now()) {
    notYetValid = `Not valid until ${describeTime(parsed.nbf)}`;
  }

  return {
    ok: true,
    parts: {
      header,
      payload,
      signature: segments[2] ?? "",
      claims,
      algorithm,
      expiry,
      notYetValid,
    },
  };
}
