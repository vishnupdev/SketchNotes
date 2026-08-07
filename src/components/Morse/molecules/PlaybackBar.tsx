"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";
import { canVibrate } from "@/lib/Morse/audio";
import { TONE_MAX, TONE_MIN, WPM_MAX, WPM_MIN } from "@/lib/Morse/morse-api";
import { useMorseStore } from "@/store/useMorseStore";
import { Beacon } from "@/components/Morse/atoms/Beacon";
import { PauseIcon, SettingsIcon, VolumeIcon } from "@/components/SketchNotes/atoms/icons";

/** An output channel the learner can switch on or off. */
interface ToggleProps {
  label: string;
  on: boolean;
  onToggle: () => void;
}

function OutputToggle({ label, on, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cx(
        "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        on ? "border-accent bg-accent-soft text-accent" : "border-border bg-paper text-ink-soft hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

/**
 * The playback strip shared by every mode: the signal lamp, a summary of the
 * current speed and pitch, and — behind one disclosure — the controls for them.
 * Collapsed by default so the tools stay uncluttered, since the defaults are
 * already the speed and pitch most courses teach at.
 */
export function PlaybackBar() {
  const settings = useMorseStore((s) => s.settings);
  const update = useMorseStore((s) => s.updateSettings);
  const playing = useMorseStore((s) => s.playing);
  const signalOn = useMorseStore((s) => s.signalOn);
  const stop = useMorseStore((s) => s.stop);

  const [open, setOpen] = useState(false);
  const [vibrates, setVibrates] = useState(false);

  // Feature-detect after mount so the toggle only appears where it does something.
  useEffect(() => setVibrates(canVibrate()), []);

  return (
    <section
      aria-label="Playback settings"
      className="rounded-2xl border border-border bg-panel shadow-panel"
    >
      <div className="flex items-center gap-3 p-3">
        <Beacon on={signalOn} active={playing} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
            <VolumeIcon size={15} className="text-accent" />
            <span className="tabular-nums">{settings.wpm} WPM</span>
            <span className="text-ink-soft">·</span>
            <span className="tabular-nums text-ink-soft">{settings.tone} Hz</span>
          </div>
          <p className="truncate text-[11.5px] text-ink-soft">
            {playing ? "Sending…" : `A dit lasts ${Math.round(1200 / settings.wpm)} ms`}
          </p>
        </div>

        {playing && (
          <button
            type="button"
            onClick={stop}
            className="hover-pop inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <PauseIcon size={14} />
            Stop
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="morse-playback-settings"
          aria-label={open ? "Hide playback settings" : "Show playback settings"}
          className={cx(
            "tint hover-pop grid size-9 flex-none place-items-center rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            open ? "text-accent" : "text-ink-soft hover:text-text",
          )}
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {open && (
        <div id="morse-playback-settings" className="space-y-4 border-t border-border px-4 pb-4 pt-3.5">
          <div>
            <label htmlFor="morse-wpm" className="flex items-baseline justify-between text-[12.5px] font-semibold">
              Speed
              <span className="font-mono text-[11.5px] tabular-nums text-ink-soft">
                {settings.wpm} words / min
              </span>
            </label>
            <input
              id="morse-wpm"
              type="range"
              min={WPM_MIN}
              max={WPM_MAX}
              step={1}
              value={settings.wpm}
              onChange={(e) => update({ wpm: Number(e.target.value) })}
              className="mt-1.5 h-6 w-full cursor-pointer accent-accent"
            />
            <p className="text-[11px] text-ink-soft">
              Learn at 10–15. Real traffic runs 20 and up.
            </p>
          </div>

          <div>
            <label htmlFor="morse-tone" className="flex items-baseline justify-between text-[12.5px] font-semibold">
              Pitch
              <span className="font-mono text-[11.5px] tabular-nums text-ink-soft">{settings.tone} Hz</span>
            </label>
            <input
              id="morse-tone"
              type="range"
              min={TONE_MIN}
              max={TONE_MAX}
              step={20}
              value={settings.tone}
              onChange={(e) => update({ tone: Number(e.target.value) })}
              className="mt-1.5 h-6 w-full cursor-pointer accent-accent"
            />
          </div>

          <div>
            <span className="text-[12.5px] font-semibold">Output</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <OutputToggle label="Sound" on={settings.sound} onToggle={() => update({ sound: !settings.sound })} />
              <OutputToggle label="Light" on={settings.light} onToggle={() => update({ light: !settings.light })} />
              {vibrates && (
                <OutputToggle
                  label="Vibrate"
                  on={settings.haptics}
                  onToggle={() => update({ haptics: !settings.haptics })}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
