"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { playCue } from "@/lib/ui-sound";

/**
 * How a view arrives on screen. Each value has a matching `[data-nav="…"]`
 * block in `globals.css` that names the keyframes to play.
 *
 * - `forward` / `back` — a move along a row of peers (an app's bottom tabs, a
 *   news category, a Todos period). Enters from the side the new view sits on.
 * - `deeper` / `shallower` — drilling into a tool and coming back out.
 * - `rise` — arriving somewhere else entirely, i.e. an app switch.
 * - `fade` — anything with no meaningful direction.
 */
export type NavMotion = "forward" | "back" | "deeper" | "shallower" | "rise" | "fade";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * The animation has to be armed before the browser paints, or the new view is
 * shown in its final position for a frame and then snaps back to the start of
 * its animation. That means a layout effect — but React warns when one is
 * reached during server rendering, so the server gets the no-op instead. Most
 * apps here are `ssr: false`, so this only matters for the ones that aren't.
 */
const useNavLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Play a view-entry animation on `el`.
 *
 * Restarting matters as much as starting: an element that isn't being remounted
 * keeps the animation it already ran, and re-writing the same `data-nav` value
 * changes nothing — so tabbing 1 → 2 → 3 would animate once and then sit still.
 * Clearing the animation name, reading a layout property to force the style to
 * be recomputed, and handing it back to the stylesheet is what replays it.
 */
export function playNav(el: HTMLElement | null, motion: NavMotion, section?: number) {
  if (!el) return;
  // The one place every in-app navigation passes through, so it is also where
  // the navigation is heard. The cue names *are* the motion names, and `section`
  // — the view's index among its peers — is what gives each of an app's pages
  // its own tone. Muting and the browser's autoplay rules are the sound
  // module's business, not this one's.
  playCue(motion, section);
  el.dataset.nav = motion;
  el.style.animationName = "none";
  void el.offsetWidth;
  el.style.animationName = "";
}

/**
 * Which way a move between two peer views went. Anything the order doesn't
 * cover (an unknown id, or a move to where you already are) has no direction to
 * report, so it fades.
 */
export function navDirection(order: readonly string[], from: string, to: string): NavMotion {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a === -1 || b === -1 || a === b) return "fade";
  return b > a ? "forward" : "back";
}

interface NavViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** Identifies the view on screen. Changing it is what plays the animation. */
  viewKey: string;
  /**
   * The peer views in the order the user sees them in — a tab bar's tabs, say —
   * used to tell a forward move from a backward one. Declare it at module scope:
   * a fresh array on every render would re-run the effect on every render.
   */
  order?: readonly string[];
  /**
   * Overrides `order`. Either one fixed motion, for navigations that aren't a
   * move along a row of peers (drilling into a tool, say), or a function to work
   * the direction out from the keys — for views that aren't a fixed list at all,
   * like Todos stepping through weeks.
   */
  motion?: NavMotion | ((from: string, to: string) => NavMotion);
  children: ReactNode;
}

/**
 * Wraps whatever is currently on screen and animates it in whenever the view
 * changes. Drop it in place of the `<div>` an app already wraps its active panel
 * with, rather than as an extra layer:
 *
 * ```tsx
 * const MODES = ["countdown", "stopwatch", "pomodoro"] as const;
 * <NavView viewKey={mode} order={MODES} className="flex flex-col gap-5">
 *   {panel}
 * </NavView>
 * ```
 *
 * It never remounts its children — the animation rides on the wrapper — so a
 * panel that survives a navigation keeps its state, and one that doesn't is
 * being swapped by the caller for its own reasons.
 *
 * The first render is deliberately silent: nothing has been navigated yet, and
 * fading a view up on arrival would only hold up the first paint.
 */
export function NavView({ viewKey, order, motion, children, ...rest }: NavViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(viewKey);

  useNavLayoutEffect(() => {
    const from = shown.current;
    if (from === viewKey) return;
    shown.current = viewKey;
    playNav(
      ref.current,
      typeof motion === "function"
        ? motion(from, viewKey)
        : motion ?? (order ? navDirection(order, from, viewKey) : "fade"),
      // Where the peers are declared, the view's place among them is its tone.
      // Views that aren't a fixed list (Todos stepping through weeks) have no
      // position to give, and fall back to their cue's own note.
      order?.indexOf(viewKey),
    );
  }, [viewKey, order, motion]);

  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
}
