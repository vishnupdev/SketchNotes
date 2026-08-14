"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { APP_MAP, APPS, chipGradient } from "@/components/AppCatalog";
import { playCue } from "@/lib/ui-sound";

/**
 * How long the whole sequence runs before the overlay is torn down. Kept in
 * step with the `app-intro-*` keyframes in globals.css: the veil's fade-out
 * finishes just before this fires, so the layer is removed on a blank frame.
 */
const FULL_MS = 980;
/** The reduced-motion version is a plain cross-fade, so it needn't linger. */
const REDUCED_MS = 400;

/**
 * The app-opening animation: the app's logo blooms out of a hue-washed veil
 * with its name, then clears to reveal the app.
 *
 * It is a flourish, not a loading state: the app behind it has already mounted
 * and the layer clears on a timer regardless. It does swallow pointer input
 * while it plays — for the half-second the veil is opaque, a tap would land on
 * a control the user cannot see, and on one that is still animating into place
 * underneath. Nothing here is focusable, so the keyboard is unaffected.
 *
 * Which app is opening comes from `appIntro` on the workspace store, so every
 * route into an app — a launcher tile, the assistant, browser back/forward —
 * plays it the same way.
 */
export function AppIntro() {
  const appIntro = useWorkspaceStore((s) => s.appIntro);
  const endAppIntro = useWorkspaceStore((s) => s.endAppIntro);
  const app = appIntro ? APP_MAP[appIntro] : null;

  // A timer, not `animationend`: it stays correct if the animations are
  // shortened, replaced by the reduced-motion rules, or dropped entirely.
  useEffect(() => {
    if (!appIntro) return;
    // Heard here rather than in the store, so every route into an app — a
    // launcher tile, the assistant, browser back/forward — sounds the same, and
    // only an app that actually opens makes a sound. The app's place in the
    // catalog is its tone, so each app announces itself with its own note.
    playCue("app", APPS.findIndex((a) => a.id === appIntro));
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(endAppIntro, reduced ? REDUCED_MS : FULL_MS);
    return () => window.clearTimeout(id);
  }, [appIntro, endAppIntro]);

  if (!app) return null;

  return (
    <div
      // Keyed by app id so re-opening — or switching apps mid-flight — restarts
      // the animation from its first frame instead of freezing on the last.
      key={app.id}
      className="app-intro fixed inset-0 z-90 grid place-items-center overflow-hidden"
      style={
        {
          "--hue": `var(${app.hue})`,
          "--chip-grad": chipGradient(app.hue),
        } as React.CSSProperties
      }
    >
      {/* Paper, bloomed with the app's hue — opaque, so the app mounting behind
          it is never seen half-built. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-(image:--intro-wash)"
        style={
          {
            "--intro-wash":
              "radial-gradient(60rem 60rem at 50% 46%, color-mix(in srgb, var(--hue) 18%, var(--paper)), var(--paper) 68%)",
          } as React.CSSProperties
        }
      />

      <div className="relative flex flex-col items-center gap-4 min-[440px]:gap-5">
        <span aria-hidden className="relative size-20 min-[440px]:size-24">
          {/* Two rings pushing outward from under the mark — the "it opened"
              beat. Purely decorative; the second trails the first. */}
          {[0, 160].map((delay) => (
            <span
              key={delay}
              className="app-intro-ring absolute inset-0 rounded-[26px] border-2"
              style={{
                borderColor: "color-mix(in srgb, var(--hue) 45%, transparent)",
                animationDelay: `${delay}ms`,
              }}
            />
          ))}

          {/* The logo chip — the same square, gradient and radius the launcher
              tile uses, so it reads as that tile flying open. */}
          <span
            className="app-intro-chip absolute inset-0 grid place-items-center overflow-hidden rounded-[26px] bg-(image:--chip-grad) text-white"
            style={{
              boxShadow: "0 22px 50px -18px color-mix(in srgb, var(--hue) 75%, transparent)",
            }}
          >
            <span className="app-intro-glyph [&>svg]:size-10! min-[440px]:[&>svg]:size-12!">
              {app.icon}
            </span>
            {/* A single light streak across the face as it lands. */}
            <span className="app-intro-sheen absolute inset-0" />
          </span>
        </span>

        <p
          role="status"
          className="app-intro-label text-center text-[16px] font-bold tracking-[.2px] text-text min-[440px]:text-[18px]"
        >
          <span className="sr-only">Opening </span>
          {app.name}
        </p>
      </div>
    </div>
  );
}
