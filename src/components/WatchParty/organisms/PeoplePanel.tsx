"use client";

import { useId, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { MAX_MEMBERS } from "@/lib/WatchParty/types";
import { MAX_ROOM_NAME } from "@/lib/WatchParty/protocol";
import { ReachPicker } from "@/components/SketchNotes/molecules/ReachPicker";
import { InviteCard } from "@/components/WatchParty/molecules/InviteCard";
import { MemberRow } from "@/components/WatchParty/molecules/MemberRow";
import { Switch } from "@/components/WatchParty/atoms/Switch";
import { MicIcon, MicOffIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";
import { BTN, BTN_ACCENT, BTN_DANGER, btn, CARD, FIELD, LABEL, SECTION_TITLE } from "@/components/WatchParty/ui";
import { cx } from "@/lib/utils";

/**
 * The People tab — who is here, how their playback is going, and (for the
 * host) letting more people in and setting the room's rules.
 */
export function PeoplePanel() {
  const room = useWatchPartyStore((s) => s.room);
  const role = useWatchPartyStore((s) => s.role);
  const me = useWatchPartyStore((s) => s.me);
  const invites = useWatchPartyStore((s) => s.invites);
  const speaking = useWatchPartyStore((s) => s.speaking);
  const prefs = useWatchPartyStore((s) => s.prefs);
  const micOn = useWatchPartyStore((s) => s.micOn);
  const micBusy = useWatchPartyStore((s) => s.micBusy);
  const invite = useWatchPartyStore((s) => s.invite);
  const acceptReply = useWatchPartyStore((s) => s.acceptReply);
  const cancelInvite = useWatchPartyStore((s) => s.cancelInvite);
  const setPrefs = useWatchPartyStore((s) => s.setPrefs);
  const setSettings = useWatchPartyStore((s) => s.setSettings);
  const renameRoom = useWatchPartyStore((s) => s.renameRoom);
  const kick = useWatchPartyStore((s) => s.kick);
  const toggleMic = useWatchPartyStore((s) => s.toggleMic);
  const leave = useWatchPartyStore((s) => s.leave);

  const [roomName, setRoomName] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const nameId = useId();

  if (!room) return null;
  const isHost = role === "host";
  const seatsLeft = MAX_MEMBERS - room.members.length - invites.length;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {isHost && (
        <section className={CARD} aria-labelledby="party-invite">
          <div>
            <h2 id="party-invite" className={SECTION_TITLE}>
              Invite people
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
              Share an invite with each person. They send a reply back, you paste it, and they&apos;re in.
            </p>
          </div>
          <details className="rounded-xl border border-border bg-paper px-3 py-2 text-[12.5px]">
            <summary className="cursor-pointer font-semibold text-text">
              Connection options · {prefs.reach === "local" ? "this Wi-Fi only" : "anywhere"}
            </summary>
            <div className="pt-2">
              <ReachPicker
                mode={prefs.reach}
                onMode={(reach) => setPrefs({ reach })}
                legend="Where are your guests? (applies to new invites)"
                what="what you watch or say"
              />
            </div>
          </details>
          <button
            type="button"
            onClick={() => void invite()}
            disabled={seatsLeft <= 0}
            className={cx(BTN_ACCENT, "self-start")}
          >
            <PlusIcon size={15} />
            {invites.length ? "Invite another person" : "Create an invite"}
          </button>
          {seatsLeft <= 0 && (
            <p className="text-[12px] text-ink-soft">A room holds {MAX_MEMBERS} people, counting open invites.</p>
          )}
          {invites.map((inv, i) => (
            <InviteCard
              key={inv.id}
              invite={inv}
              number={i + 1}
              roomName={room.name}
              hostName={room.members.find((m) => m.host)?.name ?? "Your friend"}
              onReply={(code) => void acceptReply(inv.id, code)}
              onCancel={() => cancelInvite(inv.id)}
              onRetry={() => {
                cancelInvite(inv.id);
                void invite();
              }}
            />
          ))}
        </section>
      )}

      <section aria-labelledby="party-members" className="flex flex-col">
        <h2 id="party-members" className={LABEL}>
          In the room · {room.members.length} of {MAX_MEMBERS}
        </h2>
        <ul role="list" className="divide-y divide-border">
          {room.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              status={room.status[m.id]}
              isMe={m.id === me}
              speaking={speaking.includes(m.id)}
              onKick={isHost && !m.host ? () => kick(m.id) : undefined}
            />
          ))}
        </ul>
      </section>

      <section className={CARD} aria-labelledby="party-voice-settings">
        <div className="flex items-center gap-3">
          <h2 id="party-voice-settings" className={cx(SECTION_TITLE, "flex-1")}>
            Voice
          </h2>
          <button
            type="button"
            onClick={() => void toggleMic()}
            disabled={micBusy}
            aria-pressed={micOn}
            className={btn(micOn)}
          >
            {micOn ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
            {micOn ? "Mic on" : "Talk"}
          </button>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Voices volume · {Math.round(prefs.voiceVolume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(prefs.voiceVolume * 100)}
            onChange={(e) => setPrefs({ voiceVolume: Number(e.target.value) / 100 })}
            className="h-6 w-full cursor-pointer accent-accent"
          />
        </label>
      </section>

      {isHost && (
        <section className="flex flex-col gap-2" aria-labelledby="party-rules">
          <h2 id="party-rules" className={LABEL}>
            Room rules
          </h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (roomName != null) renameRoom(roomName);
              setRoomName(null);
            }}
          >
            <label htmlFor={nameId} className="sr-only">
              Room name
            </label>
            <input
              id={nameId}
              value={roomName ?? room.name}
              maxLength={MAX_ROOM_NAME}
              onChange={(e) => setRoomName(e.target.value)}
              className={FIELD}
            />
            <button type="submit" disabled={roomName == null || !roomName.trim()} className={BTN}>
              Rename
            </button>
          </form>
          <Switch
            label="Guests can play, pause and seek"
            detail="Off, and only you move the film — everyone else follows."
            checked={room.settings.guestControl}
            onChange={(guestControl) => setSettings({ guestControl })}
          />
          <Switch
            label="Guests can add to the queue"
            detail="Links only. Files and screens can only come from your device."
            checked={room.settings.guestQueue}
            onChange={(guestQueue) => setSettings({ guestQueue })}
          />
          <Switch
            label="Vote to skip"
            detail="When more than half the room votes, the next thing plays."
            checked={room.settings.voteSkip}
            onChange={(voteSkip) => setSettings({ voteSkip })}
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        {confirmLeave ? (
          <div role="alertdialog" aria-labelledby="party-leave" className="flex flex-col gap-2 rounded-2xl border border-danger p-3.5">
            <p id="party-leave" className="text-[13px] font-semibold">
              {isHost
                ? "End the room for everyone? Guests are disconnected and would need new invites."
                : "Leave the room? Getting back in takes a new invite from the host."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={leave} className={BTN_DANGER}>
                {isHost ? "End the room" : "Leave"}
              </button>
              <button type="button" onClick={() => setConfirmLeave(false)} className={BTN}>
                Stay
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmLeave(true)} className={cx(BTN_DANGER, "self-start")}>
            {isHost ? "End the room" : "Leave the room"}
          </button>
        )}
        {isHost && (
          <p className="text-[12px] leading-relaxed text-ink-soft">
            The room lives in this tab: closing it, or this device going to sleep, ends it for everyone. Switching
            to another app in the workspace keeps it running.
          </p>
        )}
      </section>
    </div>
  );
}
