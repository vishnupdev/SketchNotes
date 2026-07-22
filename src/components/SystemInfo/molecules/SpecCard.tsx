import type { SpecSection } from "@/lib/SystemInfo/types";
import { SectionGlyph } from "@/components/SystemInfo/atoms/sectionIcon";
import { DetailRow } from "@/components/SystemInfo/atoms/DetailRow";

/** A titled section card listing all detail rows for one hardware/software area. */
export function SpecCard({ section }: { section: SpecSection }) {
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <header className="mb-1 flex items-center gap-2.5">
        <span className="grid size-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
          <SectionGlyph icon={section.icon} size={18} />
        </span>
        <h3 className="text-[15px] font-bold tracking-tight">{section.title}</h3>
      </header>
      <div className="divide-y divide-border">
        {section.rows.map((row, i) => (
          <DetailRow key={`${row.label}-${i}`} row={row} />
        ))}
      </div>
    </section>
  );
}
