"use client";

import { cx } from "@/lib/utils";
import type { EngineMode } from "@/lib/Assistant/types";

interface Option {
  value: EngineMode;
  label: string;
  hint: string;
}

const OPTIONS: Option[] = [
  { value: "auto", label: "Auto", hint: "On-device AI when it's ready, otherwise the built-in guide" },
  { value: "device", label: "On-device AI", hint: "Always use the browser's built-in model (may download it first)" },
  { value: "local", label: "Guide", hint: "Always use the bundled feature guide — instant and fully offline" },
];

interface EngineToggleProps {
  value: EngineMode;
  onChange: (mode: EngineMode) => void;
  /** Marks the on-device option unavailable in this browser. */
  deviceUnsupported?: boolean;
}

/**
 * Segmented control choosing which brain answers. A radiogroup so it is
 * keyboard-operable and announces the current choice.
 */
export function EngineToggle({ value, onChange, deviceUnsupported }: EngineToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Answer engine"
      className="inline-flex rounded-full border border-border bg-panel p-1"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        const disabled = opt.value === "device" && deviceUnsupported;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={disabled ? "This browser has no built-in AI model" : opt.hint}
            onClick={() => onChange(opt.value)}
            className={cx(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-accent text-on-accent" : "text-ink-soft hover:text-text",
              disabled && "cursor-not-allowed opacity-40 hover:text-ink-soft",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
