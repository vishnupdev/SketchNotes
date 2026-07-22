/**
 * Browser-side network speed engine. Latency, download and upload are measured
 * against Cloudflare's public, CORS-enabled speed endpoints (the same ones
 * powering speed.cloudflare.com) so no backend of our own is required:
 *   • download — GET  /__down?bytes=N  streams N bytes we read and time.
 *   • upload   — POST /__up            accepts a body it measures and discards.
 *   • latency  — a 0-byte download; time-to-first-byte ≈ round-trip time.
 *
 * Throughput is reported as a cumulative average over a steady-state window: an
 * initial warm-up slice is discarded so TCP ramp-up and connection setup don't
 * drag the number down. Everything is cancellable through an AbortSignal.
 */

import type { ConnectionInfo, SpeedResult, SpeedTestCallbacks } from "./types";

const DOWN_URL = "https://speed.cloudflare.com/__down";
const UP_URL = "https://speed.cloudflare.com/__up";

/** Per-phase timing budget and warm-up (ms). */
const PING_SAMPLES = 12;
const DOWN_BUDGET_MS = 9000;
const UP_BUDGET_MS = 9000;
const WARMUP_MS = 1200;
/** Requested per-fetch download payload; large enough to fill the budget. */
const DOWN_CHUNK_BYTES = 100 * 1024 * 1024; // 100 MB
/** Per-request upload payload; looped until the budget is spent. */
const UP_CHUNK_BYTES = 8 * 1024 * 1024; // 8 MB

const bust = () => Math.random().toString(36).slice(2);
const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** Mean absolute difference between consecutive samples (jitter). */
const jitterOf = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < xs.length; i++) sum += Math.abs(xs[i] - xs[i - 1]);
  return sum / (xs.length - 1);
};

/** Read the browser's own connection hints, where exposed. */
export function readConnection(): ConnectionInfo {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  // Network Information API is non-standard / partially supported.
  const c =
    typeof navigator !== "undefined"
      ? ((navigator as unknown as { connection?: Record<string, unknown> }).connection ?? null)
      : null;
  return {
    effectiveType: (c?.effectiveType as string) ?? null,
    downlink: typeof c?.downlink === "number" ? (c.downlink as number) : null,
    rtt: typeof c?.rtt === "number" ? (c.rtt as number) : null,
    saveData: Boolean(c?.saveData),
    online,
  };
}

class AbortError extends Error {
  constructor() {
    super("aborted");
    this.name = "AbortError";
  }
}

/** Latency + jitter from repeated 0-byte round-trips. */
async function measurePing(signal: AbortSignal): Promise<{ ping: number; jitter: number }> {
  const samples: number[] = [];
  for (let i = 0; i < PING_SAMPLES; i++) {
    if (signal.aborted) throw new AbortError();
    const t0 = performance.now();
    const res = await fetch(`${DOWN_URL}?bytes=0&r=${bust()}`, { cache: "no-store", signal });
    await res.arrayBuffer();
    const rtt = performance.now() - t0;
    // Drop the first request — it pays for DNS/TLS/connection setup.
    if (i > 0) samples.push(rtt);
  }
  return { ping: median(samples), jitter: jitterOf(samples) };
}

/** Stream downloads for the budget window, reporting live Mbps. */
async function measureDownload(cb: SpeedTestCallbacks, signal: AbortSignal): Promise<number> {
  const start = performance.now();
  let windowStart = start;
  let windowBytes = 0;
  let mbps = 0;

  while (performance.now() - start < DOWN_BUDGET_MS && !signal.aborted) {
    const res = await fetch(`${DOWN_URL}?bytes=${DOWN_CHUNK_BYTES}&r=${bust()}`, {
      cache: "no-store",
      signal,
    });
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Streaming not supported");

    let stop = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const now = performance.now();
      const elapsed = now - start;
      if (elapsed < WARMUP_MS) {
        // Still warming up: keep sliding the window baseline forward.
        windowStart = now;
        windowBytes = 0;
      } else if (value) {
        windowBytes += value.byteLength;
        const secs = (now - windowStart) / 1000;
        if (secs > 0) {
          mbps = (windowBytes * 8) / (secs * 1e6);
          cb.onDownload(mbps, Math.min(1, elapsed / DOWN_BUDGET_MS));
        }
      }
      if (elapsed >= DOWN_BUDGET_MS) {
        stop = true;
        break;
      }
    }
    await reader.cancel().catch(() => {});
    if (stop) break;
  }
  if (signal.aborted) throw new AbortError();
  cb.onDownload(mbps, 1);
  return mbps;
}

/** POST one payload, streaming upload progress via XHR. Resolves when done. */
function uploadOnce(
  payload: Blob,
  signal: AbortSignal,
  onLoaded: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", onAbort);

    xhr.open("POST", `${UP_URL}?r=${bust()}`);
    xhr.upload.onprogress = (e) => onLoaded(e.loaded);
    xhr.onload = () => {
      cleanup();
      resolve();
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Upload request failed"));
    };
    xhr.onabort = () => {
      cleanup();
      resolve();
    };
    signal.addEventListener("abort", onAbort);
    xhr.send(payload);
  });
}

/** Upload payloads for the budget window, reporting live Mbps. */
async function measureUpload(cb: SpeedTestCallbacks, signal: AbortSignal): Promise<number> {
  // A hard stop bounds a single slow upload from overrunning the budget.
  const ctrl = new AbortController();
  const onParentAbort = () => ctrl.abort();
  signal.addEventListener("abort", onParentAbort);
  const hardStop = setTimeout(() => ctrl.abort(), UP_BUDGET_MS + 1500);

  const payload = new Blob([new Uint8Array(UP_CHUNK_BYTES)]);
  const start = performance.now();
  let windowStart = start;
  let windowBytes = 0;
  let mbps = 0;

  try {
    while (performance.now() - start < UP_BUDGET_MS && !ctrl.signal.aborted) {
      let prevLoaded = 0;
      await uploadOnce(payload, ctrl.signal, (loaded) => {
        const delta = loaded - prevLoaded;
        prevLoaded = loaded;
        const now = performance.now();
        const elapsed = now - start;
        if (elapsed < WARMUP_MS) {
          windowStart = now;
          windowBytes = 0;
        } else {
          windowBytes += delta;
          const secs = (now - windowStart) / 1000;
          if (secs > 0) {
            mbps = (windowBytes * 8) / (secs * 1e6);
            cb.onUpload(mbps, Math.min(1, elapsed / UP_BUDGET_MS));
          }
        }
      });
    }
  } finally {
    clearTimeout(hardStop);
    signal.removeEventListener("abort", onParentAbort);
  }
  if (signal.aborted) throw new AbortError();
  cb.onUpload(mbps, 1);
  return mbps;
}

/** Whether an error is a user/programmatic cancellation. */
export function isAbort(err: unknown): boolean {
  return err instanceof AbortError || (err instanceof DOMException && err.name === "AbortError");
}

/**
 * Run the full sequence: ping → download → upload. Live values arrive through
 * {@link SpeedTestCallbacks}; the resolved {@link SpeedResult} holds the finals.
 * Rejects with an AbortError when `signal` fires (check with {@link isAbort}).
 */
export async function runSpeedTest(
  cb: SpeedTestCallbacks,
  signal: AbortSignal,
): Promise<SpeedResult> {
  cb.onPhase("ping");
  const { ping, jitter } = await measurePing(signal);
  cb.onPing(ping, jitter);

  cb.onPhase("download");
  const download = await measureDownload(cb, signal);

  cb.onPhase("upload");
  const upload = await measureUpload(cb, signal);

  cb.onPhase("done");
  return { ping, jitter, download, upload };
}
