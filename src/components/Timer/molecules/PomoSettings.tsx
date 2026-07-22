"use client";

import type { PomoSettings as Settings } from "@/lib/Timer/types";
import { cx } from "@/lib/utils";

interface PomoSettingsProps {
  settings: Settings;
  disabled?: boolean;
  onChange: (patch: Partial<Settings>) => void;
}

function NumberRow({
  label,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Math.floor(Number(e.target.value) || min))))}
          className="h-9 w-16 rounded-lg border border-border bg-paper text-center font-mono text-[14px] font-bold outline-none focus:border-accent disabled:opacity-50"
        />
        <span className="w-8 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{suffix}</span>
      </span>
    </label>
  );
}

/** Editable pomodoro durations & behaviour. */
export function PomoSettingsForm({ settings, disabled, onChange }: PomoSettingsProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <h3 className="mb-1 text-[14px] font-bold">Settings</h3>
      <p className="mb-2 text-[12px] text-ink-soft">
        {disabled ? "Reset the timer to change durations." : "Tune your focus rhythm."}
      </p>
      <div className="divide-y divide-border">
        <NumberRow label="Focus" value={settings.focusMin} min={1} max={120} suffix="min" disabled={disabled} onChange={(v) => onChange({ focusMin: v })} />
        <NumberRow label="Short break" value={settings.shortMin} min={1} max={60} suffix="min" disabled={disabled} onChange={(v) => onChange({ shortMin: v })} />
        <NumberRow label="Long break" value={settings.longMin} min={1} max={60} suffix="min" disabled={disabled} onChange={(v) => onChange({ longMin: v })} />
        <NumberRow label="Long break every" value={settings.longEvery} min={2} max={12} suffix="sess" disabled={disabled} onChange={(v) => onChange({ longEvery: v })} />
        <label className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-[13px] font-semibold text-ink-soft">Auto-start next phase</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoStart}
            onClick={() => onChange({ autoStart: !settings.autoStart })}
            className={cx(
              "relative h-6 w-11 flex-none rounded-full transition-colors",
              settings.autoStart ? "bg-accent" : "bg-border",
            )}
          >
            <span
              className={cx(
                "absolute top-0.5 size-5 rounded-full bg-panel shadow-panel transition-transform",
                settings.autoStart ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
