"use client";

import type { Member, MemberStatus } from "@/lib/WatchParty/types";
import { driftLabel } from "@/lib/WatchParty/sync";
import { Avatar } from "@/components/WatchParty/atoms/Avatar";
import { CloseIcon, MicIcon, MicOffIcon } from "@/components/SketchNotes/atoms/icons";
import { ICON_BTN } from "@/components/WatchParty/ui";

/** How someone's playback is going, in a few words. */
function statusLine(member: Member, status: MemberStatus | undefined): string {
  if (!status) return "";
  const parts: string[] = [];
  if (status.buffering) parts.push("loading");
  else if (status.mode === "stream") parts.push("watching the stream");
  else if (status.mode === "sync" && !member.host) parts.push(driftLabel(status.drift));
  else if (status.mode === "sync" && member.host) parts.push("setting the pace");
  if (status.rtt != null) parts.push(`${Math.round(status.rtt)} ms`);
  return parts.filter(Boolean).join(" · ");
}

export function MemberRow({
  member,
  status,
  isMe,
  speaking,
  onKick,
}: {
  member: Member;
  status?: MemberStatus;
  isMe: boolean;
  speaking: boolean;
  onKick?: () => void;
}) {
  const line = statusLine(member, status);
  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar name={member.name} slot={member.slot} speaking={speaking} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-semibold">
          <span className="truncate">{member.name}</span>
          {member.host && (
            <span className="flex-none rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[.1em] text-accent">
              Host
            </span>
          )}
          {isMe && <span className="flex-none text-[11.5px] font-normal text-ink-soft">(you)</span>}
        </p>
        {line && <p className="truncate text-[11.5px] text-ink-soft">{line}</p>}
      </div>
      <span
        className={member.mic ? "text-accent" : "text-ink-soft"}
        aria-label={member.mic ? "Mic on" : "Mic off"}
        role="img"
      >
        {member.mic ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
      </span>
      {onKick && (
        <button type="button" onClick={onKick} aria-label={`Remove ${member.name} from the room`} title="Remove" className={ICON_BTN}>
          <CloseIcon size={15} />
        </button>
      )}
    </li>
  );
}
