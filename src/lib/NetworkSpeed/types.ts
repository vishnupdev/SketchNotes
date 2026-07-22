/** Domain types for the Network Speed test. */

/** Which measurement stage the runner is currently in. */
export type TestPhase = "idle" | "ping" | "download" | "upload" | "done";

/** Overall lifecycle of a test run. */
export type TestStatus = "idle" | "running" | "done" | "error";

/** Browser-reported connection hints (Network Information API). */
export interface ConnectionInfo {
  /** "slow-2g" | "2g" | "3g" | "4g" — the browser's own coarse estimate. */
  effectiveType: string | null;
  /** Estimated downlink in Mbps (rounded by the browser). */
  downlink: number | null;
  /** Estimated round-trip time in ms. */
  rtt: number | null;
  /** Whether the user has requested reduced data usage. */
  saveData: boolean;
  /** navigator.onLine at capture time. */
  online: boolean;
}

/** The four figures a test produces. All speeds are Mbps, latencies ms. */
export interface SpeedResult {
  /** Median round-trip latency (ms). */
  ping: number;
  /** Latency variation between consecutive pings (ms). */
  jitter: number;
  /** Sustained download throughput (Mbps). */
  download: number;
  /** Sustained upload throughput (Mbps). */
  upload: number;
}

/** A completed run, stored in history. */
export interface SpeedRecord extends SpeedResult {
  id: string;
  /** Epoch ms when the run finished. */
  at: number;
  connection: ConnectionInfo | null;
}

/** Live callbacks the engine invokes while a test runs. */
export interface SpeedTestCallbacks {
  onPhase: (phase: TestPhase) => void;
  onPing: (ping: number, jitter: number) => void;
  /** Live download speed (Mbps) and phase progress 0→1. */
  onDownload: (mbps: number, progress: number) => void;
  /** Live upload speed (Mbps) and phase progress 0→1. */
  onUpload: (mbps: number, progress: number) => void;
}
