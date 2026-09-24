"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { InviteView } from "@/lib/WatchParty/room";
import { extractCode } from "@/lib/rtc/code";
import { CodeExchange } from "@/components/SketchNotes/molecules/CodeExchange";
import { CodeScanner } from "@/components/WatchParty/molecules/CodeScanner";
import { Steps } from "@/components/WatchParty/atoms/Steps";
import { ClipboardIcon } from "@/components/SketchNotes/atoms/icons";
import { BTN, BTN_ACCENT, btn, CODE_FIELD } from "@/components/WatchParty/ui";

const STEPS = ["Send the invite", "Get their reply", "They're in"] as const;

/**
 * One guest's way in: the invite to send, and the box their reply comes back
 * into. Each invite can be answered exactly once, so every guest gets a card.
 *
 * The reply connects the moment a whole code lands in the box — pasted, typed
 * or read from the clipboard — so the usual path is: Share, wait, paste. No
 * second button to find.
 */
export function InviteCard({
  invite,
  number,
  roomName,
  hostName,
  onReply,
  onCancel,
  onRetry,
}: {
  invite: InviteView;
  number: number;
  roomName: string;
  hostName: string;
  onReply: (code: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const [reply, setReply] = useState("");
  const [canPaste, setCanPaste] = useState(false);
  const sentFor = useRef<string | null>(null);
  const fieldId = useId();

  useEffect(() => setCanPaste(typeof navigator.clipboard?.readText === "function"), []);

  /** Hand a complete code over once — never the same one twice. */
  const submit = (text: string) => {
    const code = extractCode(text);
    if (!code || sentFor.current === code) return;
    sentFor.current = code;
    onReply(code);
  };

  // A new error means that reply didn't take; let the same code be tried again.
  useEffect(() => {
    if (invite.error) sentFor.current = null;
  }, [invite.error]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setReply(text);
      submit(text);
    } catch {
      /* permission refused — the box still takes an ordinary paste */
    }
  };

  if (invite.status === "creating") {
    return (
      <div role="status" className="rounded-2xl border border-border bg-paper p-3.5 text-[12.5px] text-ink-soft">
        Making invite {number}…
      </div>
    );
  }

  const current = invite.status === "connecting" ? 2 : 1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/50 bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold">Invite {number}</p>
        <button type="button" onClick={onCancel} className={btn(false, true)}>
          Cancel
        </button>
      </div>

      {invite.status !== "failed" && <Steps steps={STEPS} current={current} />}

      {invite.status === "failed" ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
            {invite.error ?? "That invite didn't connect."}
          </p>
          <button type="button" onClick={onRetry} className={`${BTN_ACCENT} self-start`}>
            Make a fresh invite
          </button>
        </div>
      ) : (
        <CodeExchange
          code={invite.code}
          link={invite.link}
          title="1 · Send this to one person"
          hint={
            invite.mode === "local"
              ? "Share it, or show them the QR. They need to be on this Wi-Fi."
              : "Share it in any chat — WhatsApp, Messages, email. One invite lets in one person."
          }
          message={`${hostName} invited you to watch together in "${roomName}" 🎬 Open this link to join: ${invite.link}`}
        />
      )}

      {invite.status === "waiting" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-panel p-3.5">
          <label htmlFor={fieldId} className="text-[13px] font-semibold">
            2 · Paste their reply here
          </label>
          <p className="text-[12px] leading-relaxed text-ink-soft">
            When they open the invite they get a reply to send back. Paste it and they&apos;re in — it connects
            by itself.
          </p>
          <textarea
            id={fieldId}
            rows={2}
            value={reply}
            onChange={(e) => {
              setReply(e.target.value);
              submit(e.target.value);
            }}
            placeholder="Paste their reply…"
            className={CODE_FIELD}
          />
          <div className="flex flex-wrap items-start gap-2">
            {canPaste && (
              <button type="button" onClick={() => void pasteFromClipboard()} className={BTN_ACCENT}>
                <ClipboardIcon size={15} />
                Paste reply
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                sentFor.current = null;
                submit(reply);
              }}
              disabled={!extractCode(reply)}
              className={canPaste ? BTN : BTN_ACCENT}
            >
              Let them in
            </button>
            <CodeScanner label="Scan their reply" onCode={(code) => { setReply(code); submit(code); }} />
          </div>
          {reply.trim() && !extractCode(reply) && (
            <p className="text-[12px] text-ink-soft">That doesn&apos;t look like a whole reply yet — copy all of it.</p>
          )}
        </div>
      )}

      {invite.status === "connecting" && (
        <p role="status" className="text-[12.5px] font-semibold text-accent">
          Letting them in… this takes a few seconds.
        </p>
      )}

      {invite.error && invite.status !== "failed" && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {invite.error}
        </p>
      )}
    </div>
  );
}
