import { dbFraction, formatDb } from "@/lib/SoundMeter/format";
import { cx } from "@/lib/utils";

interface LevelBarProps {
  /** Current RMS level, dBFS. */
  rms: number;
  /** Current peak level, dBFS. */
  peak: number;
  /** Loudest peak seen so far, dBFS — drawn as a held marker. */
  hold: number;
  /** Input is at full scale right now. */
  clipping: boolean;
}

/** dBFS gridlines. −6 is the usual "getting hot" mark on a recording meter. */
const TICKS = [-60, -40, -20, -6, 0];

/** Meter floor: quieter than this and the bar would be permanently empty. */
const FLOOR = -60;

/**
 * Horizontal level meter in dBFS: a solid RMS bar (what you hear as loudness),
 * a lighter peak overlay (what actually clips), and a held marker for the
 * loudest peak of the session.
 */
export function LevelBar({ rms, peak, hold, clipping }: LevelBarProps) {
  const rmsPct = dbFraction(rms, FLOOR) * 100;
  const peakPct = dbFraction(peak, FLOOR) * 100;
  const holdPct = dbFraction(hold, FLOOR) * 100;

  return (
    <div>
      <div
        className="relative h-6 w-full overflow-hidden rounded-lg border border-border bg-paper"
        role="meter"
        aria-valuemin={FLOOR}
        aria-valuemax={0}
        aria-valuenow={Math.max(FLOOR, Math.round(rms))}
        aria-valuetext={`${formatDb(rms)} decibels full scale`}
        aria-label="Input level"
      >
        {/* Peak sits behind the RMS bar as a translucent lead. */}
        <div
          className={cx(
            "absolute inset-y-0 left-0 transition-[width] duration-75 ease-out",
            clipping ? "bg-danger/40" : "bg-accent/30",
          )}
          style={{ width: `${peakPct}%` }}
        />
        <div
          className={cx(
            "absolute inset-y-0 left-0 transition-[width] duration-75 ease-out",
            clipping ? "bg-danger" : "bg-accent",
          )}
          style={{ width: `${rmsPct}%` }}
        />
        {holdPct > 0 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-ink-soft"
            style={{ left: `calc(${holdPct}% - 1px)` }}
            aria-hidden
          />
        )}
        {/* Gridlines drawn over the fill so the scale stays readable when hot. */}
        {TICKS.map((db) => (
          <div
            key={db}
            aria-hidden
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: `${dbFraction(db, FLOOR) * 100}%` }}
          />
        ))}
      </div>
      {/* Labels are positioned on the same dB scale as the gridlines above —
          an evenly spaced row would not line up, since the scale isn't linear
          in the ticks we chose. */}
      <div className="relative mt-1 h-3.5 font-mono text-[9.5px] text-ink-soft" aria-hidden>
        {TICKS.map((db) => (
          <span
            key={db}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${dbFraction(db, FLOOR) * 100}%` }}
          >
            {db}
          </span>
        ))}
      </div>
    </div>
  );
}
