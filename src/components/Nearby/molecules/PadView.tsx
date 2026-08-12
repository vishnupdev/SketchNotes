"use client";

import { cx } from "@/lib/utils";
import { useGamepadLive } from "@/hooks/useGamepadLive";

/** Standard-mapping button names, so a press reads as a button not an index. */
const STANDARD_BUTTONS = [
  "A / ✕",
  "B / ○",
  "X / □",
  "Y / △",
  "L1",
  "R1",
  "L2",
  "R2",
  "Select",
  "Start",
  "L3",
  "R3",
  "Up",
  "Down",
  "Left",
  "Right",
  "Home",
];

/** Standard-mapping axis names. */
const STANDARD_AXES = ["Left X", "Left Y", "Right X", "Right Y"];

/**
 * A controller's live state: every button with its pressure, every axis with its
 * position. Press something and it lights up — which doubles as the quickest way
 * to work out which physical button the browser calls "button 9".
 *
 * Sampling only runs while this is mounted (see {@link useGamepadLive}).
 */
export function PadView({ padIndex, standard }: { padIndex: number; standard: boolean }) {
  const { connected, buttons, axes } = useGamepadLive(padIndex);

  if (!connected && buttons.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-panel px-3.5 py-3 text-[12px] text-ink-soft">
        This controller isn&apos;t reporting. Press a button on it — browsers keep a gamepad
        invisible until it sends its first input.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-border bg-panel px-3.5 py-3">
        <h4 className="mb-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-accent">
          Buttons
          <span className="ml-1.5 tracking-normal text-ink-soft">{buttons.length}</span>
        </h4>
        <ul className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 min-[620px]:grid-cols-4">
          {buttons.map((value, i) => {
            const pressed = value > 0.05;
            return (
              <li
                key={i}
                className={cx(
                  "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  pressed
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-paper text-ink-soft",
                )}
              >
                <span className="min-w-0 truncate">
                  {(standard && STANDARD_BUTTONS[i]) || `Button ${i}`}
                </span>
                <span className="flex-none tabular-nums">{value.toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-panel px-3.5 py-3">
        <h4 className="mb-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-accent">
          Axes
          <span className="ml-1.5 tracking-normal text-ink-soft">{axes.length}</span>
        </h4>
        <ul className="flex flex-col gap-2">
          {axes.map((value, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="w-16 flex-none truncate text-[11px] font-medium text-ink-soft">
                {(standard && STANDARD_AXES[i]) || `Axis ${i}`}
              </span>
              {/* A centre-anchored bar: the fill grows left or right of the
                  midpoint, which is how a stick actually behaves. */}
              <span className="relative h-2 min-w-0 flex-1 rounded-full bg-border">
                <span aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-panel" />
                <span
                  className="absolute top-0 h-full rounded-full bg-accent"
                  style={{
                    left: value < 0 ? `${50 + value * 50}%` : "50%",
                    width: `${Math.min(50, Math.abs(value) * 50)}%`,
                  }}
                />
              </span>
              <span className="w-12 flex-none text-right text-[11px] font-semibold tabular-nums">
                {value.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
