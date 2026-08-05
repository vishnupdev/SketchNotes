/**
 * Network-tolerant JSON fetch, shared by every feature that talks to a server.
 *
 * Two things plain `fetch` does badly on a poor connection:
 *  - it hangs indefinitely, so the UI spins forever instead of saying something;
 *  - every failure looks the same, so the UI can't tell "no connection" from
 *    "server said no" and ends up guessing at the message.
 *
 * {@link fetchJson} adds a timeout and classifies failures into a
 * {@link NetError} whose `message` is already user-facing, so callers can show
 * `error.message` directly and branch on `kind` when they want a richer state.
 *
 * Requests still go out while offline: the service worker may answer them from
 * its cache (news headlines, repeated translations). Only after that fails does
 * the offline classification kick in.
 */

import { readNetworkStatus } from "./status";

export type NetErrorKind =
  /** No connection, and nothing cached to serve instead. */
  | "offline"
  /** The request outlived its timeout budget. */
  | "timeout"
  /** The server answered with a non-2xx status. */
  | "http"
  /** A 2xx response that wasn't the JSON we expected. */
  | "bad-response";

export class NetError extends Error {
  readonly kind: NetErrorKind;
  readonly status?: number;

  constructor(kind: NetErrorKind, message: string, status?: number) {
    super(message);
    this.name = "NetError";
    this.kind = kind;
    this.status = status;
  }
}

/** True for a network failure the caller should present as "you're offline". */
export const isOfflineError = (e: unknown): boolean =>
  e instanceof NetError && (e.kind === "offline" || e.kind === "timeout");

/** Long enough for a slow mobile link, short enough to fail visibly. */
export const DEFAULT_TIMEOUT_MS = 12_000;

export interface FetchJsonOptions extends Omit<RequestInit, "signal"> {
  /** Abort after this many ms. Defaults to {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
  /** Caller's abort signal (query cancellation, component unmount). */
  signal?: AbortSignal | null;
  /** Prefix for HTTP/parse error messages, e.g. "News". */
  label?: string;
}

const isAbort = (e: unknown): boolean =>
  e instanceof DOMException ? e.name === "AbortError" : (e as { name?: string })?.name === "AbortError";

/**
 * Fetch JSON with a timeout and classified errors. Rejects with a
 * {@link NetError} on network trouble, or the caller's `AbortError` when their
 * own signal aborted (so query cancellation stays distinguishable).
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, label, ...init } = options;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort, { once: true });

  const what = label ? `${label} request` : "Request";

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });

    if (!res.ok) {
      // Prefer the server's own message when it sent one.
      let message = `${what} failed (${res.status}).`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        /* non-JSON error body — keep the generic message */
      }
      throw new NetError("http", message, res.status);
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new NetError("bad-response", `${what} returned an unreadable response.`);
    }
  } catch (e) {
    if (e instanceof NetError) throw e;

    // The caller cancelled — let their abort propagate untouched.
    if (isAbort(e) && !timedOut) throw e;

    if (timedOut) {
      throw new NetError(
        "timeout",
        readNetworkStatus().online
          ? "The connection is too slow to finish this. Try again when it improves."
          : "You're offline — this needs a connection.",
      );
    }

    throw new NetError(
      "offline",
      readNetworkStatus().online
        ? `Couldn't reach the service. Check your connection and try again.`
        : "You're offline — this needs a connection.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}
