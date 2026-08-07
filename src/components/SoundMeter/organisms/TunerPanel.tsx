"use client";

import { useSoundMeterStore } from "@/store/useSoundMeterStore";
import { A4_PRESETS, matchNote } from "@/lib/SoundMeter/notes";
import { formatHz, hzUnit } from "@/lib/SoundMeter/format";
import { PITCH_MAX_HZ, PITCH_MIN_HZ } from "@/lib/SoundMeter/analysis";
import { CentsDial } from "@/components/SoundMeter/atoms/CentsDial";
import { NoteReadout } from "@/components/SoundMeter/molecules/NoteReadout";

/**
 * Pitch measurement: the fundamental in Hz, the note it maps to at the chosen
 * reference pitch, and the cents error — i.e. a working instrument tuner.
 *
 * The loudest frequency present is shown alongside the fundamental because
 * they answer different questions: the fundamental is the note being played,
 * while the loudest bin is whatever is dominating the room (a hum, a whistle,
 * an overtone louder than its own root).
 */
export function TunerPanel() {
  const reading = useSoundMeterStore((s) => s.reading);
  const a4 = useSoundMeterStore((s) => s.a4);
  const setA4 = useSoundMeterStore((s) => s.setA4);

  const note = reading.hz !== null ? matchNote(reading.hz, a4) : null;

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <NoteReadout hz={reading.hz} note={note} clarity={reading.clarity} />

      <div className="mt-4">
        <CentsDial cents={note ? note.cents : null} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="text-[12px] text-ink-soft">
          <span className="font-semibold text-text">Loudest tone </span>
          <span className="tabular-nums">
            {formatHz(reading.peakHz)} {reading.peakHz !== null && hzUnit(reading.peakHz)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sound-a4" className="text-[12px] text-ink-soft">
            Reference A4
          </label>
          <select
            id="sound-a4"
            value={a4}
            onChange={(e) => setA4(Number(e.target.value))}
            className="min-h-9 rounded-lg border border-border bg-paper px-2.5 text-[12.5px] font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {A4_PRESETS.map((hz) => (
              <option key={hz} value={hz}>
                {hz} Hz
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        Pitch is tracked by autocorrelation between {PITCH_MIN_HZ} Hz and {PITCH_MAX_HZ} Hz, which
        covers voice and almost every instrument. Chords and noise have no single fundamental, so
        the note readout stays blank for them — use the spectrum below instead.
      </p>
    </section>
  );
}
