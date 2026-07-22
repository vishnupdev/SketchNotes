import { cx } from "@/lib/utils";
import { WifiIcon } from "@/components/SketchNotes/atoms/icons";
import type { ConnectionInfo } from "@/lib/NetworkSpeed/types";

interface ConnectionCardProps {
  connection: ConnectionInfo | null;
}

const EFFECTIVE_LABEL: Record<string, string> = {
  "slow-2g": "Slow 2G",
  "2g": "2G",
  "3g": "3G",
  "4g": "4G / LTE+",
};

/**
 * The browser's own connection hints (Network Information API). Supplementary
 * context — coarse and not measured — shown beside the live test.
 */
export function ConnectionCard({ connection }: ConnectionCardProps) {
  const online = connection?.online ?? true;

  const rows: { label: string; value: string }[] = [];
  if (connection?.effectiveType) {
    rows.push({
      label: "Reported class",
      value: EFFECTIVE_LABEL[connection.effectiveType] ?? connection.effectiveType.toUpperCase(),
    });
  }
  if (connection?.downlink != null) {
    rows.push({ label: "Est. downlink", value: `${connection.downlink} Mbps` });
  }
  if (connection?.rtt != null) {
    rows.push({ label: "Est. latency", value: `${connection.rtt} ms` });
  }
  if (connection?.saveData) {
    rows.push({ label: "Data saver", value: "On" });
  }

  return (
    <div className="rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
          <WifiIcon size={17} />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-bold tracking-[.1px]">Connection</div>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span
              className={cx(
                "inline-block size-2 flex-none rounded-full",
                online ? "bg-success" : "bg-prio-high",
              )}
            />
            {online ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col">
              <dt className="text-[10.5px] uppercase tracking-[.1em] text-ink-soft">{row.label}</dt>
              <dd className="text-[13px] font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-[12px] leading-snug text-ink-soft">
          Your browser doesn&apos;t expose connection hints — run a test for measured figures.
        </p>
      )}
    </div>
  );
}
