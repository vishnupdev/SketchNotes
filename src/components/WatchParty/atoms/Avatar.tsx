import { cx } from "@/lib/utils";

/** A member's colour, from their seat. A token, so it follows the theme. */
export const partyColor = (slot: number): string => `var(--party-${((slot % 8) + 8) % 8})`;

/**
 * A member's initial in a ring of their colour. The ring thickens and glows
 * while they are talking — a second cue besides colour, since the room reads a
 * speaking ring on every screen at once.
 */
export function Avatar({
  name,
  slot,
  speaking = false,
  size = 34,
}: {
  name: string;
  slot: number;
  speaking?: boolean;
  size?: number;
}) {
  const color = partyColor(slot);
  return (
    <span
      aria-hidden
      className={cx(
        "grid flex-none place-items-center rounded-full font-bold text-text transition-[box-shadow]",
        speaking && "motion-safe:animate-pulse",
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `color-mix(in oklab, ${color} 20%, var(--paper))`,
        boxShadow: speaking
          ? `0 0 0 2.5px ${color}, 0 0 0 5px color-mix(in oklab, ${color} 35%, transparent)`
          : `inset 0 0 0 1.5px ${color}`,
      }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
