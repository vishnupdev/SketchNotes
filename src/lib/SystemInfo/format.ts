/** Formatting helpers for the System Info report. */

/** Human-readable byte size, binary units (KiB→PiB). */
export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v.toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}

/** "yes" / "no" for booleans. */
export const yesNo = (v: boolean): string => (v ? "Yes" : "No");

/** Fallback for missing/unknown values. */
export const orUnknown = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === "") return "Unknown";
  return String(v);
};

/** Milliseconds → compact "1h 20m" / "45m" / "30s". */
export function formatSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0s";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!h && sec) parts.push(`${sec}s`);
  return parts.join(" ") || "0s";
}

/** Render a report as a shareable plain-text document. */
export function reportToText(report: {
  generatedAt: number;
  summary: Record<string, string>;
  sections: { title: string; rows: { label: string; value: string; note?: string }[] }[];
  features: { name: string; supported: boolean }[];
}): string {
  const lines: string[] = [];
  lines.push("SYSTEM REPORT");
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push("");
  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    for (const row of section.rows) {
      lines.push(`  ${row.label}: ${row.value}${row.note ? `  (${row.note})` : ""}`);
    }
    lines.push("");
  }
  lines.push("## Supported capabilities");
  lines.push(`  ${report.features.filter((f) => f.supported).map((f) => f.name).join(", ") || "—"}`);
  lines.push("");
  lines.push("## Unsupported capabilities");
  lines.push(`  ${report.features.filter((f) => !f.supported).map((f) => f.name).join(", ") || "—"}`);
  return lines.join("\n");
}
