"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live loudness from an open microphone stream — the proof that "microphone in
 * use" means what it says.
 *
 * Every frame is measured and thrown away: no buffer is kept, nothing is
 * recorded, and the AudioContext is closed when the session ends. The reading
 * is RMS mapped onto a rough 0–100, which is all a presence indicator needs —
 * Sound Meter is the app for an actual measurement.
 */
export function MicLevel({ stream }: { stream: MediaStream }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    // Deliberately not connected to the destination: monitoring the mic through
    // the speakers would feed back.

    const buf = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      // −60 dBFS reads as silence, 0 dBFS as full — a usable presence scale.
      const db = 20 * Math.log10(rms || 1e-8);
      setLevel(Math.max(0, Math.min(100, ((db + 60) / 60) * 100)));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
        Level
      </span>
      <div
        role="meter"
        aria-label="Microphone level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level)}
        className="h-2 flex-1 overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-100"
          style={{ width: `${level}%` }}
        />
      </div>
      <span className="w-9 text-right text-[11.5px] font-semibold tabular-nums text-ink-soft">
        {Math.round(level)}
      </span>
    </div>
  );
}
