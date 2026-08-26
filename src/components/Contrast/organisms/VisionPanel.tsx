"use client";

import { useMemo } from "react";
import { MAX_PALETTE, useContrastStore } from "@/store/useContrastStore";
import { CONFUSABLE, VISION_MODES, separation, simulateHex } from "@/lib/Contrast/vision";
import { bestTextOn } from "@/lib/Contrast/wcag";
import { ColorField } from "@/components/Contrast/molecules/ColorField";
import { PlusIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Preview a palette under colour-vision deficiency, and name the pairs that
 * collide.
 *
 * The simulated swatches alone are not enough — with eight colours on screen it is
 * genuinely hard to spot which two became the same, and "look carefully" is not a
 * check. So the panel does the comparison: every pair is measured after
 * simulation, and the ones that land too close together are listed explicitly.
 * That list is the output; the swatches are the explanation.
 */
export function VisionPanel() {
  const palette = useContrastStore((s) => s.palette);
  const vision = useContrastStore((s) => s.vision);
  const setVision = useContrastStore((s) => s.setVision);
  const setSwatch = useContrastStore((s) => s.setSwatch);
  const removeSwatch = useContrastStore((s) => s.removeSwatch);
  const addSwatch = useContrastStore((s) => s.addSwatch);

  const mode = VISION_MODES.find((m) => m.id === vision) ?? VISION_MODES[0];

  // Every unordered pair, with how far apart it is once simulated.
  const collisions = useMemo(() => {
    const out: { a: number; b: number; distance: number }[] = [];
    for (let i = 0; i < palette.length; i++) {
      for (let j = i + 1; j < palette.length; j++) {
        const distance = separation(palette[i], palette[j], vision);
        if (distance < CONFUSABLE) out.push({ a: i, b: j, distance });
      }
    }
    return out.sort((x, y) => x.distance - y.distance);
  }, [palette, vision]);

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {VISION_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setVision(m.id)}
            aria-current={m.id === vision}
            className={cx(
              "flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              m.id === vision
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-soft">{mode.note}</p>

      {/* Two rows, aligned: what you specified, and what it becomes. Side by side
          rather than a toggle, because the comparison *is* the finding. */}
      <section aria-labelledby="vision-grid" className="rounded-[14px] border border-border bg-panel p-3">
        <h2
          id="vision-grid"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Your palette, then simulated
        </h2>

        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {palette.map((hex, i) => (
              <div
                key={`orig-${i}`}
                className="grid h-16 min-w-[68px] flex-1 place-items-center rounded-[10px] border border-border font-mono text-[10.5px] uppercase"
                style={{ background: hex, color: bestTextOn(hex).hex }}
              >
                {hex.slice(1)}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {palette.map((hex, i) => {
              const sim = simulateHex(hex, vision);
              const flagged = collisions.some((c) => c.a === i || c.b === i);
              return (
                <div
                  key={`sim-${i}`}
                  className={cx(
                    "grid h-16 min-w-[68px] flex-1 place-items-center rounded-[10px] font-mono text-[10.5px] uppercase",
                    flagged ? "border-2 border-danger" : "border border-border",
                  )}
                  style={{ background: sim, color: bestTextOn(sim).hex }}
                >
                  {sim.slice(1)}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="vision-collisions"
        className={cx(
          "rounded-[14px] border p-3",
          collisions.length > 0 ? "border-danger/50 bg-panel" : "border-accent/40 bg-accent-soft",
        )}
      >
        <h2
          id="vision-collisions"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Confusable pairs
        </h2>
        {collisions.length === 0 ? (
          <p className="mt-1.5 text-[13px] font-semibold text-accent">
            {vision === "normal"
              ? "Nothing to check — pick a deficiency above."
              : "No two of these colours collapse together. This palette holds up."}
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {collisions.map(({ a, b, distance }) => (
              <li key={`${a}-${b}`} className="flex items-center gap-2 text-[12.5px]">
                <span
                  aria-hidden
                  className="size-5 flex-none rounded-md border border-border"
                  style={{ background: palette[a] }}
                />
                <span
                  aria-hidden
                  className="size-5 flex-none rounded-md border border-border"
                  style={{ background: palette[b] }}
                />
                <span className="min-w-0 flex-1">
                  <b className="font-mono font-semibold uppercase">{palette[a]}</b> and{" "}
                  <b className="font-mono font-semibold uppercase">{palette[b]}</b> become nearly the
                  same colour
                </span>
                <span className="flex-none font-mono text-[10.5px] tabular-nums text-ink-soft">
                  {(distance * 100).toFixed(0)}% apart
                </span>
              </li>
            ))}
          </ul>
        )}
        {collisions.length > 0 && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
            If either colour carries meaning on its own — a status dot, a chart series — add a second
            signal: a label, a shape, an icon or a pattern. Colour alone cannot be the only way to
            tell these apart.
          </p>
        )}
      </section>

      <section aria-labelledby="vision-edit" className="flex flex-col gap-2">
        <h2
          id="vision-edit"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          The palette
        </h2>
        <div className="grid gap-2 min-[560px]:grid-cols-2">
          {palette.map((hex, i) => (
            <ColorField
              key={i}
              label={`Colour ${i + 1}`}
              value={hex}
              onChange={(next) => setSwatch(i, next)}
              onRemove={palette.length > 2 ? () => removeSwatch(i) : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => addSwatch("#888888")}
          disabled={palette.length >= MAX_PALETTE}
          className="tint inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <PlusIcon size={14} />
          {palette.length >= MAX_PALETTE ? `Twelve is the limit` : "Add a colour"}
        </button>
      </section>
    </div>
  );
}
