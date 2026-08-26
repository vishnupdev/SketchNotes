import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import {
  BLOCK_MESSAGES,
  BODYLESS,
  checkUrlShape,
  isBlockedAddress,
  isMethod,
  sanitizeRequestHeaders,
  type Method,
} from "@/lib/Api/guard";

/**
 * The API client's relay.
 *
 * A browser cannot call an arbitrary API from a page — the same-origin policy stops
 * it unless the target opts in with CORS headers, and most APIs do not. So the
 * request is made from the server instead. That is the only way an in-browser API
 * client can work, and it is also the single most dangerous endpoint in this
 * workspace, so it is worth being explicit about the defences:
 *
 *  1. **Shape.** http/https only, no credentials in the URL, a port allowlist, no
 *     internal-looking hostnames. See `lib/Api/guard.ts`.
 *  2. **Address.** The hostname is resolved and *every* address it resolves to is
 *     checked against the private, loopback, link-local and metadata ranges. This
 *     is the check that matters: a public hostname with an A record pointing at
 *     127.0.0.1 passes any string-based test.
 *  3. **No redirect following.** A 3xx is returned to the client as the result
 *     rather than followed, because following one would jump to a URL that never
 *     went through checks 1 and 2. The client shows the `Location` and lets the
 *     user send it deliberately.
 *  4. **Caps.** A timeout, a response size limit, and hop-by-hop request headers
 *     stripped so nothing can smuggle a second request through.
 *
 * Residual risk, stated rather than hidden: between the lookup in step 2 and the
 * connection, DNS could change what the name points at (a rebinding attack). Fully
 * closing that needs pinning the connection to the checked address, which Node's
 * `fetch` gives no hook for and which breaks TLS certificate validation for https.
 * The window is small and the port allowlist limits what is reachable through it.
 * If this deployment ever sits inside a private network with something sensitive on
 * an allowlisted port, the relay should be disabled rather than relied on.
 */

// Never cached and never statically evaluated: every call is a distinct request
// on the user's behalf.
export const dynamic = "force-dynamic";

/** Longer than a slow API, short enough that a hung target frees the worker. */
const TIMEOUT_MS = 20_000;

/** Response body cap. Past this the body is truncated and the client told so. */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Request body cap. */
const MAX_REQUEST_BYTES = 1024 * 1024;

interface RelayRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface RelayResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  /** True when the body hit {@link MAX_BODY_BYTES} and was cut short. */
  truncated: boolean;
  /** Round trip in milliseconds, measured at the server. */
  timeMs: number;
  /** Body size in bytes, before truncation. */
  bytes: number;
  /** Set when the response was a redirect, which the relay does not follow. */
  redirectedTo?: string;
}

export async function POST(request: Request) {
  let payload: RelayRequest;
  try {
    payload = (await request.json()) as RelayRequest;
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
  }

  const method = (payload.method ?? "GET").toUpperCase();
  if (!isMethod(method)) {
    return NextResponse.json({ error: `${method} is not a method this can send.` }, { status: 400 });
  }

  const check = checkUrlShape(payload.url ?? "");
  if (!check.ok || !check.url) {
    return NextResponse.json(
      { error: BLOCK_MESSAGES[check.reason ?? "malformed"] },
      { status: 400 },
    );
  }
  const target = check.url;

  // Step 2: resolve, and judge every address the name gives back. `all: true`
  // matters — a name with one public and one private address must be refused.
  try {
    const addresses = await lookup(target.hostname, { all: true, verbatim: true });
    for (const { address } of addresses) {
      const blocked = isBlockedAddress(address);
      if (blocked) {
        return NextResponse.json({ error: BLOCK_MESSAGES[blocked] }, { status: 400 });
      }
    }
    if (addresses.length === 0) {
      return NextResponse.json({ error: "That hostname does not resolve." }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { error: `${target.hostname} could not be resolved.` },
      { status: 400 },
    );
  }

  const headers = sanitizeRequestHeaders(payload.headers ?? {});

  let body: string | undefined;
  if (!BODYLESS.has(method as Method) && typeof payload.body === "string" && payload.body !== "") {
    if (Buffer.byteLength(payload.body, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "That request body is too large to relay." }, { status: 413 });
    }
    body = payload.body;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      body,
      // Step 3 — see the module comment.
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
    });

    const timeMs = Date.now() - startedAt;

    // Read as bytes so the cap is a real byte cap, then decode. Decoding first
      // and slicing the string would let a 50 MB response through before the cut.
    const buffer = await upstream.arrayBuffer();
    const bytes = buffer.byteLength;
    const truncated = bytes > MAX_BODY_BYTES;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      truncated ? buffer.slice(0, MAX_BODY_BYTES) : buffer,
    );

    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, name) => {
      // `set-cookie` is deliberately dropped. Handing the caller another origin's
      // cookies through our server is not something a request-inspection tool
      // needs to do, and it is a credential.
      if (name.toLowerCase() === "set-cookie") return;
      responseHeaders[name] = value;
    });

    const result: RelayResponse = {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
      body: text,
      truncated,
      timeMs,
      bytes,
    };

    const location = upstream.headers.get("location");
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      // Resolved against the request URL, so a relative Location is usable.
      try {
        result.redirectedTo = new URL(location, target).toString();
      } catch {
        result.redirectedTo = location;
      }
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const aborted = (err as { name?: string } | null)?.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? `The request took longer than ${TIMEOUT_MS / 1000} seconds and was given up on.`
          : "The request could not be completed. The host may be unreachable.",
      },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
