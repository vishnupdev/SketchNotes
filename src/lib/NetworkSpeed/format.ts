/** Formatting + grading helpers for the Network Speed test. */

/** Mbps → a compact display string, scaling to Gbps past 1000. */
export function formatSpeed(mbps: number): string {
  if (!Number.isFinite(mbps) || mbps <= 0) return "0";
  if (mbps >= 1000) return (mbps / 1000).toFixed(2);
  if (mbps >= 100) return mbps.toFixed(0);
  if (mbps >= 10) return mbps.toFixed(1);
  return mbps.toFixed(2);
}

/** Unit label that pairs with {@link formatSpeed}. */
export function speedUnit(mbps: number): string {
  return Number.isFinite(mbps) && mbps >= 1000 ? "Gbps" : "Mbps";
}

/** Latency in ms → "12 ms" / "1.2 s". */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`;
}

/**
 * Map a speed (Mbps) to a 0→1 gauge fraction on a log scale so both slow DSL
 * and gigabit fibre land somewhere useful on the dial. Ceiling ≈ 1000 Mbps.
 */
export function speedToFraction(mbps: number): number {
  if (!Number.isFinite(mbps) || mbps <= 0) return 0;
  const f = Math.log10(mbps + 1) / Math.log10(1001);
  return Math.min(1, Math.max(0, f));
}

export interface Grade {
  label: string;
  /** Tailwind text-color utility bound to a theme token. */
  tone: string;
}

/** Qualitative rating for a download/upload speed. */
export function speedGrade(mbps: number): Grade {
  if (mbps <= 0) return { label: "—", tone: "text-ink-soft" };
  if (mbps < 5) return { label: "Poor", tone: "text-prio-high" };
  if (mbps < 25) return { label: "Fair", tone: "text-prio-med" };
  if (mbps < 100) return { label: "Good", tone: "text-success" };
  if (mbps < 300) return { label: "Great", tone: "text-success" };
  return { label: "Excellent", tone: "text-accent" };
}

/** Qualitative rating for latency (lower is better). */
export function pingGrade(ms: number): Grade {
  if (!Number.isFinite(ms) || ms <= 0) return { label: "—", tone: "text-ink-soft" };
  if (ms < 30) return { label: "Excellent", tone: "text-success" };
  if (ms < 60) return { label: "Good", tone: "text-success" };
  if (ms < 120) return { label: "Fair", tone: "text-prio-med" };
  return { label: "High", tone: "text-prio-high" };
}
