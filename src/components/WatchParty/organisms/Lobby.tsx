"use client";

import { useEffect, useId, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { clearInviteFromLocation, extractCode, inviteFromLocation } from "@/lib/rtc/code";
import { rtcSupported } from "@/lib/rtc/peer";
import { MAX_MEMBERS } from "@/lib/WatchParty/types";
import { MAX_NAME, MAX_ROOM_NAME } from "@/lib/WatchParty/protocol";
import { friendlyName } from "@/lib/WatchParty/names";
import { CodeExchange } from "@/components/SketchNotes/molecules/CodeExchange";
import { CodeScanner } from "@/components/WatchParty/molecules/CodeScanner";
import { Steps } from "@/components/WatchParty/atoms/Steps";
import {
  ChatIcon,
  CheckIcon,
  ClipboardIcon,
  DiceIcon,
  FilmIcon,
  LinkIcon,
  MicIcon,
  SubtitlesIcon,
  UsersIcon,
  WatchPartyIcon,
} from "@/components/SketchNotes/atoms/icons";
import { BTN, BTN_ACCENT, CARD, CODE_FIELD, FIELD, ICON_BTN, LABEL } from "@/components/WatchParty/ui";

type Mode = "start" | "join";

const FEATURES = [
  { icon: FilmIcon, text: "YouTube, links, your files or your screen" },
  { icon: UsersIcon, text: `Up to ${MAX_MEMBERS} people, always in sync` },
  { icon: ChatIcon, text: "Chat and floating reactions" },
  { icon: MicIcon, text: "Voice chat" },
  { icon: SubtitlesIcon, text: "Shared subtitles" },
];

const CHOICE =
  "flex min-w-0 flex-1 flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const CHOICE_ON = `${CHOICE} border-accent bg-accent-soft`;
const CHOICE_OFF = `${CHOICE} border-border bg-panel hover:border-accent`;

/**
 * Before a room: one choice — start one, or join one — then one button.
 *
 * A name is already filled in (see `friendlyName`), so nothing is disabled for
 * a reason the screen doesn't show. An invite link lands here in Join with its
 * code taken up already: the guest sees their name and a single Join button.
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

  const [code, setCode] = useState(() => inviteFromLocation() ?? "");
  const [invited] = useState(() => code !== "");
  const [mode, setMode] = useState<Mode>(invited ? "join" : "start");
  const [editCode, setEditCode] = useState(!invited);
  const [roomName, setRoomName] = useState("Movie night");
  const [canPaste, setCanPaste] = useState(false);
  const nameId = useId();
  const roomId = useId();
  const codeId = useId();

  // The invite has been taken up; a reload must not replay it.
  useEffect(() => {
    clearInviteFromLocation();
    setCanPaste(typeof navigator.clipboard?.readText === "function");
  }, []);

  if (phase === "joining") return <JoinWaiting />;

  const supported = rtcSupported();
  const codeReady = !!extractCode(code);

  const pasteInvite = async () => {
    try {
      setCode(await navigator.clipboard.readText());
    } catch {
      /* refused — the box takes a normal paste */
    }
  };

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

      <div>
        <h2 className="text-[20px] font-bold leading-tight">
          {invited ? "You're invited to watch together" : "Watch and listen together"}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          {invited
            ? "Check your name and join. Everyone sees the same moment — pause it and it pauses for everyone."
            : "Start a room and invite friends. Everyone sees the same moment — pause it and it pauses for everyone."}
        </p>
        {!invited && (
          <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-1 text-[11.5px]"
              >
                <Icon size={14} className="flex-none text-accent" />
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!invited && (
        <div role="radiogroup" aria-label="What would you like to do?" className="flex gap-2.5">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "start"}
            onClick={() => setMode("start")}
            className={mode === "start" ? CHOICE_ON : CHOICE_OFF}
          >
            <WatchPartyIcon size={22} className="text-accent" />
            <span className="text-[14px] font-bold">Start a room</span>
            <span className="text-[11.5px] leading-snug text-ink-soft">You pick what plays</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "join"}
            onClick={() => setMode("join")}
            className={mode === "join" ? CHOICE_ON : CHOICE_OFF}
          >
            <LinkIcon size={22} className="text-accent" />
            <span className="text-[14px] font-bold">Join a room</span>
            <span className="text-[11.5px] leading-snug text-ink-soft">Someone sent you an invite</span>
          </button>
        </div>
      )}

      <form
        className={CARD}
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "start") startRoom(roomName);
          else if (codeReady) void join(code);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className={LABEL}>
            Your name
          </label>
          <div className="flex gap-2">
            <input
              id={nameId}
              value={name}
              maxLength={MAX_NAME}
              autoComplete="nickname"
              onChange={(e) => setName(e.target.value)}
              placeholder="How others will see you"
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => setName(friendlyName())}
              aria-label="Pick a random name"
              title="Random name"
              className={ICON_BTN}
            >
              <DiceIcon size={17} />
            </button>
          </div>
        </div>

        {mode === "start" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={roomId} className={LABEL}>
              Room name <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id={roomId}
              value={roomName}
              maxLength={MAX_ROOM_NAME}
              onChange={(e) => setRoomName(e.target.value)}
              className={FIELD}
            />
          </div>
        ) : editCode ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={codeId} className={LABEL}>
              Invite link or code
            </label>
            <textarea
              id={codeId}
              rows={2}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste the invite you were sent…"
              className={CODE_FIELD}
            />
            <div className="flex flex-wrap items-start gap-2">
              {canPaste && (
                <button type="button" onClick={() => void pasteInvite()} className={BTN}>
                  <ClipboardIcon size={15} />
                  Paste invite
                </button>
              )}
              <CodeScanner label="Scan their QR" onCode={setCode} />
            </div>
            {code.trim() && !codeReady && (
              <p className="text-[12px] text-ink-soft">
                That doesn&apos;t look like a whole invite yet — copy all of it, or open the link itself.
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[12.5px] font-semibold text-accent">
            <CheckIcon size={15} />
            Invite ready
            <button
              type="button"
              onClick={() => setEditCode(true)}
              className="ml-auto text-[12px] font-normal text-ink-soft underline underline-offset-2 hover:text-accent"
            >
              Use a different one
            </button>
          </p>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
            {error}
          </p>
        )}
        {!supported && (
          <p role="alert" className="text-[12.5px] text-danger">
            This browser can&apos;t make direct connections, so it can&apos;t host or join a room. Try a current
            Chrome, Edge, Firefox or Safari.
          </p>
        )}

        <button
          type="submit"
          disabled={!supported || (mode === "join" && !codeReady)}
          className={`${BTN_ACCENT} min-h-12 w-full text-[14px]`}
        >
          {mode === "start" ? "Start the room" : "Join the room"}
        </button>
      </form>

      <details className="rounded-2xl border border-border bg-panel p-4 text-[12.5px] leading-relaxed text-ink-soft">
        <summary className="cursor-pointer text-[13px] font-semibold text-text">How does it work?</summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
          <li>The host starts a room and shares an invite link with each friend.</li>
          <li>The friend opens it and taps Join.</li>
          <li>The host taps Let them in — and they&apos;re watching together.</li>
        </ol>
        <p className="mt-2">
          There&apos;s no account, and the film, voices and chat go straight from device to device. To knock
          without a second message, the friend&apos;s reply passes once through a public relay, locked with a key
          that only exists in the invite link — the relay can&apos;t read it. &ldquo;This network only&rdquo;
          skips the relay: there the friend sends their reply back by hand. The room lasts while the host keeps
          this tab open. A few network pairs (usually two mobile carriers) can&apos;t connect directly — being on
          the same Wi-Fi always works.
        </p>
      </details>
    </div>
  );
}

/**
 * A guest who has opened an invite and tapped Join. With the relay there is
 * nothing to do but wait for the host's yes — the reply is still here, folded
 * away, in case it never arrives. Without one (this network only, or no relay
 * reachable), the reply is the whole next step and is shown in full.
 */
function JoinWaiting() {
  const reply = useWatchPartyStore((s) => s.reply);
  const relay = useWatchPartyStore((s) => s.relay);
  const joinStatus = useWatchPartyStore((s) => s.joinStatus);
  const name = useWatchPartyStore((s) => s.name);
  const cancelJoin = useWatchPartyStore((s) => s.cancelJoin);
  const auto = relay !== "off";

  const exchange = reply ? (
    <CodeExchange
      code={reply}
      title="Send this reply back to the host"
      hint={
        auto
          ? "Only if the host says nothing arrived: send this in the chat the invite came from, and they paste it."
          : "Reply in the same chat the invite came from — tap Share, or paste it there (it's already copied if your browser allowed it). You'll join by yourself as soon as they add it."
      }
      message={`Here's my reply for Watch Party — paste it into my invite: ${reply}`}
      autoCopy={!auto}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <h2 className="text-[20px] font-bold leading-tight">Almost there</h2>
      <Steps
        steps={auto ? ["Open invite", "Host lets you in", "Watch"] : ["Open invite", "Send your reply", "Watch"]}
        current={reply ? 1 : 0}
      />
      {auto ? (
        exchange && (
          <details className="rounded-2xl border border-border bg-panel p-3.5">
            <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">
              Host not seeing you? Send your reply by hand
            </summary>
            <div className="mt-3">{exchange}</div>
          </details>
        )
      ) : (
        exchange
      )}
      <p role="status" className="flex items-center gap-2 text-[13px] font-semibold text-accent">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
        {joinStatus}
      </p>
      <p className="text-[12px] text-ink-soft">Joining as {name}. Keep this page open.</p>
      <button type="button" onClick={cancelJoin} className={`${BTN} self-start`}>
        Cancel
      </button>
    </div>
  );
}
