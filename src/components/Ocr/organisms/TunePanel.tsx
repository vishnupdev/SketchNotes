"use client";

import { useOcrStore } from "@/store/useOcrStore";
import { OpenPicture } from "@/components/Ocr/molecules/OpenPicture";
import { MAX_PIXELS, suggestScale } from "@/lib/Ocr/preprocess";
import { cx } from "@/lib/utils";
import { RotateIcon, ScanTextIcon } from "@/components/SketchNotes/atoms/icons";

const SCALES = [1, 1.5, 2, 3, 4];

/**
 * What the engine is actually given — and the controls that change it.
 *
 * This tab exists because the preprocessing is the difference between a usable
 * read and nonsense, and every browser OCR tool hides it. Tesseract was built
 * for scanned pages at about 300 DPI, black on white and square to the page; a
 * photograph of a receipt is none of those. Upscaling a small picture and
 * deciding each pixel is ink or paper routinely moves a read from 60% to 95%.
 *
 * The preview is not a mock-up of the effect — it *is* the bitmap that will be
 * handed to the engine, rendered through the same code path. Showing an
 * approximation here would be worse than showing nothing, because the whole
 * purpose is to let someone judge whether the text is still legible after the
 * transformation.
 */
export function TunePanel() {
  const picture = useOcrStore((s) => s.picture);
  const preview = useOcrStore((s) => s.preview);
  const scaleNote = useOcrStore((s) => s.scaleNote);
  const tune = useOcrStore((s) => s.tune);
  const patch = useOcrStore((s) => s.patchTune);
  const reset = useOcrStore((s) => s.resetTune);
  const read = useOcrStore((s) => s.read);
  const busy = useOcrStore((s) => s.busy);

  if (!picture) return <OpenPicture />;

  const suggested = suggestScale(picture.width, picture.height);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="m-0 overflow-hidden rounded-[14px] border border-border bg-panel">
          <figcaption className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">
            The picture
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={picture.url}
            alt="The picture as opened"
            className="block max-h-[30vh] w-full bg-paper object-contain"
          />
        </figure>

        <figure className="m-0 overflow-hidden rounded-[14px] border border-accent/40 bg-panel">
          <figcaption className="border-b border-accent/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-accent">
            What the engine sees
          </figcaption>
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="The same picture after the adjustments below, which is exactly what the engine is given"
              className="block max-h-[30vh] w-full bg-paper object-contain"
            />
          ) : (
            <p className="p-4 text-[12px] text-ink-soft">Preparing…</p>
          )}
        </figure>
      </div>

      <p className="text-[11.5px] text-ink-soft">{scaleNote}</p>

      <div className="rounded-[14px] border border-border bg-panel p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[13.5px] font-bold">Scale</h3>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft hover:border-accent hover:text-accent"
          >
            Reset all
          </button>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
          The biggest lever, and the least obvious. The engine wants a capital letter around 20–30
          pixels tall; screenshots and phone photos of small print are often half that.{" "}
          {suggested > 1
            ? `${suggested}× was chosen for this picture from its size.`
            : "This picture is already large enough, so 1× was chosen."}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SCALES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => patch({ scale: value })}
              aria-pressed={tune.scale === value}
              className={cx(
                "rounded-full border px-3 py-1.5 font-mono text-[11.5px] tabular-nums",
                tune.scale === value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {value}×{value === suggested ? " ·" : ""}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-soft">
          Capped at {(MAX_PIXELS / 1e6).toFixed(0)} megapixels however high you set it — beyond that
          the engine runs out of memory rather than running slowly.
        </p>
      </div>

      <div className="rounded-[14px] border border-border bg-panel p-3.5">
        <h3 className="text-[13.5px] font-bold">Ink and paper</h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
          Deciding each pixel is ink or paper removes the shading, JPEG mush and coloured background
          that the classifier otherwise reads as texture. Auto picks the cut by Otsu&rsquo;s method —
          the level that best splits this picture&rsquo;s own histogram in two, which is why it
          copes with a shadowed page where a fixed mid-grey turns everything black.
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(
            [
              { id: "auto", label: "Auto" },
              { id: "off", label: "Off" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => patch({ threshold: option.id })}
              aria-pressed={
                option.id === "auto" ? tune.threshold === "auto" : tune.threshold === "off"
              }
              className={cx(
                "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                (option.id === "auto" ? tune.threshold === "auto" : tune.threshold === "off")
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => patch({ threshold: typeof tune.threshold === "number" ? "auto" : 128 })}
            aria-pressed={typeof tune.threshold === "number"}
            className={cx(
              "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
              typeof tune.threshold === "number"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-ink-soft hover:border-accent hover:text-accent",
            )}
          >
            By hand
          </button>
        </div>

        {typeof tune.threshold === "number" && (
          <div className="mt-3">
            <label
              htmlFor="ocr-threshold"
              className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft"
            >
              Cut at
              <span className="tabular-nums">{tune.threshold}</span>
            </label>
            <input
              id="ocr-threshold"
              type="range"
              min={1}
              max={254}
              value={tune.threshold}
              onChange={(event) => patch({ threshold: Number(event.target.value) })}
              className="mt-1.5 w-full accent-accent"
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Toggle on={tune.invert} onClick={() => patch({ invert: !tune.invert })}>
            Invert
          </Toggle>
          <Toggle
            on={tune.contrast !== 1}
            onClick={() => patch({ contrast: tune.contrast === 1 ? 1.6 : 1 })}
          >
            More contrast
          </Toggle>
          <button
            type="button"
            onClick={() => patch({ rotate: (((tune.rotate + 1) % 4) as 0 | 1 | 2 | 3) })}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
          >
            <RotateIcon size={13} />
            Rotate{tune.rotate > 0 ? ` (${tune.rotate * 90}°)` : ""}
          </button>
        </div>

        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-soft">
          <strong className="font-semibold">Invert</strong> is for light text on a dark background —
          a terminal, a dark-mode screenshot — which otherwise reads as a solid black page. It is
          applied before the ink/paper decision, so the engine sees the histogram the right way up.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void read()}
        disabled={busy}
        className="tint inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-[14px] font-bold text-on-accent disabled:opacity-45"
      >
        <ScanTextIcon size={16} />
        {busy ? "Reading…" : "Read it with these settings"}
      </button>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
        on
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-ink-soft hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}
