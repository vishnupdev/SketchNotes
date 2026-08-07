"use client";

import { useState } from "react";
import { useSoundMeterStore } from "@/store/useSoundMeterStore";
import { formatHz, hzUnit, positionToHz } from "@/lib/SoundMeter/format";
import { matchNote, noteLabel } from "@/lib/SoundMeter/notes";
import { ScopeCanvas } from "@/components/SoundMeter/atoms/ScopeCanvas";
import { ViewTabs } from "@/components/SoundMeter/molecules/ViewTabs";

/**
 * The live plot — a log-frequency spectrum or a time-domain scope.
 *
 * Pointing at the spectrum reads out the frequency (and note) under the
 * pointer, which turns the picture into something you can actually measure
 * with: "what is that hum?" is answered by pointing at the spike.
 */
export function ScopePanel() {
  const view = useSoundMeterStore((s) => s.view);
  const setView = useSoundMeterStore((s) => s.setView);
  const status = useSoundMeterStore((s) => s.status);
  const capture = useSoundMeterStore((s) => s.capture);
  const a4 = useSoundMeterStore((s) => s.a4);

  const [probeHz, setProbeHz] = useState<number | null>(null);
  const live = status === "live";
  const probeNote = probeHz !== null ? matchNote(probeHz, a4) : null;

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-[.1px]">
          {view === "spectrum" ? "Spectrum" : "Waveform"}
        </h2>
        <ViewTabs value={view} onChange={setView} />
      </div>

      <div
        className="mt-3.5"
        onPointerMove={(e) => {
          if (view !== "spectrum") return;
          const rect = e.currentTarget.getBoundingClientRect();
          setProbeHz(positionToHz((e.clientX - rect.left) / rect.width));
        }}
        onPointerLeave={() => setProbeHz(null)}
      >
        <ScopeCanvas view={view} live={live} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-ink-soft">
        <span>
          {view === "spectrum"
            ? "20 Hz → 20 kHz, log scale"
            : `${capture ? Math.round((capture.fftSize / capture.sampleRate) * 1000) : 85} ms window`}
        </span>
        {view === "spectrum" && probeHz !== null ? (
          <span className="tabular-nums">
            Pointer: <b className="font-semibold text-text">{formatHz(probeHz)} {hzUnit(probeHz)}</b>
            {probeNote && ` · near ${noteLabel(probeNote)}`}
          </span>
        ) : (
          <span className="tabular-nums">
            {capture
              ? `${(capture.sampleRate / 1000).toFixed(1)} kHz · ${capture.binHz.toFixed(1)} Hz per bin`
              : "Start listening to see live audio"}
          </span>
        )}
      </div>
    </section>
  );
}
