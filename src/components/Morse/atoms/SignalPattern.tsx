import { spoken } from "@/lib/Morse/alphabet";
import { cx } from "@/lib/utils";

type PatternSize = "sm" | "md" | "lg";

/** Dot/dash geometry per size — a dash is three dots long, as in the timing. */
const SIZES: Record<PatternSize, { dot: string; dash: string; gap: string }> = {
  sm: { dot: "size-[5px]", dash: "h-[5px] w-[15px]", gap: "gap-[3px]" },
  md: { dot: "size-[7px]", dash: "h-[7px] w-[21px]", gap: "gap-[4px]" },
  lg: { dot: "size-[11px]", dash: "h-[11px] w-[33px]", gap: "gap-[6px]" },
};

interface SignalPatternProps {
  /** A Morse code string of `.` and `-`. */
  code: string;
  size?: PatternSize;
  className?: string;
  /** Index of the signal currently sounding, for playback highlighting. */
  litIndex?: number;
}

/**
 * A Morse pattern drawn as real dots and dashes rather than punctuation, so the
 * shape — and the 1:3 length ratio that gives it its rhythm — is visible at a
 * glance. Inherits `currentColor`, so the surrounding text colour styles it.
 * Announced to screen readers as the spoken rhythm ("di-dah"), which is how the
 * character is actually taught.
 */
export function SignalPattern({ code, size = "md", className, litIndex }: SignalPatternProps) {
  const s = SIZES[size];
  return (
    <span
      role="img"
      aria-label={spoken(code)}
      className={cx("inline-flex items-center", s.gap, className)}
    >
      {code.split("").map((sym, i) => (
        <span
          key={i}
          aria-hidden
          className={cx(
            "block rounded-full bg-current transition-opacity duration-100",
            sym === "-" ? s.dash : s.dot,
            litIndex !== undefined && litIndex !== i && "opacity-35",
          )}
        />
      ))}
    </span>
  );
}
