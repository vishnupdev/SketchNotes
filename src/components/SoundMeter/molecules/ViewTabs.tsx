"use client";

import { SpectrumIcon, WaveformIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";
import type { ScopeView } from "@/lib/SoundMeter/types";

interface ViewTabsProps {
  value: ScopeView;
  onChange: (view: ScopeView) => void;
}

const VIEWS: { id: ScopeView; label: string; icon: typeof SpectrumIcon }[] = [
  { id: "spectrum", label: "Spectrum", icon: SpectrumIcon },
  { id: "waveform", label: "Waveform", icon: WaveformIcon },
];

/** Switch the scope between the frequency and time views. */
export function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Visualization"
      className="inline-flex gap-1 rounded-xl border border-border bg-paper p-1"
    >
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cx(
              "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-accent text-on-accent" : "text-ink-soft hover:text-accent",
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
