/**
 * Deciding whether the relay is allowed to fetch a URL.
 *
 * This is the security-critical part of the API client. A server-side "fetch any
 * URL for me" endpoint is a **server-side request forgery** hole by default: the
 * browser is bound by the same-origin policy and by the network it sits on, but our
 * server is not. Left open, anyone on the internet could use this deployment to
 * reach things only it can reach — the cloud metadata endpoint that hands out
 * credentials (169.254.169.254), a database on the private network, an admin
 * service on localhost.
 *
 * So the rule is an allowlist of *shapes* and a denylist of *destinations*, applied
 * to the address the hostname actually resolves to — not to the string. Checking
 * the string alone is defeated by a hostname whose DNS record points at 127.0.0.1,
 * which is a published, trivial bypass.
 *
 * Pure functions with no I/O, so the decisions are testable; the DNS lookup lives
 * in the route.
 */

export type BlockReason =
  | "scheme"
  | "malformed"
  | "credentials"
  | "port"
  | "private"
  | "loopback"
  | "metadata";

export const BLOCK_MESSAGES: Record<BlockReason, string> = {
  scheme: "Only http:// and https:// URLs can be sent.",
  malformed: "That is not a URL this can send.",
  credentials:
    "Put credentials in a header rather than in the URL — user:password in a URL is sent in the clear and logged by proxies.",
  port: "That port is not allowed.",
  private:
    "That address is on a private network. The relay runs on a server, so it would be reaching into that server's network rather than yours.",
  loopback:
    "That address is the server itself, not your machine. Requests to localhost cannot be relayed.",
  metadata:
    "That address is a cloud metadata endpoint, which hands out credentials. It is never allowed.",
};

/**
 * Ports the relay will connect to.
 *
 * An allowlist rather than a denylist: the interesting attacks are against
 * services on unusual ports (Redis on 6379, Memcached on 11211, a database on
 * 5432), and enumerating everything worth protecting is a game you lose. HTTP
 * lives on a short list of ports and everything else can be refused.
 */
const ALLOWED_PORTS = new Set([
  "", // the scheme's default
  "80",
  "443",
  "3000",
  "3001",
  "4000",
  "5000",
  "5173",
  "8000",
  "8080",
  "8081",
  "8443",
  "8888",
  "9000",
]);

/** Hostnames that are the local machine by name rather than by address. */
const LOCAL_NAMES = new Set(["localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback"]);

/** The cloud metadata addresses. Blocked by address *and* by their known names. */
const METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

export interface UrlCheck {
  ok: boolean;
  reason?: BlockReason;
  /** The parsed URL, when the shape was acceptable. */
  url?: URL;
}

/**
 * Check a URL's *shape* — everything decidable without a DNS lookup.
 *
 * The hostname still has to be resolved and its address checked afterwards; see
 * {@link isBlockedAddress}. Both halves are required.
 */
export function checkUrlShape(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "scheme" };
  }

  // `user:pass@host` — refused rather than forwarded. It is credentials in a
  // place that gets logged, and it is also a classic parser-confusion trick
  // ("https://trusted.com@evil.com" targets evil.com).
  if (url.username || url.password) return { ok: false, reason: "credentials" };

  if (!ALLOWED_PORTS.has(url.port)) return { ok: false, reason: "port" };

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (METADATA_HOSTS.has(host)) return { ok: false, reason: "metadata" };
  if (LOCAL_NAMES.has(host)) return { ok: false, reason: "loopback" };
  // `.local` is mDNS and `.internal` is a convention for private zones; neither
  // is ever a legitimate target for a public relay.
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return { ok: false, reason: "private" };
  }

  // A literal address in the URL is checked here too, so an obvious attempt is
  // refused before any lookup happens.
  const literal = isBlockedAddress(host);
  if (literal) return { ok: false, reason: literal };

  return { ok: true, url };
}

/**
 * Whether an IP address is one the relay must not connect to.
 *
 * Returns the reason, or null when the address is a fine public one. Handles both
 * families, including the IPv4-mapped IPv6 form (`::ffff:127.0.0.1`) which is the
 * standard way this check gets bypassed when only IPv4 is considered.
 */
export function isBlockedAddress(address: string): BlockReason | null {
  const host = address.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");

  if (METADATA_HOSTS.has(host)) return "metadata";

  // IPv4-mapped and IPv4-compatible IPv6 — unwrap and judge as IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host) ?? /^::(\d+\.\d+\.\d+\.\d+)$/.exec(host);
  if (mapped) return isBlockedAddress(mapped[1]);

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    const octets = [a, b, Number(v4[3]), Number(v4[4])];
    if (octets.some((o) => o > 255)) return "private";

    if (a === 127) return "loopback";
    if (a === 0) return "private"; // "this network"; 0.0.0.0 is also every local address
    if (a === 10) return "private";
    if (a === 172 && b >= 16 && b <= 31) return "private";
    if (a === 192 && b === 168) return "private";
    if (a === 169 && b === 254) return "metadata"; // link-local, incl. the metadata IP
    if (a === 100 && b >= 64 && b <= 127) return "private"; // carrier-grade NAT
    if (a === 192 && b === 0) return "private"; // 192.0.0.0/24 and the 192.0.2.0/24 doc range
    if (a === 198 && (b === 18 || b === 19)) return "private"; // benchmarking
    if (a >= 224) return "private"; // multicast and reserved
    return null;
  }

  if (host.includes(":")) {
    if (host === "::" || host === "::1") return "loopback";
    // fc00::/7 unique-local, fe80::/10 link-local.
    if (/^f[cd]/.test(host)) return "private";
    if (/^fe[89ab]/.test(host)) return "private";
    return null;
  }

  // Not an address at all — a hostname, judged after it resolves.
  return null;
}

/**
 * Headers the relay refuses to forward from the client.
 *
 * Hop-by-hop headers describe *this* connection and must not be copied onto the
 * next one. `host` is the important one: forwarding a caller-chosen Host header is
 * how virtual-host routing gets confused into serving something it should not.
 */
const BLOCKED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  // Set by the platform; a caller-supplied value would be a lie.
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

/** Drop the headers the relay will not forward, keeping the rest. */
export function sanitizeRequestHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawName, value] of Object.entries(headers)) {
    const name = rawName.trim();
    if (!name || BLOCKED_REQUEST_HEADERS.has(name.toLowerCase())) continue;
    // A newline in a header value is request splitting; refuse the value outright
    // rather than trying to clean it.
    if (/[\r\n]/.test(value)) continue;
    if (!/^[\w!#$%&'*+.^`|~-]+$/.test(name)) continue;
    out[name] = value.slice(0, 8192);
  }
  return out;
}

/** Methods the relay will send. */
export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type Method = (typeof METHODS)[number];

export const isMethod = (value: unknown): value is Method =>
  typeof value === "string" && (METHODS as readonly string[]).includes(value.toUpperCase());

/** Methods that never carry a request body. */
export const BODYLESS = new Set<Method>(["GET", "HEAD", "OPTIONS"]);
