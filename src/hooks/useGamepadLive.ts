"use client";

import { useEffect, useState } from "react";

export interface GamepadLiveState {
  connected: boolean;
  /** Per-button pressure, 0–1 (a digital button reads 0 or 1). */
  buttons: number[];
  /** Per-axis position, −1 to 1. */
  axes: number[];
}

const IDLE: GamepadLiveState = { connected: false, buttons: [], axes: [] };

/** ~15 fps. Fast enough to feel live, slow enough to stay off the CPU. */
const FRAME_MS = 66;

/**
 * Polls one gamepad's live button and axis values.
 *
 * The Gamepad API has no change event — `getGamepads()` returns a fresh
 * snapshot each call, so reading state means sampling it. Sampling is capped
 * well below the display refresh rate and stops the moment the pad view closes,
 * because a controller readout is not worth a permanently busy animation frame.
 *
 * Pass `null` when no gamepad is on screen and nothing is scheduled at all.
 */
export function useGamepadLive(padIndex: number | null): GamepadLiveState {
  const [state, setState] = useState<GamepadLiveState>(IDLE);

  useEffect(() => {
    if (padIndex == null || typeof navigator === "undefined" || !navigator.getGamepads) {
      setState(IDLE);
      return;
    }

    let raf = 0;
    let last = 0;

    const sample = (now: number) => {
      raf = requestAnimationFrame(sample);
      if (now - last < FRAME_MS) return;
      last = now;

      const pad = navigator.getGamepads()[padIndex];
      if (!pad) {
        setState((prev) => (prev.connected ? IDLE : prev));
        return;
      }
      setState({
        connected: pad.connected,
        buttons: pad.buttons.map((b) => b.value),
        axes: [...pad.axes],
      });
    };

    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [padIndex]);

  return state;
}
