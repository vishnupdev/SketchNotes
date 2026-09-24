"use client";

import { useEffect, useId, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { clearInviteFromLocation, inviteFromLocation } from "@/lib/rtc/code";
import { rtcSupported } from "@/lib/rtc/peer";
import { MAX_MEMBERS } from "@/lib/WatchParty/types";
import { MAX_NAME, MAX_ROOM_NAME } from "@/lib/WatchParty/protocol";
import { CodeExchange } from "@/components/SketchNotes/molecules/CodeExchange";
import { CodeScanner } from "@/components/WatchParty/molecules/CodeScanner";
import {
  ChatIcon,
  FilmIcon,
  MicIcon,
  MusicNoteIcon,
  SubtitlesIcon,
  UsersIcon,
} from "@/components/SketchNotes/atoms/icons";
import { BTN, BTN_ACCENT, card, CARD, CODE_FIELD, FIELD, LABEL, SECTION_TITLE } from "@/components/WatchParty/ui";
import { cx } from "@/lib/utils";

const FEATURES = [
  { icon: FilmIcon, text: "YouTube, media links, your own files or a shared screen" },
  { icon: UsersIcon, text: `Up to ${MAX_MEMBERS} people, every player kept in step` },
  { icon: ChatIcon, text: "Chat and reactions that float over the picture" },
  { icon: MicIcon, text: "Voice chat while you watch" },
  { icon: SubtitlesIcon, text: "Subtitles shared with the whole room" },
  { icon: MusicNoteIcon, text: "A shared queue, votes to skip, speed for everyone" },
];

/**
 * Before a room: start one, or open an invite to join one. An invite link lands
 * here with its code already filled in — the guest only has to say who they are.
 */
export function Lobby() {
  const phase = useWatchPartyStore((s) => s.phase);
  const name = useWatchPartyStore((s) => s.name);
  const setName = useWatchPartyStore((s) => s.setName);
  const startRoom = useWatchPartyStore((s) => s.startRoom);
  const join = useWatchPartyStore((s) => s.join);
  const error = useWatchPartyStore((s) => s.error);
  const endedReason = useWatchPartyStore((s) => s.endedReason);
  const dismissEnded = useWatchPartyStore((s) => s.dismissEnded);

  const [roomName, setRoomName] = useState("Movie night");
  const [code, setCode] = useState(() => inviteFromLocation() ?? "");
  const [invited] = useState(() => code !== "");
  const nameId = useId();
  const roomId = useId();
  const codeId = useId();

  // The invite has been taken up; a reload must not replay it.
  useEffect(() => {
    clearInviteFromLocation();
  }, []);

  if (phase === "joining") return <JoinWaiting />;

  const supported = rtcSupported();
  const hasName = name.trim().length > 0;

  const joinCard = (
    <section className={card(invited)} aria-labelledby={`${codeId}-title`}>
      <div>
        <h2 id={`${codeId}-title`} className={SECTION_TITLE}>
          {invited ? "You've been invited" : "Join a room"}
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
          {invited
            ? "The invite is filled in. Add your name and join — you'll get a reply code to send back to the host."
            : "Open the invite link the host sent you, paste its code here, or scan their QR."}
        </p>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void join(code);
        }}
      >
        <label htmlFor={codeId} className={LABEL}>
          Invite code or link
        </label>
        <textarea
          id={codeId}
          rows={invited ? 2 : 3}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="OAD1.… or https://…/watchparty#i=…"
          className={CODE_FIELD}
        />
        <div className="flex flex-wrap items-start gap-2">
          <button
            type="submit"
            disabled={!supported || !hasName || code.trim().length < 12}
            className={BTN_ACCENT}
          >
            Join the room
          </button>
          {!invited && <CodeScanner label="Scan an invite" onCode={setCode} />}
        </div>
      </form>
    </section>
  );

  const startCard = (
    <section className={CARD} aria-labelledby={`${roomId}-title`}>
      <div>
        <h2 id={`${roomId}-title`} className={SECTION_TITLE}>
          Start a room
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
          This device hosts: it keeps the room&apos;s clock, the queue and the chat, and passes them to everyone
          you invite.
        </p>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startRoom(roomName);
        }}
      >
        <label htmlFor={roomId} className={LABEL}>
          Room name
        </label>
        <input
          id={roomId}
          value={roomName}
          maxLength={MAX_ROOM_NAME}
          onChange={(e) => setRoomName(e.target.value)}
          className={FIELD}
        />
        <button type="submit" disabled={!supported || !hasName} className={cx(BTN_ACCENT, "self-start")}>
          Start the room
        </button>
      </form>
    </section>
  );

  return (
    <div className="flex flex-col gap-5 pb-8">
      {endedReason && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger p-3.5">
          <p className="min-w-0 flex-1 text-[13px] font-semibold">{endedReason}</p>
          <button type="button" onClick={dismissEnded} className={BTN}>
            OK
          </button>
        </div>
      )}

      {!invited && (
        <div>
          <h2 className="text-[20px] font-bold leading-tight">Watch and listen together</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            One person starts a room and invites the others. Every screen plays the same moment of the same film
            or song — pause it and it pauses for everyone.
          </p>
          <ul role="list" className="mt-3 grid gap-2 min-[560px]:grid-cols-2">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[12.5px] leading-snug">
                <Icon size={17} className="mt-px flex-none text-accent" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className={LABEL}>
          Your name
        </label>
        <input
          id={nameId}
          value={name}
          maxLength={MAX_NAME}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          placeholder="How the room will see you"
          className={FIELD}
        />
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}
      {!supported && (
        <p role="alert" className="text-[12.5px] text-danger">
          This browser can&apos;t open direct connections, so it can&apos;t join or host a room.
        </p>
      )}

      {invited ? (
        <>
          {joinCard}
          {startCard}
        </>
      ) : (
        <>
          {startCard}
          {joinCard}
        </>
      )}

      <details className="rounded-2xl border border-border bg-panel p-4 text-[12.5px] leading-relaxed text-ink-soft">
        <summary className="cursor-pointer text-[13px] font-semibold text-text">How it works — and its limits</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            There is no server. The host&apos;s device is the room, and each guest connects straight to it — so each
            guest needs their own invite, and sends a reply code back.
          </li>
          <li>
            YouTube and media links play on every device from the source, kept in step against the host&apos;s
            clock. Small gaps are closed by playing a touch faster or slower; big ones by jumping.
          </li>
          <li>
            A file on the host&apos;s device is streamed live to guests, using the host&apos;s upload once per
            guest. A guest with the same file can play their own copy instead.
          </li>
          <li>
            If the host closes the tab the room ends. A few pairs of networks (two strict mobile carriers) can&apos;t
            connect directly — one shared Wi-Fi always works.
          </li>
        </ul>
      </details>
    </div>
  );
}

/** A guest who has opened an invite, waiting for the host to paste the reply. */
function JoinWaiting() {
  const reply = useWatchPartyStore((s) => s.reply);
  const joinStatus = useWatchPartyStore((s) => s.joinStatus);
  const cancelJoin = useWatchPartyStore((s) => s.cancelJoin);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {reply ? (
        <CodeExchange
          code={reply}
          title="Send this reply to the host"
          hint="Paste it into their “Step 2” box, or hold the QR up to their camera. You're in the room the moment they let you in."
        />
      ) : null}
      <p role="status" className="text-[13px] font-semibold text-accent">
        {joinStatus}
      </p>
      <button type="button" onClick={cancelJoin} className={cx(BTN, "self-start")}>
        Cancel
      </button>
    </div>
  );
}
