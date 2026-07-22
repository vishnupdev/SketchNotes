/** Domain types for the System Info analyzer. */

/** Icon key mapping to the shared icon set (resolved in the UI layer). */
export type SectionIcon =
  | "hardware"
  | "os"
  | "browser"
  | "cpu"
  | "memory"
  | "gpu"
  | "display"
  | "battery"
  | "network"
  | "storage"
  | "locale"
  | "media";

/** One label → value detail line. */
export interface SpecRow {
  label: string;
  value: string;
  /** Optional clarifying note (e.g. "approximate", "browser-reported"). */
  note?: string;
}

/** A titled group of related detail rows. */
export interface SpecSection {
  id: string;
  title: string;
  icon: SectionIcon;
  rows: SpecRow[];
}

/** A single web-platform capability probe. */
export interface FeatureFlag {
  name: string;
  supported: boolean;
}

/** Compact figures shown as hero tiles above the detailed sections. */
export interface SystemSummary {
  os: string;
  browser: string;
  cpu: string;
  memory: string;
  graphics: string;
  display: string;
}

/** The full analysis produced by {@link collectSystemInfo}. */
export interface SystemReport {
  generatedAt: number;
  summary: SystemSummary;
  sections: SpecSection[];
  features: FeatureFlag[];
}
