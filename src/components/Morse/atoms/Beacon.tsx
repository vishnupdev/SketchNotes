import { cx } from "@/lib/utils";

interface BeaconProps {
  /** True while the tone is sounding. */
  on: boolean;
  /** True for the whole message, so the lamp can idle rather than look dead. */
  active?: boolean;
  className?: string;
}

/**
 * The signal lamp — the visual half of Morse playback, for learning by eye (or
 * with the sound off). Purely decorative: the button that started playback
 * carries the state for assistive tech, so this is hidden from it.
 */
export function Beacon({ on, active = false, className }: BeaconProps) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid size-11 flex-none place-items-center rounded-full border transition-colors duration-75",
        on ? "border-accent bg-accent" : active ? "border-accent bg-accent-soft" : "border-border bg-panel",
        className,
      )}
      style={
        on
          ? { boxShadow: "0 0 0 6px var(--accent-soft), 0 0 22px 2px var(--accent)" }
          : undefined
      }
    >
      <span
        className={cx(
          "block size-3.5 rounded-full transition-colors duration-75",
          on ? "bg-on-accent" : active ? "bg-accent" : "bg-ink-soft/40",
        )}
      />
    </span>
  );
}
