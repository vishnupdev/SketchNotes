"use client";

import { useMemo } from "react";
import { cx } from "@/lib/utils";
import { formatWatch } from "@/lib/Timer/format";
import { swElapsed, useTimerStore } from "@/store/useTimerStore";
import { ControlButton } from "@/components/Timer/atoms/ControlButton";
import { FlagIcon, PauseIcon, PlayIcon, RotateIcon } from "@/components/SketchNotes/atoms/icons";

interface Lap {
  index: number;
  split: number; // this lap's duration
  total: number; // cumulative
}

/** Turn cumulative lap marks into per-lap splits. */
function toLaps(marks: number[]): Lap[] {
  const laps: Lap[] = [];
  for (let i = 0; i < marks.length; i++) {
    laps.push({ index: i + 1, split: marks[i] - (marks[i - 1] ?? 0), total: marks[i] });
  }
  return laps;
}

/** Stopwatch tool: start/stop, lap capture, and fastest/slowest highlighting. */
export function StopwatchPanel() {
  const sw = useTimerStore((s) => s.stopwatch);
  const now = useTimerStore((s) => s.now);
  const startSw = useTimerStore((s) => s.startStopwatch);
  const pauseSw = useTimerStore((s) => s.pauseStopwatch);
  const lapSw = useTimerStore((s) => s.lapStopwatch);
  const resetSw = useTimerStore((s) => s.resetStopwatch);

  const elapsed = swElapsed(sw, now);
  const started = elapsed > 0 || sw.running;

  const laps = useMemo(() => toLaps(sw.laps), [sw.laps]);
  const { fastest, slowest } = useMemo(() => {
    if (laps.length < 2) return { fastest: -1, slowest: -1 };
    let f = laps[0].index;
    let sIdx = laps[0].index;
    let min = laps[0].split;
    let max = laps[0].split;
    for (const l of laps) {
      if (l.split < min) (min = l.split), (f = l.index);
      if (l.split > max) (max = l.split), (sIdx = l.index);
    }
    return { fastest: f, slowest: sIdx };
  }, [laps]);

  // Live final "lap" so the current in-progress split is visible.
  const running = sw.running;
  const currentSplit = elapsed - (sw.laps[sw.laps.length - 1] ?? 0);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid h-[220px] w-full place-items-center rounded-2xl border border-border bg-panel shadow-panel">
        <span className="font-mono text-[clamp(44px,13vw,72px)] font-bold tabular-nums leading-none">
          {formatWatch(elapsed)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <ControlButton
          icon={<RotateIcon size={20} />}
          label="Reset"
          size="md"
          disabled={!started}
          onClick={resetSw}
        />
        {running ? (
          <ControlButton icon={<PauseIcon size={24} />} label="Stop" variant="primary" size="lg" onClick={pauseSw} />
        ) : (
          <ControlButton icon={<PlayIcon size={24} />} label="Start" variant="primary" size="lg" onClick={startSw} />
        )}
        <ControlButton
          icon={<FlagIcon size={19} />}
          label="Lap"
          size="md"
          disabled={!running}
          onClick={lapSw}
        />
      </div>

      {(laps.length > 0 || running) && (
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-panel shadow-panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
            <span>Lap</span>
            <span>Split</span>
            <span>Total</span>
          </div>
          <ul className="max-h-[320px] divide-y divide-border overflow-y-auto">
            {running && (
              <li className="flex items-center justify-between px-4 py-2.5 font-mono text-[13.5px] tabular-nums">
                <span className="font-bold">{laps.length + 1}</span>
                <span className="text-ink-soft">{formatWatch(currentSplit)}</span>
                <span>{formatWatch(elapsed)}</span>
              </li>
            )}
            {[...laps].reverse().map((l) => (
              <li
                key={l.index}
                className={cx(
                  "flex items-center justify-between px-4 py-2.5 font-mono text-[13.5px] tabular-nums",
                  l.index === fastest && "text-success",
                  l.index === slowest && "text-danger",
                )}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  {l.index}
                  {l.index === fastest && <span className="text-[9px] uppercase tracking-wider">fastest</span>}
                  {l.index === slowest && <span className="text-[9px] uppercase tracking-wider">slowest</span>}
                </span>
                <span>{formatWatch(l.split)}</span>
                <span className="text-ink-soft">{formatWatch(l.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
