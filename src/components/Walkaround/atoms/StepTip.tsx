"use client";

import { cx } from "@/lib/utils";

interface StepTipProps {
  id: string;
  title: string;
  direction: string;
  /** Horizontal centre of the pin this points at, in stage percent. */
  pinX: number;
  /** The stage edge it hangs from: the target's bottom, or its top. */
  edgeY: number;
  side: "above" | "below";
}

/**
 * The tooltip itself — a bubble beside the pin, with a caret that points back
 * at it.
 *
 * Placed entirely from two numbers and CSS, with nothing measured at runtime:
 * the bubble is a fixed share of the stage's width (`--tip-w`) centred in it,
 * and the caret slides along its edge by the pin's offset from centre, scaled
 * by `--tip-scale` (the reciprocal of that share) to convert stage percent into
 * bubble percent. Two breakpoints, two pairs of values, and no measure pass —
 * so the tooltip is in the right place on its first painted frame rather than
 * jumping into position afterwards (rule #7).
 *
 * The caret is `clamp`ed short of the corners, so a step about the Apps button
 * or the first tab still gets a caret on the bubble rather than off the end of
 * it.
 */
export function StepTip({ id, title, direction, pinX, edgeY, side }: StepTipProps) {
  const caret = `clamp(14%, calc(50% + (${pinX} - 50) * var(--tip-scale) * 1%), 86%)`;

  return (
    <div
      id={id}
      role="tooltip"
      style={
        {
          "--pin-x": pinX,
          [side === "below" ? "top" : "bottom"]:
            side === "below" ? `calc(${edgeY}% + 10px)` : `calc(${100 - edgeY}% + 10px)`,
        } as React.CSSProperties
      }
      className={cx(
        // --tip-w is the bubble's share of the stage; --tip-scale is 100/tip-w,
        // which is what maps a stage-percent offset onto the bubble.
        // z-3, deliberately low: the bubble is allowed to overhang the stage,
        // so it has to pass *under* the app's sticky header (z-20) as the page
        // scrolls rather than floating over the masthead.
        "absolute left-1/2 z-[3] w-(--tip-w) -translate-x-1/2 [--tip-scale:1.14] [--tip-w:88%]",
        "min-[560px]:[--tip-scale:1.79] min-[560px]:[--tip-w:56%]",
        "rounded-xl border border-accent bg-panel p-2.5 text-left shadow-panel",
      )}
    >
      <div className="font-mono text-[9.5px] uppercase tracking-[.14em] text-accent">{title}</div>
      <p className="mt-1 text-[11.5px] leading-[1.45] text-text min-[560px]:text-[12px]">
        {direction}
      </p>

      {/* The caret: a rotated square straddling the bubble's edge, with the
          border showing on the two sides that face out. */}
      <span
        aria-hidden
        style={{ left: caret }}
        className={cx(
          "absolute size-2.5 -translate-x-1/2 rotate-45 border-accent bg-panel",
          side === "below"
            ? "-top-1.5 border-l border-t"
            : "-bottom-1.5 border-b border-r",
        )}
      />
    </div>
  );
}
