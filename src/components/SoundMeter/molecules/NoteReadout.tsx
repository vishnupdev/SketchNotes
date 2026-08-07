import { formatCents, formatHz, hzUnit } from "@/lib/SoundMeter/format";
import { noteLabel, tuningVerdict } from "@/lib/SoundMeter/notes";
import { cx } from "@/lib/utils";
import type { NoteMatch } from "@/lib/SoundMeter/types";

interface NoteReadoutProps {
  /** Measured fundamental in Hz, or null when nothing pitched is audible. */
  hz: number | null;
  /** The nearest note to `hz`, or null. */
  note: NoteMatch | null;
  /** Detection confidence 0→1 — shown so a shaky reading looks shaky. */
  clarity: number;
}

const VERDICT_COPY = {
  flat: "flat — tune up",
  "in-tune": "in tune",
  sharp: "sharp — tune down",
} as const;

/**
 * The headline reading: measured frequency, the note it lands on, and how far
 * off that note it is. Every state has copy — "listening…" rather than a blank
 * panel — so it's never unclear whether the meter is working or just quiet.
 */
export function NoteReadout({ hz, note, clarity }: NoteReadoutProps) {
  const verdict = note ? tuningVerdict(note.cents) : null;

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[.16em] text-ink-soft">
          Frequency
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={cx(
              "text-[36px] font-extrabold leading-none tracking-tight min-[420px]:text-[46px] tabular-nums",
              hz === null && "text-ink-soft opacity-50",
            )}
          >
            {formatHz(hz)}
          </span>
          <span className="text-[16px] font-bold text-ink-soft">{hzUnit(hz)}</span>
        </div>
        <div className="mt-1.5 text-[11.5px] text-ink-soft">
          {hz === null
            ? "Listening for a steady tone…"
            : `Confidence ${Math.round(clarity * 100)}%`}
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-[.16em] text-ink-soft">Note</div>
        <div
          className={cx(
            "mt-1 text-[36px] font-extrabold leading-none tracking-tight min-[420px]:text-[46px]",
            note ? "text-accent" : "text-ink-soft opacity-50",
          )}
        >
          {note ? noteLabel(note) : "—"}
        </div>
        <div
          className={cx(
            "mt-1.5 text-[11.5px] font-semibold tabular-nums",
            verdict === "in-tune" ? "text-success" : verdict ? "text-prio-med" : "text-ink-soft",
          )}
        >
          {note && verdict ? `${formatCents(note.cents)}¢ · ${VERDICT_COPY[verdict]}` : "no pitch"}
        </div>
      </div>
    </div>
  );
}
