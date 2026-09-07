"use client";

import { LOW_CONFIDENCE, type OcrResult } from "@/lib/Ocr/blocks";

interface WordOverlayProps {
  src: string;
  alt: string;
  /** Null hides the overlay — the picture alone. */
  result: OcrResult | null;
}

/**
 * The picture, with a box round every word the engine found.
 *
 * Drawn as an SVG laid over the image in the *recognised* image's coordinate
 * system via `viewBox`, so the boxes scale with the picture at every viewport
 * width without a single measurement in JavaScript. That matters more than it
 * sounds: the obvious implementation reads the rendered image size and converts
 * each box, which then needs a resize observer and is wrong for one frame after
 * every layout change.
 *
 * Uncertain words are boxed in the danger colour and filled faintly; confident
 * ones get a hairline. The point is to answer "did it read *this* bit right?" by
 * looking, which is the only way to check OCR output quickly.
 */
export function WordOverlay({ src, alt, result }: WordOverlayProps) {
  return (
    <div className="relative">
      {/* A plain <img>: this is a user-selected blob URL of unknown dimensions,
          which is exactly what next/image cannot help with — it has no loader,
          no remote pattern and nothing to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block max-h-[52vh] w-full bg-paper object-contain" />

      {result && result.words.length > 0 && (
        <svg
          viewBox={`0 0 ${result.width} ${result.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
        >
          {result.words.map((word, index) => {
            const low = word.confidence < LOW_CONFIDENCE;
            return (
              <rect
                key={`${word.line}-${index}`}
                x={word.box.x}
                y={word.box.y}
                width={word.box.w}
                height={word.box.h}
                rx={2}
                className={low ? "fill-danger/20 stroke-danger" : "fill-none stroke-accent/70"}
                // Scaled to the image, not the screen, so the hairline stays a
                // hairline on a 4000px scan and is still visible on a 400px one.
                strokeWidth={Math.max(1, result.width / 500)}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
