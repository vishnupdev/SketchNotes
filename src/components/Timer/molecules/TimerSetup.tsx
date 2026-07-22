"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";
import { humanDuration, partsToMs } from "@/lib/Timer/format";
import { primeAudio, requestNotify } from "@/lib/Timer/sound";
import { PlusIcon } from "@/components/SketchNotes/atoms/icons";

/** Quick-add presets in milliseconds. */
const PRESETS = [1, 3, 5, 10, 15, 25, 45, 60].map((m) => m * 60_000);

interface TimerSetupProps {
  onAdd: (durationMs: number, label: string) => void;
}

/** Field for one h/m/s unit with wrap-safe clamping. */
function UnitField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.min(max, Math.max(0, Math.floor(Number(e.target.value) || 0)));
          onChange(n);
        }}
        className="h-14 w-[68px] rounded-xl border border-border bg-paper text-center font-mono text-[26px] font-bold tabular-nums outline-none focus:border-accent min-[420px]:w-20"
      />
      <span className="text-[10.5px] font-semibold uppercase tracking-[.14em] text-ink-soft">{label}</span>
    </label>
  );
}

/** Duration composer: h/m/s fields, preset chips, optional label, and Start. */
export function TimerSetup({ onAdd }: TimerSetupProps) {
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);
  const [label, setLabel] = useState("");

  const totalMs = partsToMs(h, m, s);

  const submit = (ms: number, lbl = label) => {
    if (ms <= 0) return;
    primeAudio();
    requestNotify();
    onAdd(ms, lbl);
    setLabel("");
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <div className="flex items-end justify-center gap-2 min-[420px]:gap-3">
        <UnitField label="hours" value={h} max={99} onChange={setH} />
        <span className="pb-6 font-mono text-[24px] font-bold text-ink-soft">:</span>
        <UnitField label="min" value={m} max={59} onChange={setM} />
        <span className="pb-6 font-mono text-[24px] font-bold text-ink-soft">:</span>
        <UnitField label="sec" value={s} max={59} onChange={setS} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {PRESETS.map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() => submit(ms, "")}
            className="tint rounded-full border border-border px-3 py-1.5 font-mono text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            {humanDuration(ms)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5 min-[520px]:flex-row">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(totalMs);
          }}
          placeholder="Label (optional)"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-paper px-3.5 text-[14px] outline-none placeholder:text-ink-soft focus:border-accent"
        />
        <button
          type="button"
          onClick={() => submit(totalMs)}
          disabled={totalMs <= 0}
          className={cx(
            "flex h-11 flex-none items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-white transition-all",
            "hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <PlusIcon size={18} />
          Start timer
        </button>
      </div>
    </div>
  );
}
