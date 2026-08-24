/**
 * The Launch Handler API — how an installed PWA receives the files it was
 * launched with (`file_handlers` in the web manifest).
 *
 * Chromium-only, and absent from TypeScript's DOM library, so the handful of
 * members `lib/intake/arrivals.ts` touches are declared here. Optional on
 * `Window` on purpose: every use is feature-detected.
 */

interface LaunchParams {
  /** The URL the app was launched at, when the platform provides one. */
  targetURL?: string;
  /** Handles for the launched files; empty for a plain launch. */
  files?: FileSystemFileHandle[];
}

interface LaunchQueue {
  setConsumer?: (consumer: (params: LaunchParams) => void) => void;
}

interface Window {
  launchQueue?: LaunchQueue;
}
