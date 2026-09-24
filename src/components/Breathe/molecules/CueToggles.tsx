"use client";

import { useEffect, useState } from "react";
import { useBreatheStore } from "@/store/useBreatheStore";
import { canVibrate } from "@/lib/Breathe/cues";

/**
 * Sound and vibration — the cues that let the exercise be done with the eyes
 * closed. Vibration is only offered where the device can do it (phones, not
 * desktops, and not iOS Safari), so the switch never promises nothing.
 */
export function CueToggles() {
  const sound = useBreatheStore((s) => s.sound);
  const volume = useBreatheStore((s) => s.volume);
  const haptics = useBreatheStore((s) => s.haptics);
  const setPrefs = useBreatheStore((s) => s.setPrefs);
  const [vibrates, setVibrates] = useState(false);

  // Read after mount: `navigator` differs between the server render and here.
  useEffect(() => setVibrates(canVibrate()), []);

  return (
    <div className="flex flex-col gap-3">
      <Toggle
        label="Tones"
        detail="A tone that rises as you breathe in and falls as you breathe out"
        on={sound}
        onChange={(on) => setPrefs({ sound: on })}
      />
      {sound && (
        <label className="flex items-center gap-3 text-[12.5px] font-semibold">
          <span className="w-16 flex-none text-ink-soft">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setPrefs({ volume: Number(e.target.value) / 100 })}
            className="h-6 min-w-0 flex-1 cursor-pointer accent-accent"
          />
        </label>
      )}
      {vibrates && (
        <Toggle
          label="Vibrate"
          detail="A buzz as each phase begins — one for in, two for hold, long for out"
          on={haptics}
          onChange={(on) => setPrefs({ haptics: on })}
        />
      )}
    </div>
  );
}

function Toggle({
  label,
  detail,
  on,
  onChange,
}: {
  label: string;
  detail: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-bold">{label}</span>
        <span className="block text-[11.5px] text-ink-soft">{detail}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 flex-none cursor-pointer accent-accent"
      />
    </label>
  );
}
