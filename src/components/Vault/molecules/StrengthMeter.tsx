"use client";

import type { Strength } from "@/lib/Vault/generate";
import { cx } from "@/lib/utils";

interface StrengthMeterProps {
  strength: Strength;
  /** Extra line under the bar, saying what the figure is and isn't. */
  caption?: string;
}

/**
 * How strong a password is: a bar, a word, the entropy, and how long it would
 * take to guess.
 *
 * The word and the number carry the reading, never the colour of the bar — a
 * strength meter is exactly the kind of control that gets built as a green or
 * red stripe and becomes unreadable for the reader it matters to (rule #7). The
 * bar is filled from a single accent token, and the band is stated in words
 * beside it.
 *
 * The crack time is the figure that actually changes behaviour. "42 bits" means
 * nothing to most readers; "3 hours" moves them to add two words.
 */
export function StrengthMeter({ strength, caption }: StrengthMeterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold">{strength.label}</span>
        <span className="font-mono text-[11px] tabular-nums text-ink-soft">
          {Math.round(strength.bits)} bits
        </span>
      </div>

      {/* Four segments rather than one continuous bar: at a glance the count is
          easier to compare between two passwords than a length is. */}
      <div className="flex gap-1" role="presentation">
        {[0.25, 0.5, 0.75, 1].map((threshold) => (
          <span
            key={threshold}
            className={cx(
              "h-1.5 flex-1 rounded-full",
              strength.fill >= threshold - 0.24 ? "bg-accent" : "bg-border",
            )}
          />
        ))}
      </div>

      <p className="text-[12px] leading-snug text-ink-soft">
        Guessed in about <strong className="font-semibold text-text">{strength.crackTime}</strong> at
        a hundred billion tries a second
        {caption ? ` — ${caption}` : ""}.
      </p>
    </div>
  );
}
