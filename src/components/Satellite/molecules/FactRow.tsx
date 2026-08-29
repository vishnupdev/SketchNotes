"use client";

/**
 * A labelled reading from the device, with an optional note underneath.
 *
 * Deliberately plain: unlike Chrono's rows, nothing here is a value you paste
 * somewhere else — a speed or an accuracy radius is read once and forgotten —
 * so there is no copy button to make room for. What earns its space instead is
 * the note, because half of these fields are routinely *absent* and "Not
 * reported" needs the sentence that says why.
 */
export function FactRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {label}
        </span>
        <span className="font-mono text-[12.5px] tabular-nums text-text">{value}</span>
      </div>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{note}</p>}
    </div>
  );
}
