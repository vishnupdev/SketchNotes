/**
 * Time-based one-time passwords, in the browser.
 *
 * The whole of RFC 4226 (HOTP) and RFC 6238 (TOTP) is a counter, an HMAC and a
 * truncation — `crypto.subtle` supplies the only hard part, so this file has no
 * dependency and runs offline. That matters more here than anywhere else in the
 * workspace: an authenticator that needed a network would be useless at exactly
 * the moment you need it, and a second-factor secret is the last thing that
 * should be sent to a server for a code to be computed.
 *
 * The clock is the one thing this cannot check. A device whose time is wrong by
 * more than a step produces codes that are individually valid and universally
 * rejected, so {@link totp} reports the window it used and the UI says so.
 */

/** Hashes RFC 6238 allows. SHA-1 is the default every issuer actually uses. */
export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export const TOTP_ALGORITHMS: TotpAlgorithm[] = ["SHA-1", "SHA-256", "SHA-512"];

/** One enrolled account, as an `otpauth://` URI describes it. */
export interface TotpConfig {
  /** Account name — usually an email or username. */
  label: string;
  /** Who issued it ("GitHub"), shown above the label. */
  issuer: string;
  /** The shared secret, kept in the base32 form the issuer printed. */
  secret: string;
  digits: number;
  /** Seconds each code is valid for. */
  period: number;
  algorithm: TotpAlgorithm;
}

export const DEFAULT_PERIOD = 30;
export const DEFAULT_DIGITS = 6;

/** RFC 4648 base32, without padding significance. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decode a base32 secret.
 *
 * Issuers print secrets with spaces every four characters, in either case, and
 * sometimes with `=` padding — all three are accepted, because a secret
 * rejected for its formatting looks to the user like a secret that is wrong.
 * A character that is not base32 at all *is* rejected: silently dropping it
 * would produce a shorter key and a plausible stream of codes that never work.
 */
export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (clean === "") throw new Error("The secret is empty.");

  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const char of clean) {
    const index = B32.indexOf(char);
    if (index === -1) throw new Error(`"${char}" is not a base32 character.`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }

  if (out.length === 0) throw new Error("The secret is too short to hold a key.");
  return new Uint8Array(out);
}

/** Encode bytes as base32 — used to print a secret this app generated. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** True if the string can be read as a base32 secret. */
export function isBase32(input: string): boolean {
  try {
    base32Decode(input);
    return true;
  } catch {
    return false;
  }
}

/** HMAC of an 8-byte big-endian counter — RFC 4226 §5.1. */
async function hmacCounter(
  key: Uint8Array,
  counter: number,
  algorithm: TotpAlgorithm,
): Promise<Uint8Array> {
  const block = new Uint8Array(8);
  // Written as two 32-bit halves: a counter past 2^53 is not reachable in any
  // lifetime of 30-second steps, and bitwise maths on the low half is exact.
  const high = Math.floor(counter / 0x1_0000_0000);
  const low = counter % 0x1_0000_0000;
  new DataView(block.buffer).setUint32(0, high);
  new DataView(block.buffer).setUint32(4, low);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, block as unknown as ArrayBuffer);
  return new Uint8Array(mac);
}

/** Dynamic truncation, then the low `digits` decimal places — RFC 4226 §5.3. */
function truncate(mac: Uint8Array, digits: number): string {
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** One HOTP code for an explicit counter. */
export async function hotp(
  secret: string,
  counter: number,
  digits = DEFAULT_DIGITS,
  algorithm: TotpAlgorithm = "SHA-1",
): Promise<string> {
  return truncate(await hmacCounter(base32Decode(secret), counter, algorithm), digits);
}

/** A code, plus everything needed to show its life without a second clock read. */
export interface TotpCode {
  code: string;
  /** Which time step it belongs to — the counter HOTP was given. */
  counter: number;
  /** Whole seconds until it is replaced. */
  secondsLeft: number;
  /** 0 → just issued, 1 → about to expire. Drives the countdown ring. */
  progress: number;
}

/**
 * The code for a moment in time. `at` is milliseconds, defaulting to now, and
 * is a parameter chiefly so the tests can stand on the RFC 6238 vectors.
 */
export async function totp(
  config: Pick<TotpConfig, "secret"> & Partial<TotpConfig>,
  at: number = Date.now(),
): Promise<TotpCode> {
  const period = config.period && config.period > 0 ? config.period : DEFAULT_PERIOD;
  const digits = config.digits && config.digits > 0 ? config.digits : DEFAULT_DIGITS;
  const seconds = Math.floor(at / 1000);
  const counter = Math.floor(seconds / period);
  const elapsed = seconds % period;

  return {
    code: await hotp(config.secret, counter, digits, config.algorithm ?? "SHA-1"),
    counter,
    secondsLeft: period - elapsed,
    progress: elapsed / period,
  };
}

/** Group a code for reading aloud: 6 digits as 3+3, 8 as 4+4. */
export function groupCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return code.length <= 4 ? code : `${code.slice(0, half)} ${code.slice(half)}`;
}

/**
 * Read an `otpauth://totp/...` URI — what every enrolment QR code contains, and
 * therefore what the camera hands this app.
 *
 * `hotp://` counter-based URIs are rejected rather than coerced: their codes
 * only advance when used, so treating one as time-based would produce a code
 * that is wrong every single time.
 */
export function parseOtpauth(uri: string): TotpConfig {
  const trimmed = uri.trim();
  if (!/^otpauth:\/\//i.test(trimmed)) throw new Error("Not an otpauth:// address.");

  const url = new URL(trimmed);
  const type = url.host.toLowerCase();
  if (type === "hotp") throw new Error("That is a counter-based (HOTP) code, which this cannot keep.");
  if (type !== "totp") throw new Error(`Unsupported code type "${type}".`);

  const secret = url.searchParams.get("secret") ?? "";
  if (!isBase32(secret)) throw new Error("The address carries no readable secret.");

  // The path is "/Issuer:account" or just "/account"; the issuer parameter wins
  // when both are present, which is what the Key Uri Format specifies.
  const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const colon = path.indexOf(":");
  const pathIssuer = colon > 0 ? path.slice(0, colon) : "";
  const label = colon > 0 ? path.slice(colon + 1).trim() : path.trim();

  const rawAlgorithm = (url.searchParams.get("algorithm") ?? "SHA1").toUpperCase();
  const algorithm = (TOTP_ALGORITHMS.find((a) => a.replace("-", "") === rawAlgorithm) ??
    "SHA-1") as TotpAlgorithm;

  const digits = Number(url.searchParams.get("digits") ?? DEFAULT_DIGITS);
  const period = Number(url.searchParams.get("period") ?? DEFAULT_PERIOD);

  return {
    label: label || "Account",
    issuer: (url.searchParams.get("issuer") ?? pathIssuer).trim(),
    secret: secret.replace(/[\s-]/g, "").toUpperCase(),
    digits: digits === 8 ? 8 : digits === 7 ? 7 : DEFAULT_DIGITS,
    period: Number.isFinite(period) && period >= 10 && period <= 300 ? period : DEFAULT_PERIOD,
    algorithm,
  };
}

/** The inverse — so an account kept here can be moved to another authenticator. */
export function toOtpauth(config: TotpConfig): string {
  const label = config.issuer ? `${config.issuer}:${config.label}` : config.label;
  const params = new URLSearchParams({ secret: config.secret });
  if (config.issuer) params.set("issuer", config.issuer);
  if (config.algorithm !== "SHA-1") params.set("algorithm", config.algorithm.replace("-", ""));
  if (config.digits !== DEFAULT_DIGITS) params.set("digits", String(config.digits));
  if (config.period !== DEFAULT_PERIOD) params.set("period", String(config.period));
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
