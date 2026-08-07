"use client";

import { useSoundMeterStore } from "@/store/useSoundMeterStore";
import { SILENT_DB } from "@/lib/SoundMeter/analysis";
import {
  describeSpl,
  formatDb,
  SPL_OFFSET_MAX,
  SPL_OFFSET_MIN,
} from "@/lib/SoundMeter/format";
import { LevelBar } from "@/components/SoundMeter/atoms/LevelBar";
import { ReadingTile } from "@/components/SoundMeter/atoms/ReadingTile";
import { GaugeIcon, LatencyIcon, VolumeIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Loudness measurement in dBFS — RMS, peak, and the loudest peak held for the
 * session — plus a deliberately hedged sound-pressure estimate.
 *
 * A browser can't calibrate a microphone, so an absolute dB SPL figure would
 * be a fabrication. The estimate is offered with an adjustable offset and
 * labelled as an estimate, which is the honest version of the number people
 * come to a sound meter looking for.
 */
export function LevelPanel() {
  const reading = useSoundMeterStore((s) => s.reading);
  const peakHold = useSoundMeterStore((s) => s.peakHold);
  const clippedEver = useSoundMeterStore((s) => s.clippedEver);
  const splOffset = useSoundMeterStore((s) => s.splOffset);
  const setSplOffset = useSoundMeterStore((s) => s.setSplOffset);
  const resetPeak = useSoundMeterStore((s) => s.resetPeak);

  const silent = reading.rms <= SILENT_DB;
  const spl = silent ? null : Math.max(0, reading.rms + splOffset);

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-[.1px]">Level</h2>
        <button
          type="button"
          onClick={resetPeak}
          className="hover-pop min-h-9 rounded-lg border border-border bg-paper px-3 font-mono text-[10.5px] uppercase tracking-[.1em] hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Reset peak
        </button>
      </div>

      <div className="mt-3.5">
        <LevelBar
          rms={reading.rms}
          peak={reading.peak}
          hold={peakHold}
          clipping={reading.clipping}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReadingTile
          icon={<VolumeIcon size={15} />}
          label="RMS"
          value={formatDb(reading.rms)}
          unit="dBFS"
          caption="average"
          muted={silent}
        />
        <ReadingTile
          icon={<LatencyIcon size={15} />}
          label="Peak"
          value={formatDb(reading.peak)}
          unit="dBFS"
          caption={reading.clipping ? "clipping" : "instant"}
          tone={reading.clipping ? "text-danger" : "text-accent"}
          muted={silent}
        />
        <ReadingTile
          icon={<GaugeIcon size={15} />}
          label="Peak hold"
          value={formatDb(peakHold)}
          unit="dBFS"
          caption={clippedEver ? "clipped earlier" : "session max"}
          tone={clippedEver ? "text-danger" : "text-accent"}
          muted={peakHold <= SILENT_DB}
        />
        <ReadingTile
          icon={<VolumeIcon size={15} />}
          label="Est. SPL"
          value={spl === null ? "—" : spl.toFixed(0)}
          unit="dB"
          caption={spl === null ? undefined : describeSpl(spl)}
          muted={silent}
        />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <label
          htmlFor="sound-spl-offset"
          className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-soft"
        >
          <span>Estimate calibration</span>
          <span className="font-mono text-[11px] tabular-nums text-text">
            0 dBFS ≈ {splOffset} dB SPL
          </span>
        </label>
        <input
          id="sound-spl-offset"
          type="range"
          min={SPL_OFFSET_MIN}
          max={SPL_OFFSET_MAX}
          step={1}
          value={splOffset}
          onChange={(e) => setSplOffset(Number(e.target.value))}
          className="mt-2 h-6 w-full accent-[var(--accent)]"
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          dBFS is exact — it is the signal level relative to the digital full scale. The SPL figure
          is only an estimate: browsers cannot calibrate a microphone, so match this slider against
          a real sound-level meter if you need the number to mean anything.
        </p>
      </div>
    </section>
  );
}
