import { describe, expect, it } from "vitest";
import {
  checkUrlShape,
  isBlockedAddress,
  isMethod,
  sanitizeRequestHeaders,
} from "./guard";

/**
 * The relay's guard.
 *
 * This is the one file in the workspace where a missing case is a *vulnerability*
 * rather than a bug: the relay makes requests from the server, so anything it can
 * be talked into fetching is reachable by anyone who can reach the deployment. The
 * cases below are the published SSRF bypasses — decimal-free localhost forms,
 * IPv4-mapped IPv6, credentials-in-URL host confusion, the cloud metadata IP — and
 * each one must be refused.
 */

describe("checkUrlShape", () => {
  it("accepts ordinary public URLs", () => {
    for (const url of [
      "https://api.example.com/v1/things",
      "http://example.com",
      "https://example.com:8443/x?y=1#z",
    ]) {
      expect(checkUrlShape(url).ok, url).toBe(true);
    }
  });

  it("refuses non-HTTP schemes", () => {
    for (const url of ["file:///etc/passwd", "ftp://example.com", "gopher://x", "data:text/plain,x"]) {
      const check = checkUrlShape(url);
      expect(check.ok, url).toBe(false);
      expect(check.reason).toBe("scheme");
    }
  });

  it("refuses a malformed URL", () => {
    expect(checkUrlShape("not a url").reason).toBe("malformed");
    expect(checkUrlShape("").reason).toBe("malformed");
  });

  it("refuses credentials in the URL, which is also host confusion", () => {
    // Reads as trusted.com to a human; targets evil.com.
    const check = checkUrlShape("https://trusted.com@evil.com/x");
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("credentials");
  });

  it("refuses localhost by every name", () => {
    for (const host of ["http://localhost/x", "http://localhost.localdomain/", "http://ip6-localhost/"]) {
      expect(checkUrlShape(host).reason, host).toBe("loopback");
    }
  });

  it("refuses loopback and private literals", () => {
    expect(checkUrlShape("http://127.0.0.1:8080/").reason).toBe("loopback");
    expect(checkUrlShape("http://[::1]/").reason).toBe("loopback");
    expect(checkUrlShape("http://10.0.0.5/").reason).toBe("private");
    expect(checkUrlShape("http://192.168.1.1/").reason).toBe("private");
    expect(checkUrlShape("http://172.16.0.1/").reason).toBe("private");
  });

  it("refuses the cloud metadata endpoint by address and by name", () => {
    expect(checkUrlShape("http://169.254.169.254/latest/meta-data/").reason).toBe("metadata");
    expect(checkUrlShape("http://metadata.google.internal/").reason).toBe("metadata");
  });

  it("refuses internal-looking domain suffixes", () => {
    for (const url of ["http://printer.local/", "http://db.internal/", "http://x.localhost/"]) {
      expect(checkUrlShape(url).reason, url).toBe("private");
    }
  });

  it("refuses ports outside the allowlist", () => {
    // Redis, Memcached, Postgres, SSH — the ports SSRF actually targets.
    for (const port of [22, 25, 6379, 11211, 5432, 27017]) {
      const check = checkUrlShape(`http://example.com:${port}/`);
      expect(check.ok, `port ${port}`).toBe(false);
      expect(check.reason).toBe("port");
    }
  });
});

describe("isBlockedAddress", () => {
  it("passes ordinary public addresses", () => {
    expect(isBlockedAddress("93.184.216.34")).toBeNull();
    expect(isBlockedAddress("8.8.8.8")).toBeNull();
    expect(isBlockedAddress("2606:2800:220:1:248:1893:25c8:1946")).toBeNull();
  });

  it("blocks every IPv4 private and reserved range", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe("loopback");
    expect(isBlockedAddress("127.1.2.3")).toBe("loopback");
    expect(isBlockedAddress("0.0.0.0")).toBe("private");
    expect(isBlockedAddress("10.255.255.255")).toBe("private");
    expect(isBlockedAddress("172.16.0.1")).toBe("private");
    expect(isBlockedAddress("172.31.255.255")).toBe("private");
    expect(isBlockedAddress("192.168.0.1")).toBe("private");
    expect(isBlockedAddress("100.64.0.1")).toBe("private");
    expect(isBlockedAddress("224.0.0.1")).toBe("private");
    expect(isBlockedAddress("169.254.169.254")).toBe("metadata");
  });

  it("does not over-block the neighbours of private ranges", () => {
    // 172.15 and 172.32 are public; only 172.16–172.31 is private.
    expect(isBlockedAddress("172.15.0.1")).toBeNull();
    expect(isBlockedAddress("172.32.0.1")).toBeNull();
    // 192.167 and 192.169 are public.
    expect(isBlockedAddress("192.167.1.1")).toBeNull();
    expect(isBlockedAddress("192.169.1.1")).toBeNull();
    // 100.63 and 100.128 sit outside carrier-grade NAT.
    expect(isBlockedAddress("100.63.0.1")).toBeNull();
    expect(isBlockedAddress("100.128.0.1")).toBeNull();
  });

  it("unwraps IPv4-mapped IPv6, the standard bypass", () => {
    expect(isBlockedAddress("::ffff:127.0.0.1")).toBe("loopback");
    expect(isBlockedAddress("::ffff:169.254.169.254")).toBe("metadata");
    expect(isBlockedAddress("::ffff:10.0.0.1")).toBe("private");
    expect(isBlockedAddress("::127.0.0.1")).toBe("loopback");
  });

  it("blocks IPv6 loopback, unique-local and link-local", () => {
    expect(isBlockedAddress("::1")).toBe("loopback");
    expect(isBlockedAddress("::")).toBe("loopback");
    expect(isBlockedAddress("fc00::1")).toBe("private");
    expect(isBlockedAddress("fd12:3456::1")).toBe("private");
    expect(isBlockedAddress("fe80::1")).toBe("private");
  });

  it("ignores a zone suffix and brackets", () => {
    expect(isBlockedAddress("[::1]")).toBe("loopback");
    expect(isBlockedAddress("fe80::1%eth0")).toBe("private");
  });

  it("rejects an out-of-range dotted quad rather than passing it", () => {
    expect(isBlockedAddress("999.0.0.1")).toBe("private");
  });
});

describe("sanitizeRequestHeaders", () => {
  it("keeps ordinary headers", () => {
    expect(
      sanitizeRequestHeaders({ Authorization: "Bearer x", "Content-Type": "application/json" }),
    ).toEqual({ Authorization: "Bearer x", "Content-Type": "application/json" });
  });

  it("drops hop-by-hop headers and Host", () => {
    const out = sanitizeRequestHeaders({
      Host: "evil.com",
      Connection: "close",
      "Transfer-Encoding": "chunked",
      "Content-Length": "0",
      "X-Forwarded-For": "1.2.3.4",
      Accept: "application/json",
    });
    expect(out).toEqual({ Accept: "application/json" });
  });

  it("drops a value containing a newline, which would split the request", () => {
    const out = sanitizeRequestHeaders({
      "X-Bad": "a\r\nX-Injected: yes",
      "X-Good": "fine",
    });
    expect(out).toEqual({ "X-Good": "fine" });
  });

  it("drops a header name that is not a valid token", () => {
    expect(sanitizeRequestHeaders({ "bad name": "x", "Also:Bad": "x" })).toEqual({});
  });
});

describe("isMethod", () => {
  it("accepts the HTTP methods, in any case", () => {
    expect(isMethod("get")).toBe(true);
    expect(isMethod("PATCH")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isMethod("TRACE")).toBe(false);
    expect(isMethod("CONNECT")).toBe(false);
    expect(isMethod(7)).toBe(false);
  });
});
