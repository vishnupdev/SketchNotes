import { cx } from "@/lib/utils";
import type { Stats } from "@/lib/Todos/selectors";

/** Compact completion summary for the framed period, with a progress bar. */
export function StatsBar({ stats, className }: { stats: Stats; className?: string }) {
  const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  const cells: { label: string; value: number; tone: string }[] = [
    { label: "Total", value: stats.total, tone: "text-text" },
    { label: "Active", value: stats.active, tone: "text-accent" },
    { label: "Done", value: stats.done, tone: "text-success" },
    { label: "Overdue", value: stats.overdue, tone: "text-danger" },
  ];

  return (
    <div className={cx("rounded-xl border border-border bg-panel p-3.5", className)}>
      <div className="grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="text-center">
            <div className={cx("text-[20px] font-extrabold leading-none", c.tone)}>{c.value}</div>
            <div className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-ink-soft">
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11.5px] font-semibold text-ink-soft">{pct}%</span>
      </div>
    </div>
  );
}
