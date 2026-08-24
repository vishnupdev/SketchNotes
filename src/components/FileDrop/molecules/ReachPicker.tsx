"use client";

import type { ReachMode } from "@/lib/rtc/peer";
import { cx } from "@/lib/utils";

const OPTIONS: Array<{
  id: ReachMode;
  label: string;
  detail: string;
}> = [
  {
    id: "local",
    label: "This network only",
    detail:
      "Both devices on the same Wi-Fi or hotspot. Works with no internet at all, and nothing outside the network is contacted.",
  },
  {
    id: "internet",
    label: "Anywhere",
    detail:
      "Different networks, different countries. Needs internet, and asks a public STUN server what address this device looks like from outside — it never sees the files.",
  },
];

/**
 * How far the connection has to reach.
 *
 * Made an explicit choice rather than a silent default, because the two modes
 * differ in something the user has a right to decide: "this network only"
 * contacts nothing whatsoever, while "anywhere" has to ask a third-party STUN
 * server for this device's public address. The wording says exactly what each one
 * does — and the honest limit of the second is stated where it matters, on the
 * failure message, not buried here.
 */
export function ReachPicker({
  mode,
  onMode,
}: {
  mode: ReachMode;
  onMode: (mode: ReachMode) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        Where is the other device?
      </legend>
      {OPTIONS.map((option) => (
        <label
          key={option.id}
          className={cx(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
            mode === option.id
              ? "border-accent bg-accent-soft"
              : "border-border bg-panel hover:border-accent",
          )}
        >
          <input
            type="radio"
            name="reach"
            value={option.id}
            checked={mode === option.id}
            onChange={() => onMode(option.id)}
            className="mt-0.5 size-4 flex-none accent-accent"
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">{option.label}</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
              {option.detail}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
