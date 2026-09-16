"use client";

import { useState } from "react";
import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";
import type { ProductImage } from "@/lib/Specs/types";

/**
 * The product's photographs: one shown large, the rest as a strip beneath.
 *
 * A strip rather than a grid of equals, because these pictures are not equal —
 * they come off an encyclopedia article, where the first is the considered
 * product shot and the rest are a box, a detail, a variant in another colour.
 * Showing eight at thumbnail size would give the least useful one the same
 * weight as the best one.
 *
 * Four things here are rule #7 rather than taste. Every image carries explicit
 * `width`/`height`, so nothing below it moves when it lands. The large image
 * sits in a fixed-ratio box for the same reason — these are portrait phone
 * shots and landscape car shots in one strip, and letting the container take
 * the picture's shape would shift the whole page per selection. The thumbnails
 * are `loading="lazy"`: a ten-image strip on a phone should not cost ten
 * downloads before the specs below it are readable.
 *
 * And every one is `crossOrigin="anonymous"` with no referrer. The media host
 * sets three cookies (a geolocation, a probe limit and a unique id) on any
 * ordinary image request, which is a third-party cookie planted in the reader's
 * browser for looking at a photograph. An anonymous CORS request discards them,
 * and the host allows it (`access-control-allow-origin: *`), so the pictures
 * still load and nothing is stored. It is also what keeps Best Practices at 100.
 */
export function ImageStrip({ images = [], name }: { images?: ProductImage[]; name: string }) {
  const [shown, setShown] = useState(0);
  // `lib/Specs/client.ts` guarantees an array, so the default here is belt and
  // braces for the case that actually bit: a cached sheet from a build before
  // this field existed. Rendering nothing beats taking the whole sheet down.
  if (!images.length) return null;

  const current = images[Math.min(shown, images.length - 1)];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Pictures
        </h3>
        <a
          href={current.creditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-accent"
        >
          <ExternalLinkIcon size={12} aria-hidden="true" />
          Author and licence
        </a>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
        {/* A fixed 4:3 stage. `object-contain` keeps a tall phone and a wide car
            both whole inside it rather than cropping either. */}
        <a
          href={current.full}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the full-size picture"
          className="block aspect-[4/3] w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.thumb}
            alt={`${name} — picture ${shown + 1} of ${images.length}`}
            width={current.width || 480}
            height={current.height || 360}
            decoding="async"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="size-full object-contain p-3"
          />
        </a>

        {images.length > 1 && (
          <div
            role="tablist"
            aria-label={`Pictures of the ${name}`}
            className="scroll-slim flex gap-2 overflow-x-auto border-t border-border p-2"
          >
            {images.map((image, i) => (
              <button
                key={image.title}
                type="button"
                role="tab"
                aria-selected={i === shown}
                aria-label={`Picture ${i + 1} of ${images.length}`}
                onClick={() => setShown(i)}
                className={cx(
                  "size-14 flex-none overflow-hidden rounded-[9px] border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  i === shown ? "border-accent" : "border-border hover:border-accent",
                )}
                style={{ transition: "var(--fx)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumb}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="size-full bg-paper object-contain p-1"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] leading-snug text-ink-soft">
        From the source article. These are photographs contributors uploaded, not a manufacturer&rsquo;s
        press kit — so a colour or a variant you are looking at may not be pictured. Tap to open the
        full size, or the link above for who took it and under what licence.
      </p>
    </section>
  );
}
