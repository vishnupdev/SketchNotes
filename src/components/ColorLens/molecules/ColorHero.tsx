"use client";

import { CopyButton } from "@/components/ColorLens/atoms/CopyButton";
import { shortHex } from "@/lib/ColorLens/convert";
import type { ColorDetail } from "@/lib/ColorLens/types";

interface ColorHeroProps {
  detail: ColorDetail;
}

const TEMPERATURE_LABEL: Record<ColorDetail["temperature"], string> = {
  warm: "Warm",
  cool: "Cool",
  neutral: "Neutral",
};

/**
 * The headline for the current colour: the colour itself at size, its hex, and
 * the nearest name people would actually use for it.
 *
 * Text inside the block is set in whichever of black/white contrasts better
 * against the sampled colour, so the heading stays legible for any pick — the
 * one place the app can't use a theme token, since the background is the user's
 * own colour.
 */
export function ColorHero({ detail }: ColorHeroProps) {
  const compact = shortHex(detail.hex);

  return (
    <section
      aria-labelledby="colorlens-current"
      className="overflow-hidden rounded-2xl border border-border bg-panel shadow-panel"
    >
      <div
        className="flex flex-wrap items-end justify-between gap-3 px-5 py-8 sm:px-7 sm:py-11"
        style={{ background: detail.hex, color: detail.bestText }}
      >
        <div>
          {/* No opacity anywhere in this block. `bestText` picks whichever of
              black/white contrasts better with the sampled colour, which is
              never worse than 4.58:1 — but fading it would push small text
              under the 4.5:1 AA floor for some colours. */}
          <p className="font-mono text-[10px] uppercase tracking-[.2em]">Picked colour</p>
          <h2 id="colorlens-current" className="mt-1 text-[34px] font-extrabold uppercase leading-none tracking-tight sm:text-[42px]">
            {detail.hex}
          </h2>
          <p className="mt-2 text-[15px] font-semibold">
            {detail.name.exact ? detail.name.name : `Closest to ${detail.name.name}`}
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[.16em]">
          {TEMPERATURE_LABEL[detail.temperature]} · {detail.brightness}% bright
          {compact && ` · ${compact}`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { label: "Hex", value: detail.hex },
          { label: "RGB", value: `${detail.rgb.r}, ${detail.rgb.g}, ${detail.rgb.b}` },
          { label: "HSL", value: `${detail.hsl.h}, ${detail.hsl.s}%, ${detail.hsl.l}%` },
          { label: "Name", value: detail.name.name },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-1 bg-panel px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <dt className="font-mono text-[9.5px] uppercase tracking-[.16em] text-ink-soft">
                {row.label}
              </dt>
              <dd className="truncate text-[13.5px] font-semibold text-text">{row.value}</dd>
            </div>
            <CopyButton value={row.value} label={row.label} size={14} />
          </div>
        ))}
      </dl>
    </section>
  );
}
