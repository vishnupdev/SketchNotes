"use client";

import { ChipBar } from "@/components/SketchNotes/molecules/ChipBar";
import { BeatStrip } from "@/components/Metronome/molecules/BeatStrip";
import { Transport } from "@/components/Metronome/molecules/Transport";
import { useMetronomeStore } from "@/store/useMetronomeStore";
import { CLICK_SOUNDS, type ClickSound } from "@/lib/Metronome/engine";
import {
  BPM_MAX,
  BPM_MIN,
  METERS,
  meterLabel,
  SUBDIVISIONS,
  tempoMarking,
  type Subdivision,
} from "@/lib/Metronome/rhythm";
import { SUBDIVISION_LABELS } from "@/lib/Metronome/settings";

const METER_CHIPS = METERS.map((meter) => ({
  id: meterLabel(meter),
  label: meterLabel(meter),
  hint:
    meter.unit === 8
      ? `${meterLabel(meter)} — the tempo counts eighth notes, grouped as they are felt`
      : `${meterLabel(meter)} — ${meter.beats} beat${meter.beats === 1 ? "" : "s"} to the bar`,
}));

const SUB_CHIPS = SUBDIVISIONS.map((sub) => ({
  id: String(sub) as `${Subdivision}`,
  label: SUBDIVISION_LABELS[sub].label,
  hint: SUBDIVISION_LABELS[sub].hint,
}));

const NUDGES = [-5, -1, 1, 5];

/**
 * The metronome proper: the tempo, the bar, and how it sounds.
 */
export function BeatPanel() {
  const settings = useMetronomeStore((s) => s.settings);
  const playing = useMetronomeStore((s) => s.playing);
  const position = useMetronomeStore((s) => s.position);
  const update = useMetronomeStore((s) => s.update);
  const setBpm = useMetronomeStore((s) => s.setBpm);
  const nudge = useMetronomeStore((s) => s.nudge);
  const setMeter = useMetronomeStore((s) => s.setMeter);
  const resetAccents = useMetronomeStore((s) => s.resetAccents);

  // With a ramp running, the tempo on screen is the one being played, not the
  // one on the slider — otherwise the readout would sit still while the
  // click visibly sped up.
  const ramping = playing && settings.rampOn && position !== null;
  const shown = ramping ? position.bpm : settings.bpm;

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Tempo"
        className="rounded-[14px] border border-border bg-panel p-4"
      >
        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0">
            <output
              htmlFor="metronome-bpm"
              aria-live="off"
              className="block text-[64px] font-extrabold leading-none tracking-tight tabular-nums"
            >
              {shown}
            </output>
            <span className="font-mono text-[11px] uppercase tracking-[.14em] text-ink-soft">
              BPM · {tempoMarking(shown)}
              {ramping && " · ramp"}
            </span>
          </p>
          {position && (
            <p className="flex-none text-right font-mono text-[11px] uppercase tracking-[.1em] text-ink-soft">
              Bar {position.bar + 1}
              <br />
              {position.audible ? `Beat ${position.beat + 1}` : "Silent"}
            </p>
          )}
        </div>

        <input
          id="metronome-bpm"
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          step={1}
          value={settings.bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label="Tempo in beats per minute"
          aria-valuetext={`${settings.bpm} BPM, ${tempoMarking(settings.bpm)}`}
          className="mt-3 h-8 w-full cursor-pointer accent-accent"
        />

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {NUDGES.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => nudge(delta)}
              aria-label={`${delta > 0 ? "Faster" : "Slower"} by ${Math.abs(delta)} BPM`}
              className="h-11 rounded-[10px] border border-border bg-paper font-mono text-[14px] font-bold tabular-nums hover:border-accent hover:text-accent"
            >
              {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
            </button>
          ))}
        </div>
      </section>

      <Transport />

      <section aria-labelledby="metronome-bar-heading" className="rounded-[14px] border border-border bg-panel p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="metronome-bar-heading" className="text-[13.5px] font-bold">
            The bar
          </h2>
          <button
            type="button"
            onClick={resetAccents}
            className="rounded-full px-2 py-1 font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft hover:text-accent"
          >
            Reset accents
          </button>
        </div>

        <ChipBar
          label="Time signature"
          items={METER_CHIPS}
          value={meterLabel(settings.meter)}
          onChange={(id) => {
            const meter = METERS.find((m) => meterLabel(m) === id);
            if (meter) setMeter(meter);
          }}
          className="-mx-4 px-4"
        />

        <div className="mt-3">
          <BeatStrip />
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          Press a beat to step it through strong, medium, soft and silent. A silent beat still
          counts — mute beats two and four to hear only the downbeats, or everything but one to
          feel a whole bar on your own.
        </p>
      </section>

      <section aria-labelledby="metronome-sound-heading" className="rounded-[14px] border border-border bg-panel p-4">
        <h2 id="metronome-sound-heading" className="mb-3 text-[13.5px] font-bold">
          Subdivision and sound
        </h2>
        <ChipBar
          label="Subdivision"
          items={SUB_CHIPS}
          value={String(settings.subdivision) as `${Subdivision}`}
          onChange={(id) => update({ subdivision: Number(id) as Subdivision })}
          className="-mx-4 px-4"
        />
        <div className="mt-3">
          <ChipBar
            label="Click sound"
            items={CLICK_SOUNDS}
            value={settings.sound}
            onChange={(id: ClickSound) => update({ sound: id })}
            className="-mx-4 px-4"
          />
        </div>

        <label
          htmlFor="metronome-volume"
          className="mt-4 flex items-baseline justify-between text-[12.5px] font-semibold"
        >
          Volume
          <span className="font-mono text-[11.5px] tabular-nums text-ink-soft">
            {Math.round(settings.volume * 100)}%
          </span>
        </label>
        <input
          id="metronome-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(settings.volume * 100)}
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          className="mt-1.5 h-6 w-full cursor-pointer accent-accent"
        />
      </section>
    </div>
  );
}
