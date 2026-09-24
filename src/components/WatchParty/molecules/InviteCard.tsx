"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { InviteView } from "@/lib/WatchParty/room";
import { extractCode } from "@/lib/rtc/code";
import { CodeExchange } from "@/components/SketchNotes/molecules/CodeExchange";
import { CodeScanner } from "@/components/WatchParty/molecules/CodeScanner";
import { Steps } from "@/components/WatchParty/atoms/Steps";
import { Avatar } from "@/components/WatchParty/atoms/Avatar";
import { ClipboardIcon } from "@/components/SketchNotes/atoms/icons";
import { BTN, BTN_ACCENT, btn, CODE_FIELD } from "@/components/WatchParty/ui";

const AUTO_STEPS = ["Send the invite", "They tap Join", "Let them in"] as const;
const HAND_STEPS = ["Send the invite", "Get their reply", "They're in"] as const;

/** The box a reply code is pasted or scanned into — the whole route for local invites. */
function PasteReply({
  error,
  onReply,
  label,
  hint,
}: {
  error: string | undefined;
  onReply: (code: string) => void;
  label: string;
  hint: string;
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
    if (error) sentFor.current = null;
  }, [error]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setReply(text);
      submit(text);
    } catch {
      /* permission refused — the box still takes an ordinary paste */
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-[13px] font-semibold">
        {label}
      </label>
      <p className="text-[12px] leading-relaxed text-ink-soft">{hint}</p>
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
        <CodeScanner
          label="Scan their reply"
          onCode={(code) => {
            setReply(code);
            submit(code);
          }}
        />
      </div>
      {reply.trim() && !extractCode(reply) && (
        <p className="text-[12px] text-ink-soft">That doesn&apos;t look like a whole reply yet — copy all of it.</p>
      )}
    </div>
  );
}

/**
 * One guest's way in. Each invite can be answered exactly once, so every guest
 * gets a card.
 *
 * An "Anywhere" invite is one link and nothing else: the guest taps Join, their
 * reply comes back through the relay, and this card asks "let them in?". The
 * paste box is still here, folded away, for the rare time the relay can't be
 * reached. A "This network only" invite contacts nothing outside the Wi-Fi, so
 * its reply is pasted or scanned by hand — Share, wait, paste.
 */
export function InviteCard({
  invite,
  number,
  roomName,
  hostName,
  onReply,
  onLetIn,
  onCancel,
  onRetry,
}: {
  invite: InviteView;
  number: number;
  roomName: string;
  hostName: string;
  onReply: (code: string) => void;
  onLetIn: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  if (invite.status === "creating") {
    return (
      <div role="status" className="rounded-2xl border border-border bg-paper p-3.5 text-[12.5px] text-ink-soft">
        Making invite {number}…
      </div>
    );
  }

  const steps = invite.auto ? AUTO_STEPS : HAND_STEPS;
  const current = invite.status === "connecting" ? 2 : invite.status === "asking" ? 2 : invite.auto ? 0 : 1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/50 bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold">Invite {number}</p>
        <button type="button" onClick={onCancel} className={btn(false, true)}>
          Cancel
        </button>
      </div>

      {invite.status !== "failed" && <Steps steps={steps} current={current} />}

      {invite.status === "asking" && invite.asking && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={invite.asking.name} slot={number} size={34} />
            <p className="min-w-0 text-[14px] font-bold leading-snug">
              <span className="break-words">{invite.asking.name}</span> wants to join
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onLetIn} className={BTN_ACCENT}>
              Let them in
            </button>
            <button type="button" onClick={onCancel} className={BTN}>
              Not them
            </button>
          </div>
        </div>
      )}

      {invite.status === "failed" ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
            {invite.error ?? "That invite didn't connect."}
          </p>
          <button type="button" onClick={onRetry} className={`${BTN_ACCENT} self-start`}>
            Make a fresh invite
          </button>
        </div>
      ) : invite.status === "waiting" ? (
        <CodeExchange
          code={invite.code}
          link={invite.link}
          title="Send this to one person"
          hint={
            invite.mode === "local"
              ? "Share it, or show them the QR. They need to be on this Wi-Fi."
              : "Share it in any chat — WhatsApp, Messages, email. When they tap Join, you'll be asked to let them in right here."
          }
          message={`${hostName} invited you to watch together in "${roomName}" 🎬 Open this link to join: ${invite.link}`}
        />
      ) : null}

      {invite.status === "waiting" && invite.auto && (
        <>
          <p role="status" className="flex items-center gap-2 text-[12.5px] font-semibold text-accent">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
            Waiting for them to open it…
          </p>
          <details className="rounded-2xl border border-border bg-panel p-3.5">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">
              They sent you a reply code instead?
            </summary>
            <div className="mt-3">
              <PasteReply
                error={invite.error}
                onReply={onReply}
                label="Paste their reply"
                hint="If their browser couldn't reach the relay, they'll be shown a reply to send you. Paste it here and they're in."
              />
            </div>
          </details>
        </>
      )}

      {invite.status === "waiting" && !invite.auto && (
        <div className="rounded-2xl border border-border bg-panel p-3.5">
          <PasteReply
            error={invite.error}
            onReply={onReply}
            label="Paste their reply here"
            hint="When they open the invite they get a reply to send back. Paste it and they're in — it connects by itself."
          />
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
