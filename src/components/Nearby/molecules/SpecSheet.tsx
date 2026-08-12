import type { SpecGroup } from "@/lib/nearby/discovery";
import { FieldRow } from "@/components/Nearby/atoms/FieldRow";

/**
 * A device's descriptor, rendered group by group: label/value pairs as a
 * definition list, and the list-shaped parts (USB endpoints, HID reports) as
 * monospaced rows beneath them.
 */
export function SpecSheet({ groups }: { groups: SpecGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <section
          key={group.title}
          className="rounded-xl border border-border bg-panel px-3.5 py-3"
        >
          <h4 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[.12em] text-accent">
            {group.title}
          </h4>

          {group.fields.length > 0 && (
            <dl className="flex flex-col">
              {group.fields.map((f) => (
                <FieldRow key={f.label} label={f.label} value={f.value} mono={f.mono} />
              ))}
            </dl>
          )}

          {group.rows && group.rows.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
              {group.rows.map((row, i) => (
                <li
                  key={`${row}-${i}`}
                  className="wrap-break-word font-mono text-[11px] leading-relaxed text-ink-soft"
                >
                  {row}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
