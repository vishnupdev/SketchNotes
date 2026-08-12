"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { APPS, chipGradient } from "@/components/AppCatalog";
import { SITE_TAGLINE } from "@/lib/site";

/**
 * How long the whole sequence runs before the layer is torn down. Kept in step
 * with the `boot-*` keyframes in globals.css: the veil's fade-out finishes just
 * before this fires, so the layer is removed on a blank frame.
 */
const FULL_MS = 1800;
/** The reduced-motion version is a plain cross-fade, so it needn't linger. */
const REDUCED_MS = 420;

/**
 * The wordmark, as the two words it is set in. `SITE_NAME` is the compound
 * spelling ("OneApp") used everywhere text has to match the brand; the splash
 * spaces it out, which is why it is written here rather than derived.
 */
const WORDS = ["One", "App"];

/** Letters in the wordmark, and the seam it unfolds from (between "e" and "A"). */
const LETTER_COUNT = WORDS.join("").length;
const SEAM = (LETTER_COUNT - 1) / 2;

/** When the letters start, in ms — the beat the chips collapse on. */
const LETTERS_AT = 500;
/** How much later each letter unfolds, per step away from the seam. */
const LETTER_STEP = 62;

/**
 * The tools that gather into the mark: one chip per app, coming in from a ring
 * outside the viewport. Each gets its own approach angle, distance and spin so
 * they arrive as a scatter rather than a formation — the distances are in `vmax`
 * so they start off-screen at any aspect ratio.
 *
 * Twelve is a full ring with no crowding; the catalog order gives that a spread
 * of hues without having to choose them here.
 */
const TILES = APPS.slice(0, 12).map((app, i) => {
  const rad = (((i * 360) / 12 + (i % 3) * 11) * Math.PI) / 180;
  const dist = 62 + (i % 4) * 8;
  return {
    app,
    tx: `${(Math.cos(rad) * dist).toFixed(1)}vmax`,
    ty: `${(Math.sin(rad) * dist).toFixed(1)}vmax`,
    spin: `${(i % 2 ? 1 : -1) * (40 + i * 6)}deg`,
    delay: (i % 5) * 22,
  };
});

/**
 * The workspace's opening animation, in four beats: every app's chip flies in
 * from off-screen and collapses into one point, that point bursts, the "One App"
 * wordmark unfolds out of it from the middle outward, and a drawn ink stroke
 * underlines it before the layer clears to the workspace.
 *
 * The sequence is the product's one-line pitch — many tools arriving in one
 * place — which is why the chips are the real catalog entries (`APPS`) in their
 * real brand hues rather than decorative shapes.
 *
 * It plays once per page load. Rendered on the server too — that is the point:
 * the veil is in the very first paint, so the workspace is never seen
 * half-built behind it, and the palette swap that `useEditorEngine` performs on
 * mount (the body ships with the default theme and adopts the stored one) also
 * happens out of sight.
 *
 * It is a flourish, not a loading state: nothing waits on it, and the layer
 * clears on a timer regardless of what has finished booting. It does swallow
 * pointer input while it plays, for the same reason {@link AppIntro} does — for
 * the second the veil is opaque, a tap would land on a control the user cannot
 * see. Nothing here is focusable, so the keyboard is unaffected, and the whole
 * layer is `aria-hidden`: it is the brand, not content, and the workspace it
 * covers is what a screen reader should be reading.
 */
export function BootSplash() {
  // Starts shown, in both renders, so hydration matches and the first frame is
  // the veil rather than the workspace.
  const [done, setDone] = useState(false);

  // A timer, not `animationend`: it stays correct if the animations are
  // shortened, replaced by the reduced-motion rules, or dropped entirely.
  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setDone(true), reduced ? REDUCED_MS : FULL_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      // Above <AppIntro /> (z-90): a deep link that opens straight into an app
      // plays neither, but nothing should ever appear over the boot veil.
      className="boot-splash fixed inset-0 z-100 grid place-items-center overflow-hidden bg-paper select-none"
    >
      {/* Paper, bloomed with the accent — opaque, so the workspace mounting
          behind it is never seen through the veil. */}
      <div
        className="absolute inset-0 bg-(image:--boot-wash)"
        style={
          {
            "--boot-wash":
              "radial-gradient(60rem 60rem at 50% 46%, color-mix(in srgb, var(--accent) 15%, var(--paper)), var(--paper) 70%)",
          } as CSSProperties
        }
      />

      {/* Beat one: the apps converge. Each chip is centred by its margins, so
          its transform is free to carry the whole flight in one animation. */}
      {TILES.map(({ app, tx, ty, spin, delay }) => (
        <span
          key={app.id}
          className="boot-tile absolute top-1/2 left-1/2 -mt-[22px] -ml-[22px] grid size-11 place-items-center rounded-[14px] bg-(image:--chip-grad) text-white [&>svg]:size-5!"
          style={
            {
              "--chip-grad": chipGradient(app.hue),
              "--tx": tx,
              "--ty": ty,
              "--spin": spin,
              "--boot-delay": `${delay}ms`,
              boxShadow: `0 14px 30px -14px color-mix(in srgb, var(${app.hue}) 70%, transparent)`,
            } as CSSProperties
          }
        >
          {app.icon}
        </span>
      ))}

      {/* Beat two: the collapse lands. Two rings push out of the point the chips
          met at, the second trailing the first. */}
      {[440, 540].map((at) => (
        <span
          key={at}
          className="boot-burst absolute size-44 rounded-full border-2"
          style={
            {
              borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
              "--boot-delay": `${at}ms`,
            } as CSSProperties
          }
        />
      ))}

      <div className="boot-mark relative flex flex-col items-center gap-4 min-[440px]:gap-5">
        {/* The halo the wordmark unfolds inside, blooming on the same impact. */}
        <span
          className="boot-glow absolute inset-0 -m-24 rounded-full bg-(image:--boot-glow)"
          style={
            {
              "--boot-glow":
                "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 26%, transparent), transparent 72%)",
            } as CSSProperties
          }
        />

        {/* Beat three: the wordmark. Its own stacking context, so the drawn
            stroke can sit under the letters without joining the column's
            width — otherwise the longer tagline below would stretch it. */}
        <div className="relative">
          <p className="flex items-baseline gap-[0.26em] text-[44px] leading-none font-extrabold tracking-[-0.03em] text-text [perspective:700px] min-[440px]:text-[68px]">
            {WORDS.map((word, w) => {
              // Letters already spent by the earlier words, so a letter's
              // distance from the seam is measured across the whole wordmark.
              const offset = WORDS.slice(0, w).join("").length;
              return (
                <span key={word} className={w === 1 ? "text-accent" : undefined}>
                  {[...word].map((char, i) => (
                    <span
                      key={`${char}${i}`}
                      className="boot-letter inline-block"
                      // A variable rather than `animationDelay`, so the
                      // reduced-motion rules can zero it — an inline delay
                      // would survive their override and hold the letter back
                      // past the point the layer is torn down.
                      style={
                        {
                          "--boot-delay": `${LETTERS_AT + Math.abs(offset + i - SEAM) * LETTER_STEP}ms`,
                        } as CSSProperties
                      }
                    >
                      {char}
                    </span>
                  ))}
                </span>
              );
            })}
          </p>

          {/* Beat four: a hand-drawn stroke under the word — the flagship app is
              a sketch canvas, so the mark signs itself off in ink. Wobbled on
              purpose; `pathLength` normalises the draw-on to a 1→0 dash offset,
              so the path can be reshaped without retuning the CSS.
              Scaled uniformly (no `preserveAspectRatio="none"`, no
              `non-scaling-stroke`): both distort the dash geometry the draw-on
              depends on, and a squashed viewBox would thin the stroke as well. */}
          <svg
            viewBox="0 0 200 12"
            aria-hidden
            className="boot-ink absolute top-full left-0 -mt-1 w-full overflow-visible text-accent"
          >
            <path
              d="M2 7C36 3 68 8.6 102 4.8S158 8.6 198 3.8"
              pathLength={1}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="boot-tagline relative text-[12px] font-medium tracking-[0.14em] text-ink-soft uppercase min-[440px]:text-[13px]">
          {SITE_TAGLINE}
        </p>
      </div>
    </div>
  );
}
