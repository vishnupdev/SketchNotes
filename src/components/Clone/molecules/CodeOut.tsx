"use client";

import { useEffect, useRef, useState } from "react";
import { drawQr } from "@/lib/qr/encode";
import { buildFrames, type StreamKind } from "@/lib/qr/frames";
import { cx } from "@/lib/utils";
import { CheckIcon, CopyIcon, QrIcon } from "@/components/SketchNotes/atoms/icons";
import { FramePlayer } from "@/components/SketchNotes/molecules/FramePlayer";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

/**
 * Handing this device's half of the introduction to the other one.
 *
 * There is no signalling server anywhere in this workspace, so the two devices
 * are introduced *by the person using them*. That sounds like a limitation and
 * is actually the feature: it means a clone over a USB cable involves nothing
 * but the cable, and a clone with no network at all is still possible.
 *
 * Three ways to carry it, because the right one depends on where the other
 * device is. In the room: show the code and point the other camera at it. In
 * another room: copy the link — the code sits after the `#`, which browsers
 * never send to a server, so the invite reaches the other device without
 * passing through one. Anywhere at all: copy the raw token into any chat app.
 *
 * The code is in a read-only textarea rather than as text so one gesture
 * selects it, and so it can still be read when the clipboard is refused.
 */
export function CodeOut({
  code,
  link,
  kind,
  title,
  hint,
  /** Start with the QR open — right when the other device is in the room. */
  qrFirst = false,
}: {
  code: string;
  /** Full invite URL, when this code is an invitation rather than a reply. */
  link?: string;
  /** Which half of the introduction this is, so the reader can tell them apart. */
  kind: Extract<StreamKind, "offer" | "answer">;
  title: string;
  hint: string;
  qrFirst?: boolean;
}) {
  const [showQr, setShowQr] = useState(qrFirst);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shareText = link ?? code;

  // A connection code is a couple of kilobytes, so it rarely fits one QR — the
  // chunked frame channel handles that, and a short code becomes a single frame.
  useEffect(() => {
    if (!showQr || !code) return;
    let cancelled = false;
    void buildFrames(shareText, kind).then((built) => {
      if (!cancelled) setFrames(built);
    });
    return () => {
      cancelled = true;
    };
  }, [showQr, code, shareText, kind]);

  // One frame is drawn here rather than through the player, so the common case
  // has no controls and nothing moving.
  useEffect(() => {
    if (!showQr || frames.length !== 1 || !canvasRef.current) return;
    void drawQr(canvasRef.current, frames[0], { size: 512, ecc: "L", margin: 2 }).catch(() => {
      /* a code that won't encode is a bug upstream; the panel stays usable */
    });
  }, [showQr, frames]);

  const copy = async (what: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? shareText : code);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard refused — the field below is selectable */
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-paper p-3.5">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{hint}</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {link ? "Invite link" : "Reply code"}
        </span>
        <textarea
          readOnly
          rows={3}
          value={shareText}
          aria-label={link ? "Invite link to send to the other device" : "Reply code"}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-y rounded-[9px] border-[1.5px] border-border bg-panel px-2.5 py-2 font-mono text-[11.5px] wrap-anywhere text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy("link")} className={BTN}>
          {copied === "link" ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          {copied === "link" ? "Copied" : link ? "Copy link" : "Copy code"}
        </button>
        {link && (
          <button type="button" onClick={() => void copy("code")} className={BTN}>
            {copied === "code" ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
            {copied === "code" ? "Copied" : "Copy code only"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          aria-expanded={showQr}
          className={cx(BTN, showQr && "border-accent text-accent")}
        >
          <QrIcon size={15} />
          {showQr ? "Hide code" : "Show as QR"}
        </button>
      </div>

      {showQr && frames.length === 1 && (
        <div className="relative mx-auto aspect-square w-full max-w-72 overflow-hidden rounded-2xl border border-border bg-qr-light p-3">
          <div className="absolute inset-3">
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              role="img"
              aria-label="Connection code"
              className="size-full object-contain"
            />
          </div>
        </div>
      )}
      {showQr && frames.length > 1 && (
        <FramePlayer
          frames={frames}
          caption="Point the other device's camera at this until it has every part."
        />
      )}
    </div>
  );
}
