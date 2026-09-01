"use client";

import { useEffect, useRef, useState } from "react";
import { drawQr } from "@/lib/qr/encode";
import type { QrEcc } from "@/lib/qr/types";

/** How many codes are drawn before the grid asks whether you want the rest. */
const FIRST_BATCH = 24;
const BATCH = 48;

/** One code, drawn once. */
function Code({ text, index, total, ecc }: { text: string; index: number; total: number; ecc: QrEcc }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void drawQr(canvas, text, { size: 320, ecc, margin: 2 }).catch(() => {
      /* a code that won't encode is a bug upstream; the rest of the grid stands */
    });
  }, [text, ecc]);

  return (
    <figure className="flex flex-col items-center gap-1">
      <div className="w-full overflow-hidden rounded-xl border border-border bg-qr-light p-1.5">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          role="img"
          aria-label={`Code ${index + 1} of ${total}`}
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="font-mono text-[10px] tracking-[.08em] text-ink-soft">
        {index + 1} / {total}
      </figcaption>
    </figure>
  );
}

/**
 * Every code at once, as the sheet they would print as.
 *
 * Drawn in batches rather than all at once: a 4 MB file is thousands of codes,
 * and mounting thousands of canvases is how a phone loses the tab. The first
 * two dozen are enough to see what the sheet looks like and to scan a small
 * file straight off the screen; anything beyond that is asked for, and the
 * print and download buttons above work on the full set either way.
 */
export function CodeGrid({ frames, ecc }: { frames: string[]; ecc: QrEcc }) {
  const [shown, setShown] = useState(FIRST_BATCH);

  // A new file starts the grid over, or the previous file's tail stays drawn.
  useEffect(() => {
    setShown(FIRST_BATCH);
  }, [frames]);

  const visible = frames.slice(0, shown);
  const remaining = frames.length - visible.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 min-[720px]:grid-cols-4">
        {visible.map((text, i) => (
          <Code key={i} text={text} index={i} total={frames.length} ecc={ecc} />
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[12px] text-ink-soft">
            {remaining} more code{remaining === 1 ? "" : "s"} not drawn yet.
          </p>
          <button
            type="button"
            onClick={() => setShown((n) => n + BATCH)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Draw {Math.min(BATCH, remaining)} more
          </button>
        </div>
      )}
    </div>
  );
}
