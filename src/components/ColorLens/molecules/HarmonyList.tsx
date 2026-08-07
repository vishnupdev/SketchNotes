"use client";

import { useMemo } from "react";
import { Swatch } from "@/components/ColorLens/atoms/Swatch";
import { CopyButton } from "@/components/ColorLens/atoms/CopyButton";
import { harmonies, ramp } from "@/lib/ColorLens/harmony";

interface HarmonyListProps {
  hex: string;
  onSelect: (hex: string) => void;
}

/**
 * The classic colour-wheel schemes built from the picked colour, plus its
 * tint/shade ramp. Every swatch is itself pickable, so a scheme colour can be
 * inspected in full without going back to the image.
 */
export function HarmonyList({ hex, onSelect }: HarmonyListProps) {
  // Six hue rotations and a nine-step ramp per pick — cheap, but recomputing
  // them on unrelated re-renders would churn the whole swatch grid.
  const schemes = useMemo(() => harmonies(hex), [hex]);
  const steps = useMemo(() => ramp(hex), [hex]);

  return (
    <section
      aria-labelledby="colorlens-harmony"
      className="rounded-2xl border border-border bg-panel p-4 shadow-panel sm:p-5"
    >
      <h3 id="colorlens-harmony" className="text-[15px] font-bold tracking-[.1px]">
        Colours that go with it
      </h3>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        Select any swatch to read it in full.
      </p>

      <div className="mt-4 space-y-4">
        {schemes.map((scheme) => (
          <div key={scheme.id}>
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-[13px] font-semibold text-text">{scheme.label}</h4>
              <CopyButton value={scheme.hexes.join(", ")} label={`${scheme.label} palette`} size={13} />
            </div>
            <p className="text-[11.5px] text-ink-soft">{scheme.note}</p>
            <ul role="list" className="mt-2 flex flex-wrap gap-2">
              {scheme.hexes.map((value, i) => (
                <li key={`${value}-${i}`} className="w-[calc(50%-4px)] min-[420px]:w-[86px]">
                  <Swatch
                    hex={value}
                    size="sm"
                    onSelect={onSelect}
                    selected={value === hex}
                    context={scheme.label}
                  >
                    <span className="block truncate font-mono text-[10.5px] uppercase text-ink-soft">
                      {value}
                    </span>
                  </Swatch>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-text">Tints &amp; shades</h4>
            <CopyButton value={steps.join(", ")} label="Tints and shades" size={13} />
          </div>
          <p className="text-[11.5px] text-ink-soft">
            The same colour lightened toward white and darkened toward black.
          </p>
          <ul role="list" className="mt-2 flex overflow-hidden rounded-xl border border-border">
            {steps.map((value, i) => (
              <li key={`${value}-${i}`} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelect(value)}
                  aria-label={`Select ${value}`}
                  title={value}
                  className="block h-11 w-full transition-transform hover:scale-y-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  style={{ background: value }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
