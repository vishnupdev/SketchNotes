"use client";

import { useId } from "react";
import { cx } from "@/lib/utils";
import { SwapIcon } from "@/components/SketchNotes/atoms/icons";

export interface RowOption {
  value: string;
  /** What the option reads as in the list, e.g. "km — kilometres". */
  label: string;
}

/**
 * One side of a conversion: a big value and the unit it is in.
 *
 * Used for both the input and the result, and deliberately the *same* component
 * for each — the reason being that a conversion has no natural direction. Typing
 * into either side is the same gesture, so both sides have to look equally
 * editable. The result side simply arrives with `readOnly` and no `onValue`.
 *
 * A native `<select>` rather than a custom listbox: it gets the platform's own
 * picker on a phone (a full-height scroll wheel, type-to-jump), which no
 * hand-rolled dropdown matches, and it is keyboard- and screen-reader-correct
 * with no ARIA of ours (rule #7).
 */
export function ConvertRow({
  label,
  value,
  onValue,
  unit,
  onUnit,
  options,
  hint,
  invalid = false,
  readOnly = false,
  inputMode = "decimal",
}: {
  /** Names the row for assistive tech — "From", "To". */
  label: string;
  value: string;
  onValue?: (value: string) => void;
  unit: string;
  onUnit: (unit: string) => void;
  options: RowOption[];
  /** Small line under the row: the spelled-out unit, or a rate. */
  hint?: string;
  invalid?: boolean;
  readOnly?: boolean;
  inputMode?: "decimal" | "numeric";
}) {
  const id = useId();

  return (
    <div className="rounded-[14px] border border-border bg-panel p-3">
      <label
        htmlFor={`${id}-value`}
        className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
      >
        {label}
      </label>

      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={`${id}-value`}
          type="text"
          inputMode={inputMode}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onValue?.(e.target.value)}
          placeholder="0"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          className={cx(
            "min-w-0 flex-1 rounded-[10px] border-[1.5px] bg-paper px-2.5 py-2 text-[22px] font-bold tabular-nums outline-none",
            invalid
              ? "border-danger text-danger"
              : "border-border text-text focus:border-accent focus:ring-2 focus:ring-accent/25",
            readOnly && "bg-panel",
          )}
        />

        <select
          aria-label={`${label} unit`}
          value={unit}
          onChange={(e) => onUnit(e.target.value)}
          className="max-w-[46%] flex-none rounded-[10px] border border-border bg-paper px-2 py-2.5 text-[12.5px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {hint && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

/**
 * The swap control that sits between the two rows.
 *
 * Its own component because it is absolutely positioned into the gap between
 * them, and getting that overlap right once is better than twice.
 */
export function SwapButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="relative -my-2.5 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="tint grid size-9 place-items-center rounded-full border border-border bg-paper text-ink-soft shadow-panel hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Turned upright, so it reads as "exchange these two stacked rows"
            rather than the left-right swap the glyph is drawn for. */}
        <span className="rotate-90">
          <SwapIcon size={16} />
        </span>
      </button>
    </div>
  );
}
