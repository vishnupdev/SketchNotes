"use client";

import { useEffect, useRef, useState } from "react";
import { drawQr } from "@/lib/qr/encode";
import { cx } from "@/lib/utils";
import { PauseIcon, PlayIcon } from "@/components/SketchNotes/atoms/icons";

/** Frames a second. Slow enough for a phone to lock onto each code. */
const RATES = [3, 5, 8];

/**
 * Shows a payload as a code, or — when it needs more than one — as a loop of
 * codes the other device reads until it has them all.
 *
 * Cycling is the whole trick: a QR code holds about two kilobytes, so anything
 * bigger has to be several codes, and since the receiver can take them in any
 * order it is enough to keep showing them round and round. Nothing coordinates
 * the two devices; the sender just plays, and the receiver stops when it has a
 * full set.
 *
 * The rate is adjustable because it is a trade: faster moves more data per
 * second, but a phone that misses a frame waits a whole loop for it to come
 * round again — and a dim screen or a shaky hand misses more of them.
 */
export function FramePlayer({
  frames,
  caption,
}: {
  frames: string[];
  /** One line under the code — what this stream is. */
  caption?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [rate, setRate] = useState(5);

  // Restart from the top whenever the stream itself changes.
  useEffect(() => {
    setIndex(0);
  }, [frames]);

  useEffect(() => {
    if (frames.length < 2 || !playing) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, Math.round(1000 / rate));
    return () => window.clearInterval(id);
  }, [frames, playing, rate]);

  // Level L on purpose: these codes are read from a screen a few inches away,
  // where damage tolerance buys nothing and the extra capacity buys fewer
  // frames — which is the thing that actually makes a transfer faster.
  useEffect(() => {
    const canvas = canvasRef.current;
    const text = frames[index];
    if (!canvas || !text) return;
    void drawQr(canvas, text, { size: 512, ecc: "L", margin: 2 }).catch(() => {
      /* a frame that won't encode is a bug upstream; the loop keeps going */
    });
  }, [frames, index]);

  if (frames.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-88 overflow-hidden rounded-2xl border border-border bg-qr-light p-3">
        {/*
          The canvas is drawn at 512px for sharpness and displayed to fit, and
          the absolutely-positioned wrapper is what makes "to fit" work: a
          percentage size on a replaced element needs a *definite* containing
          block, and an auto-sized grid or flex track is not one — the canvas
          would keep its intrinsic 512 and spill out of the frame.
        */}
        <div className="absolute inset-3">
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            role="img"
            aria-label={
              frames.length > 1
                ? `Transfer code ${index + 1} of ${frames.length}`
                : "Transfer code"
            }
            className="size-full object-contain"
          />
        </div>
      </div>

      {caption && <p className="text-center text-[12.5px] text-ink-soft">{caption}</p>}

      {frames.length > 1 && (
        <>
          {/* Which part is on screen, and how much of the loop has gone by. A
              receiver's own progress is the number that matters, but this shows
              the sender that something is actually happening. */}
          <div
            className="h-1.5 w-full max-w-88 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Position in the code loop"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={frames.length}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${((index + 1) / frames.length) * 100}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
              {playing ? "Pause" : "Play"}
            </button>
            <span className="font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
              part {index + 1} / {frames.length}
            </span>
            <span className="flex gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  aria-current={r === rate}
                  className={cx(
                    "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold",
                    r === rate
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-panel text-ink-soft hover:text-text",
                  )}
                >
                  {r}/s
                </button>
              ))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
