"use client";

import { useId } from "react";
import { MinusIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Unit after the number, e.g. "BPM" or "bars". */
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/**
 * A labelled whole-number field with − and + either side. Shared: Metronome's
 * Trainer and Breathe's custom pattern both use it. The buttons are 40px,
 * because these get pressed with a thumb, often mid-exercise.
 */
export function Stepper({ label, value, min, max, suffix, disabled, onChange }: StepperProps) {
  const id = useId();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v))));

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-1.5">
      <label htmlFor={id} className="min-w-0 text-[13px] font-semibold text-ink-soft">
        {label}
      </label>
      <span className="flex flex-none items-center gap-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => set(value - 1)}
          className="grid size-10 place-items-center rounded-[10px] border border-border bg-paper hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <MinusIcon size={16} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && e.target.value !== "") set(n);
          }}
          className="h-10 w-16 rounded-[10px] border border-border bg-paper text-center font-mono text-[14px] font-bold tabular-nums outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() => set(value + 1)}
          className="grid size-10 place-items-center rounded-[10px] border border-border bg-paper hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <PlusIcon size={16} />
        </button>
        {suffix && (
          <span className="w-10 font-mono text-[11px] uppercase tracking-[.08em] text-ink-soft">
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}
