import { formatCents } from "@/lib/SoundMeter/format";
import { tuningVerdict } from "@/lib/SoundMeter/notes";
import { cx } from "@/lib/utils";

interface CentsDialProps {
  /** Distance from the nearest note in cents (−50…+50), or null when unpitched. */
  cents: number | null;
}

/** Minor ticks every 10 cents; the centre and the ±50 edges are marked heavier. */
const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

/** Cents → position across the dial, 0→1. */
const position = (cents: number) => (Math.min(50, Math.max(-50, cents)) + 50) / 100;

/**
 * Tuner dial: a ±50-cent scale with a needle at the measured deviation. Green
 * within ±5 cents (the "in tune" band every tuner uses, and about the smallest
 * difference a trained ear hears), otherwise the needle warns in the priority
 * colour. Colour is never the only signal — the sign and figure are printed
 * alongside, and the whole dial carries a text label for screen readers.
 */
export function CentsDial({ cents }: CentsDialProps) {
  const verdict = cents === null ? null : tuningVerdict(cents);
  const tone =
    verdict === "in-tune" ? "bg-success" : verdict === null ? "bg-border" : "bg-prio-med";

  return (
    <div
      className="w-full"
      role="img"
      aria-label={
        cents === null
          ? "No pitch detected"
          : `${formatCents(cents)} cents — ${verdict === "in-tune" ? "in tune" : verdict}`
      }
    >
      <div className="relative h-12 w-full rounded-xl border border-border bg-paper">
        {/* In-tune window, so "close enough" is visible at a glance. */}
        <div
          aria-hidden
          className="absolute inset-y-1 rounded-md bg-success/15"
          style={{ left: `${position(-5) * 100}%`, width: `${(position(5) - position(-5)) * 100}%` }}
        />
        {TICKS.map((tick) => (
          <div
            key={tick}
            aria-hidden
            className={cx(
              "absolute w-px -translate-x-1/2 bg-border",
              tick === 0 ? "inset-y-1" : tick % 50 === 0 ? "inset-y-2" : "inset-y-3.5",
            )}
            style={{ left: `${position(tick) * 100}%` }}
          />
        ))}
        {cents !== null && (
          <div
            aria-hidden
            className={cx(
              "absolute inset-y-1 w-1 -translate-x-1/2 rounded-full transition-[left] duration-100 ease-out",
              tone,
            )}
            style={{ left: `${position(cents) * 100}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9.5px] text-ink-soft" aria-hidden>
        <span>−50¢</span>
        <span>0</span>
        <span>+50¢</span>
      </div>
    </div>
  );
}
