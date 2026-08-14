import { cx } from "@/lib/utils";
import { STATE_LABEL, type AccessState } from "@/lib/Resources/catalog";

/**
 * The state of one resource, as a pill.
 *
 * Colour never carries the meaning on its own: every pill spells the state out
 * in words, so the reading survives a greyscale screen and a screen reader
 * alike (rule 7). Only "Allowed" is filled — on a permission list the thing
 * worth spotting from across the page is what is already open.
 */
const TONE: Record<AccessState, string> = {
  granted: "border-accent bg-accent-soft text-accent",
  denied: "border-border bg-panel text-ink-soft",
  prompt: "border-border bg-panel text-ink-soft",
  unsupported: "border-border bg-transparent text-ink-soft",
  unknown: "border-border bg-transparent text-ink-soft",
};

export function StatePill({ state, className }: { state: AccessState; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        TONE[state],
        className,
      )}
    >
      {state === "granted" && (
        <span aria-hidden className="size-1.5 flex-none rounded-full bg-accent" />
      )}
      {STATE_LABEL[state]}
    </span>
  );
}
