import type { ReactNode } from "react";

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: string;
}

/** Compact hero figure summarising one headline spec. */
export function StatTile({ icon, label, value }: StatTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-4 shadow-panel">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[10.5px] font-semibold uppercase tracking-[.14em] text-ink-soft">{label}</span>
        <span className="truncate text-[14px] font-bold" title={value}>
          {value}
        </span>
      </span>
    </div>
  );
}
