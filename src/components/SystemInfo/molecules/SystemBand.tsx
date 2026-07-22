import type { SpecSection } from "@/lib/SystemInfo/types";
import { SectionGlyph } from "@/components/SystemInfo/atoms/sectionIcon";

/**
 * Full-width "System Information" band — the major hardware specs (RAM, storage,
 * processor, GPU, …) laid out as a compact multi-column grid. Sits between the
 * headline tiles and the detailed spec cards. Values the browser can't read are
 * rendered muted with an explanatory note (see {@link cleanGpuName} / collector).
 */
export function SystemBand({ section }: { section: SpecSection }) {
  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="grid size-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
          <SectionGlyph icon={section.icon} size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight">System Information</h3>
          <p className="text-[11.5px] text-ink-soft">Major hardware specs this device reports.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4 min-[560px]:grid-cols-3 min-[900px]:grid-cols-4">
        {section.rows.map((row, i) => {
          const na = row.value.startsWith("Not exposed");
          return (
            <div key={`${row.label}-${i}`} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-ink-soft">
                {row.label}
              </span>
              <span
                className={`break-words text-[14px] font-bold leading-tight tabular-nums ${na ? "text-ink-soft" : "text-text"}`}
                title={row.value}
              >
                {row.value}
              </span>
              {row.note && (
                <span className="text-[10.5px] italic leading-snug text-ink-soft">{row.note}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
