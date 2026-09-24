"use client";

import { useId, useState } from "react";
import type { InviteView } from "@/lib/WatchParty/room";
import { CodeExchange } from "@/components/SketchNotes/molecules/CodeExchange";
import { CodeScanner } from "@/components/WatchParty/molecules/CodeScanner";
import { BTN_ACCENT, btn, CODE_FIELD, LABEL } from "@/components/WatchParty/ui";

/**
 * One guest's way in: the invite to send, and the box their reply comes back
 * into. Each invite can be answered exactly once, so every guest gets a card.
 */
export function InviteCard({
  invite,
  number,
  onReply,
  onCancel,
}: {
  invite: InviteView;
  number: number;
  onReply: (code: string) => void;
  onCancel: () => void;
}) {
  const [reply, setReply] = useState("");
  const fieldId = useId();

  if (invite.status === "creating") {
    return (
      <div role="status" className="rounded-2xl border border-border bg-paper p-3.5 text-[12.5px] text-ink-soft">
        Making invite {number}…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/50 bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold">Invite {number}</p>
        <button type="button" onClick={onCancel} className={btn(false, true)}>
          Cancel
        </button>
      </div>

      {invite.status !== "failed" && (
        <CodeExchange
          code={invite.code}
          link={invite.link}
          title="Step 1 — send this to one person"
          hint={
            invite.mode === "local"
              ? "Show the QR, or send the link to a device on this network. One invite lets in one guest."
              : "Send the link by any chat app — the code sits after the # so it never reaches a server. One invite lets in one guest."
          }
        />
      )}

      {invite.status === "waiting" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className={LABEL}>
            Step 2 — their reply code
          </label>
          <textarea
            id={fieldId}
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="OAD1.…"
            className={CODE_FIELD}
          />
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={() => onReply(reply)}
              disabled={reply.trim().length < 12}
              className={BTN_ACCENT}
            >
              Let them in
            </button>
            <CodeScanner
              label="Scan their reply"
              onCode={(code) => {
                setReply(code);
                onReply(code);
              }}
            />
          </div>
        </div>
      )}

      {invite.status === "connecting" && (
        <p role="status" className="text-[12.5px] font-semibold text-accent">
          Connecting…
        </p>
      )}

      {invite.error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {invite.error}
        </p>
      )}
    </div>
  );
}
