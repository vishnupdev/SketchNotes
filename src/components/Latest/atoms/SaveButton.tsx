"use client";

import { BookmarkIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Keep a product, or stop keeping it.
 *
 * Sits outside the hit area of the row it belongs to, so a thumb aiming to open
 * a product never saves it by accident. The label is the *action* rather than
 * the state ("Save" / "Saved"), and `aria-pressed` carries the state — a button
 * whose accessible name changes between renders is announced as a new control
 * each time, which is exactly what a toggle must not do.
 */
export function SaveButton({
  saved,
  onToggle,
  name,
}: {
  saved: boolean;
  onToggle: () => void;
  /** The product's name, so the label says which thing is being kept. */
  name: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      title={saved ? "Saved — tap to remove" : "Save this product"}
      className={cx(
        "tint grid size-9 flex-none place-items-center rounded-[10px] border",
        saved
          ? "border-accent text-accent"
          : "border-transparent text-ink-soft hover:border-accent hover:text-accent",
      )}
      style={{ transition: "var(--fx)" }}
    >
      <BookmarkIcon size={17} filled={saved} />
    </button>
  );
}
