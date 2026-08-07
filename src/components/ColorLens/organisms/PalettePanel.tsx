"use client";

import { cx } from "@/lib/utils";
import { PALETTE_SIZES, useColorLensStore } from "@/store/useColorLensStore";
import { PaletteGrid } from "@/components/ColorLens/molecules/PaletteGrid";
import { ExportBar } from "@/components/ColorLens/molecules/ExportBar";
import { Swatch } from "@/components/ColorLens/atoms/Swatch";

/**
 * The whole-image view: which colours the picture is actually made of, how much
 * of it each one covers, and a way to take the set somewhere else.
 */
export function PalettePanel() {
  const palette = useColorLensStore((s) => s.palette);
  const paletteSize = useColorLensStore((s) => s.paletteSize);
  const averageHex = useColorLensStore((s) => s.averageHex);
  const pickedHex = useColorLensStore((s) => s.pickedHex);
  const imageName = useColorLensStore((s) => s.imageName);
  const analyzing = useColorLensStore((s) => s.analyzing);
  const setPaletteSize = useColorLensStore((s) => s.setPaletteSize);
  const pick = useColorLensStore((s) => s.pick);

  if (analyzing) {
    return (
      <section className="rounded-2xl border border-border bg-panel p-5 shadow-panel">
        <p role="status" className="text-center text-[13px] text-ink-soft">
          Reading the image&rsquo;s colours…
        </p>
      </section>
    );
  }

  if (palette.length === 0) return null;

  return (
    <section
      aria-labelledby="colorlens-palette"
      className="rounded-2xl border border-border bg-panel p-4 shadow-panel sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="colorlens-palette" className="text-[15px] font-bold tracking-[.1px]">
            Palette of this image
          </h3>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            The dominant colours, largest area first.
          </p>
        </div>

        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Number of swatches</legend>
          <span aria-hidden className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Swatches
          </span>
          <div className="flex gap-1">
            {PALETTE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPaletteSize(size)}
                aria-pressed={paletteSize === size}
                aria-label={`Show ${size} swatches`}
                className={cx(
                  "rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  paletteSize === size
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-paper text-ink-soft hover:border-accent hover:text-text",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4">
        <PaletteGrid palette={palette} selectedHex={pickedHex} onSelect={pick} />
      </div>

      {averageHex && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-paper p-3">
          <div className="w-[76px] shrink-0">
            <Swatch
              hex={averageHex}
              size="sm"
              onSelect={pick}
              selected={averageHex === pickedHex}
              context="the image's average colour"
            />
          </div>
          <p className="text-[12.5px] leading-snug text-ink-soft">
            <b className="font-semibold text-text">Average colour</b> — every pixel blended into
            one. Useful as a background that sits behind the whole picture.
          </p>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <ExportBar palette={palette} imageName={imageName} />
      </div>
    </section>
  );
}
