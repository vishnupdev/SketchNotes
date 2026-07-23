"use client";

import type { TranslateMode } from "@/lib/Translate/types";
import { cx } from "@/lib/utils";

interface ModeOption {
  value: TranslateMode;
  label: string;
  hint: string;
}

const OPTIONS: ModeOption[] = [
  { value: "auto", label: "Auto", hint: "On-device when ready, otherwise online" },
  { value: "offline", label: "Offline", hint: "Translate on your device, no network" },
  { value: "online", label: "Online", hint: "Translate via the network service" },
];

interface ModeToggleProps {
  value: TranslateMode;
  onChange: (mode: TranslateMode) => void;
  /** Marks Offline as unavailable in this browser (shown as disabled hint). */
  offlineUnsupported?: boolean;
}

/**
 * Segmented control choosing how translations are produced. Implemented as a
 * radiogroup so it's fully keyboard-operable and announces the current choice.
 */
export function ModeToggle({ value, onChange, offlineUnsupported }: ModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Translation mode"
      className="inline-flex rounded-full border border-border bg-panel p-1"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        const disabled = opt.value === "offline" && offlineUnsupported;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={disabled ? "On-device translation isn't available in this browser" : opt.hint}
            onClick={() => onChange(opt.value)}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
