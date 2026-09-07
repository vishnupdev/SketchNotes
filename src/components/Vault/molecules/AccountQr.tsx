"use client";

import { useEffect, useRef, useState } from "react";
import { drawQr } from "@/lib/qr/encode";
import { toOtpauth, type TotpConfig } from "@/lib/Vault/totp";
import { CheckIcon, CopyIcon, EyeIcon } from "@/components/SketchNotes/atoms/icons";

interface AccountQrProps {
  account: TotpConfig;
  onClose: () => void;
}

/**
 * An account, back out as the QR code it arrived as.
 *
 * This is what stops Vault being a one-way trip: the same
 * `otpauth://` address any authenticator reads, so an account kept here can be
 * moved to a phone, added to a second device, or printed as a paper backup. The
 * encoder is the shared one in `lib/qr/encode.ts` — the same code path the QR
 * Codes app draws with, so a code from here scans exactly as well.
 *
 * It is behind an explicit reveal, and stays behind one, because **the QR *is*
 * the secret**. Anyone who photographs it holds your second factor for ever —
 * unlike a password, there is no "changed it since". The warning says that in
 * those words rather than a vague caution, and nothing is drawn until the
 * reveal is pressed, so the secret cannot end up in a screenshot or a
 * screen-share of this list taken for another reason.
 */
export function AccountQr({ account, onClose }: AccountQrProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const uri = toOtpauth(account);

  useEffect(() => {
    if (!revealed || !canvas.current) return;
    drawQr(canvas.current, uri, { size: 240 }).catch(() => setFailed(true));
  }, [revealed, uri]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* the address is on screen once revealed */
    }
  };

  return (
    <div className="mt-2.5 rounded-xl border border-border bg-paper p-3.5">
      <p className="text-[12.5px] font-bold">Move this account to another device</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
        Scan it with any authenticator and it will produce the same codes as this one.{" "}
        <strong className="font-semibold text-text">
          The code below is the secret itself — a photograph of it is a permanent copy of your
          second factor.
        </strong>{" "}
        Show it only when nobody else can see the screen, and never in a screen-share.
      </p>

      {revealed ? (
        <div className="mt-3 flex flex-col items-center gap-2.5">
          {failed ? (
            <p className="text-[12.5px] font-semibold text-danger">
              The code could not be drawn. Copy the address instead.
            </p>
          ) : (
            /* The quiet zone comes from the encoder, and the surface under it is
               the fixed light token — a tinted or inverted code is one many
               phone cameras refuse outright. */
            <canvas
              ref={canvas}
              width={240}
              height={240}
              aria-label={`Enrolment code for ${account.issuer || account.label}`}
              role="img"
              className="rounded-lg bg-qr-light p-2"
            />
          )}

          <p className="max-w-full break-all text-center font-mono text-[10.5px] leading-snug text-ink-soft">
            {uri}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="tint inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? "Copied" : "Copy the address"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRevealed(false);
                onClose();
              }}
              className="rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold"
            >
              Hide it
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="tint mt-2.5 inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-[12.5px] font-bold text-on-accent"
        >
          <EyeIcon size={14} />
          Show the code
        </button>
      )}
    </div>
  );
}
