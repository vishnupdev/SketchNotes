"use client";

import { useEffect, useRef, useState } from "react";
import { drawQr, payloadBytes, QR_BYTE_CAPACITY } from "@/lib/qr/encode";
import type { QrEcc } from "@/lib/qr/types";

/**
 * The code itself, drawn to a canvas as the fields change.
 *
 * Redrawing is cheap (the encoder is fast and the canvas is small) so there is
 * no debounce: typing a link shows the code changing under it, which is a
 * legible way of showing that the pattern *is* the text.
 *
 * The canvas keeps its box at every state — code, empty, or too long — so the
 * page never jumps as you type (rule #7).
 */
export function QrPreview({
  text,
  size,
  ecc,
}: {
  text: string;
  size: number;
  ecc: QrEcc;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  const bytes = payloadBytes(text);
  const capacity = QR_BYTE_CAPACITY[ecc];
  const tooLong = bytes > capacity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text || tooLong) return;
    let cancelled = false;
    void drawQr(canvas, text, { size, ecc })
      .then(() => {
        if (!cancelled) setError("");
      })
      .catch(() => {
        if (!cancelled) setError("That content couldn't be encoded as a QR code.");
      });
    return () => {
      cancelled = true;
    };
  }, [text, size, ecc, tooLong]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative grid aspect-square w-full max-w-80 place-items-center overflow-hidden rounded-2xl border border-border bg-qr-light p-3"
        aria-live="polite"
      >
        {text && !tooLong && !error ? (
          /*
           * Drawn at `size` device pixels and displayed to fit, so the code stays
           * crisp when it is saved larger than it is shown. The absolute wrapper
           * is what gives "to fit" a definite box to resolve against — inside an
           * auto-sized grid track a percentage size on a canvas falls back to its
           * intrinsic pixels and overflows the frame.
           */
          <div className="absolute inset-3">
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="size-full object-contain"
              role="img"
              aria-label="QR code for the content below"
            />
          </div>
        ) : (
          <p className="max-w-[26ch] px-4 text-center text-[12.5px] leading-relaxed text-qr-dark/60">
            {tooLong
              ? `That's ${bytes} bytes — a QR code at level ${ecc} holds ${capacity}. Shorten it, or drop to level L.`
              : error || "Fill in the fields to see the code."}
          </p>
        )}
      </div>
      {text && !tooLong && (
        <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
          {bytes} / {capacity} bytes · level {ecc}
        </p>
      )}
    </div>
  );
}
