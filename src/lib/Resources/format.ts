/**
 * Formatting helpers for the Resource Monitor.
 *
 * Deliberately local to this app rather than shared with System Info: rule 5
 * keeps each app's helpers in its own namespace so a change here can never move
 * another app's numbers.
 */

/** Human-readable byte size (1024-based), e.g. "1.4 MB". */
export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v.toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}

/** 0–100 → "42%". */
export const formatPct = (pct: number): string =>
  `${Math.max(0, Math.min(100, Math.round(pct)))}%`;

/** Share of a total, guarding a zero total. */
export const share = (part: number, total: number): number =>
  total > 0 ? (part / total) * 100 : 0;

/** Elapsed milliseconds as a stopwatch reading — "0:07", "3:41", "1:02:09". */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Byte counts as text, or an em dash when the platform wouldn't say. */
export const bytesOrDash = (bytes: number | null | undefined): string =>
  bytes == null ? "—" : formatBytes(bytes);
