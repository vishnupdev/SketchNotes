import type { SpecRow } from "@/lib/SystemInfo/types";

/** One label → value line inside a spec card. Long values wrap and break. */
export function DetailRow({ row }: { row: SpecRow }) {
  const unknown =
    row.value === "Unknown" || row.value === "No" || row.value.startsWith("Not exposed");
  return (
    <div className="flex flex-col gap-0.5 py-2.5 min-[380px]:flex-row min-[380px]:items-baseline min-[380px]:justify-between min-[380px]:gap-4">
      <span className="flex-none text-[12.5px] font-medium text-ink-soft">{row.label}</span>
      <span className="flex flex-col min-[380px]:items-end min-[380px]:text-right">
        <span
          className={`break-words text-[13.5px] font-semibold tabular-nums ${unknown ? "text-ink-soft" : "text-text"}`}
        >
          {row.value}
        </span>
        {row.note && <span className="text-[11px] italic text-ink-soft">{row.note}</span>}
      </span>
    </div>
  );
}
