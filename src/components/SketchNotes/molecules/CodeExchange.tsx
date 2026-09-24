"use client";

import { useEffect, useRef, useState } from "react";
import { drawQr } from "@/lib/qr/encode";
import { buildFrames } from "@/lib/qr/frames";
import { CheckIcon, CopyIcon, QrIcon, ShareIcon } from "@/components/SketchNotes/atoms/icons";
import { FramePlayer } from "@/components/SketchNotes/molecules/FramePlayer";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
// Whole strings per state: layering `border-accent` over BTN loses to stylesheet order.
const BTN_ON =
  "inline-flex items-center gap-2 rounded-full border border-accent bg-accent-soft px-3.5 py-2 text-[12.5px] font-semibold text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const BTN_SHARE =
  "inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/**
 * Handing a connection code to the other device.
 *
 * Two devices have to be introduced before anything can move, and how you do
 * that depends on where the other device is:
 *
 *  - **In the room** — show it as a QR code and point the other camera at it.
 *    Nothing is typed and nothing is sent anywhere.
 *  - **Anywhere else** — copy the link (or the raw code) and send it however you
 *    already talk to that person. The code lives in the URL's fragment, which
 *    browsers never send to a server, so the invite stays between the two devices
 *    and whatever app carried the message.
 *
 * Long codes are shown in a read-only textarea rather than as text: it can be
 * selected with one gesture, and it is what a headless check (or a user without
 * clipboard permission) can read.
 *
 * Shared by the apps that pair browsers over `lib/rtc` — File Drop hands one
 * invite to one receiver; Watch Party hands one to each guest it lets in.
 */
export function CodeExchange({
  code,
  link,
  title,
  hint,
  message,
  autoCopy = false,
}: {
  code: string;
  /** Full invite URL, when this code is an invitation rather than a reply. */
  link?: string;
  title: string;
  hint: string;
  /**
   * A friendly sentence carrying the code or link. When given, it is what gets
   * shared and copied — the receiving side finds the code inside a sentence —
   * and a Share button hands it straight to the phone's own share sheet.
   */
  message?: string;
  /** Copy the message to the clipboard as soon as the code exists. */
  autoCopy?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shareText = link ?? code;
  const outgoing = message ?? shareText;
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  // One fewer step: the code is already on the clipboard when it appears. The
  // browser may refuse without a recent tap, and then the buttons are there.
  useEffect(() => {
    if (!autoCopy || !code) return;
    navigator.clipboard
      .writeText(outgoing)
      .then(() => setCopied("link"))
      .catch(() => {});
  }, [autoCopy, code, outgoing]);

  const share = async () => {
    try {
      await navigator.share({ title, text: outgoing });
    } catch {
      /* closed the share sheet, or sharing refused — Copy still works */
    }
  };

  // A connection code is a couple of kilobytes, so it rarely fits one QR — the
  // chunked frame channel handles that, and a short code just becomes one frame.
  useEffect(() => {
    if (!showQr || !code) return;
    let cancelled = false;
    void buildFrames(shareText, "offer").then((built) => {
      if (!cancelled) setFrames(built);
    });
    return () => {
      cancelled = true;
    };
  }, [showQr, code, shareText]);

  // A single frame is drawn here rather than through the player, so the common
  // case has no controls and no animation.
  useEffect(() => {
    if (!showQr || frames.length !== 1 || !canvasRef.current) return;
    void drawQr(canvasRef.current, frames[0], { size: 512, ecc: "L", margin: 2 }).catch(() => {});
  }, [showQr, frames]);

  const copy = async (what: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? outgoing : code);
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
        {message && canShare && (
          <button type="button" onClick={() => void share()} className={BTN_SHARE}>
            <ShareIcon size={15} />
            Share…
          </button>
        )}
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
          className={showQr ? BTN_ON : BTN}
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
