"use client";

import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { formatBytes, cx } from "@/lib/utils";
import { sourceLabel } from "@/lib/WatchParty/media";
import { driftLabel } from "@/lib/WatchParty/sync";
import { ReactionBar } from "@/components/WatchParty/molecules/ReactionBar";
import { OutputsCard } from "@/components/WatchParty/molecules/OutputsCard";
import { Avatar } from "@/components/WatchParty/atoms/Avatar";
import { FileButton } from "@/components/WatchParty/atoms/FileButton";
import { CheckIcon, MicIcon, MicOffIcon, SkipIcon, SubtitlesIcon } from "@/components/SketchNotes/atoms/icons";
import { BTN, btn, CARD, LABEL, SECTION_TITLE } from "@/components/WatchParty/ui";

const SUB_ACCEPT = ".srt,.vtt,text/vtt,application/x-subrip";

/**
 * The Watch tab — everything about *this* viewing that is not the transport:
 * what is on, whether you are in step, reactions, your microphone, subtitles,
 * and (for a film streamed from the host) the option to play your own copy.
 */
export function WatchPanel() {
  const room = useWatchPartyStore((s) => s.room);
  const role = useWatchPartyStore((s) => s.role);
  const me = useWatchPartyStore((s) => s.me);
  const sync = useWatchPartyStore((s) => s.sync);
  const speaking = useWatchPartyStore((s) => s.speaking);
  const micOn = useWatchPartyStore((s) => s.micOn);
  const micBusy = useWatchPartyStore((s) => s.micBusy);
  const subs = useWatchPartyStore((s) => s.subs);
  const prefs = useWatchPartyStore((s) => s.prefs);
  const ownCopy = useWatchPartyStore((s) => s.ownCopy);
  const react = useWatchPartyStore((s) => s.react);
  const toggleMic = useWatchPartyStore((s) => s.toggleMic);
  const loadSubs = useWatchPartyStore((s) => s.loadSubs);
  const clearSubs = useWatchPartyStore((s) => s.clearSubs);
  const setPrefs = useWatchPartyStore((s) => s.setPrefs);
  const setOwnCopy = useWatchPartyStore((s) => s.setOwnCopy);
  const voteSkip = useWatchPartyStore((s) => s.voteSkip);
  const skip = useWatchPartyStore((s) => s.skip);

  if (!room) return null;
  const item = room.now;
  const isHost = role === "host";
  const talking = room.members.filter((m) => speaking.includes(m.id));
  const votes = room.skipVotes.length;
  const need = Math.floor(room.members.length / 2) + 1;
  const voted = !!me && room.skipVotes.includes(me);
  const streamed = !!item && item.kind === "file" && !isHost;

  let status = "";
  if (!item) status = "";
  else if (item.kind === "screen") status = isHost ? "Everyone is watching your screen, live." : "Live from the host's screen.";
  else if (streamed && !ownCopy) status = "Streaming live from the host's device.";
  else if (isHost) status = "You set the pace — everyone follows your player.";
  else if (sync.buffering) status = "Loading…";
  else if (sync.drift != null) {
    const label = driftLabel(sync.drift);
    status = label === "in sync" ? "In sync with the room." : `${label} — catching up.`;
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="min-w-0">
        <h2 className="line-clamp-2 text-[16px] font-bold leading-snug">{item ? item.title : room.name}</h2>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">
          {item
            ? `${sourceLabel(item)} · added by ${item.addedBy}`
            : isHost
              ? "Invite people from the People tab, then choose something in Queue."
              : "The host hasn't started anything yet."}
        </p>
        {status && (
          <p role="status" className="mt-1.5 text-[12.5px] font-semibold text-accent">
            {status}
          </p>
        )}
      </div>

      {!item && <GettingStarted isHost={isHost} guests={room.members.length - 1} />}

      <section aria-label="Reactions" className="flex flex-col gap-2">
        <span className={LABEL}>React</span>
        <ReactionBar onReact={react} />
      </section>

      <section className={CARD} aria-labelledby="party-voice">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="party-voice" className={cx(SECTION_TITLE, "flex-1")}>
            Voice
          </h3>
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
        <div className="flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
          {talking.length ? (
            talking.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
                <Avatar name={m.name} slot={m.slot} speaking size={26} />
                {m.id === me ? "You" : m.name}
              </span>
            ))
          ) : (
            <span className="text-[12.5px] text-ink-soft">
              {room.members.some((m) => m.mic) ? "Nobody is talking." : "Nobody has their mic on."}
            </span>
          )}
        </div>
        <p className="text-[12px] leading-relaxed text-ink-soft">
          Wear headphones when your mic is on, or the film will echo back into the room.
        </p>
      </section>

      <OutputsCard />

      {item && item.kind !== "screen" && (
        <section className={CARD} aria-labelledby="party-subs">
          <div className="flex items-center gap-2">
            <SubtitlesIcon size={18} className="text-ink-soft" />
            <h3 id="party-subs" className={SECTION_TITLE}>
              Subtitles
            </h3>
          </div>
          {subs ? (
            <>
              <p className="text-[12.5px] text-ink-soft">
                {subs.mine ? "Your own subtitles, on this device only." : "Shared by the host with everyone."} ·{" "}
                {subs.cues.length} lines
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrefs({ captions: !prefs.captions })}
                  aria-pressed={prefs.captions}
                  className={btn(prefs.captions)}
                >
                  {prefs.captions ? "Showing" : "Hidden"}
                </button>
                <div role="group" aria-label="Subtitle timing" className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPrefs({ subOffset: Math.round((prefs.subOffset - 0.5) * 10) / 10 })}
                    className={BTN}
                    aria-label="Show subtitles half a second earlier"
                  >
                    −0.5s
                  </button>
                  <span className="w-14 text-center font-mono text-[12px] tabular-nums" aria-live="polite">
                    {prefs.subOffset > 0 ? "+" : ""}
                    {prefs.subOffset.toFixed(1)}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrefs({ subOffset: Math.round((prefs.subOffset + 0.5) * 10) / 10 })}
                    className={BTN}
                    aria-label="Show subtitles half a second later"
                  >
                    +0.5s
                  </button>
                </div>
                {(subs.mine || isHost) && (
                  <button type="button" onClick={clearSubs} className={BTN}>
                    Remove
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              Load an .srt or .vtt file.{" "}
              {isHost
                ? "Shared, it appears on every screen in time with the film."
                : "Just for you — the host can also share one with everyone."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {isHost && (
              <FileButton accept={SUB_ACCEPT} onFiles={([f]) => void loadSubs(f, true)}>
                Subtitles for everyone
              </FileButton>
            )}
            <FileButton accept={SUB_ACCEPT} onFiles={([f]) => void loadSubs(f, false)}>
              Just for me
            </FileButton>
          </div>
        </section>
      )}

      {streamed && item && (
        <section className={CARD} aria-labelledby="party-own">
          <h3 id="party-own" className={SECTION_TITLE}>
            {ownCopy ? "Playing your own copy" : "Have the same file?"}
          </h3>
          {ownCopy ? (
            <>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                {ownCopy.name} is playing from this device, in step with the host — full quality, and none of
                the host&apos;s upload used.
              </p>
              {!ownCopy.sizeMatch && (
                <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
                  It isn&apos;t the same size as the host&apos;s file ({formatBytes(item.size ?? 0)}), so it may be
                  a different cut and drift out of step.
                </p>
              )}
              <button type="button" onClick={() => setOwnCopy(null)} className={cx(BTN, "self-start")}>
                Back to the host&apos;s stream
              </button>
            </>
          ) : (
            <>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                The host is streaming {item.title}. If this device has the same file, play it from here instead:
                sharper, and it stays in step with the room.
              </p>
              <FileButton
                accept="video/*,audio/*,.mkv,.mov,.m4v,.flac,.opus"
                onFiles={([f]) => setOwnCopy(f)}
                className="self-start"
              >
                Play my own copy
              </FileButton>
            </>
          )}
        </section>
      )}

      {item && (
        <div className="flex flex-wrap items-center gap-2">
          {isHost && (
            <button type="button" onClick={skip} className={BTN}>
              <SkipIcon size={15} />
              Skip
            </button>
          )}
          {room.settings.voteSkip && (
            <button
              type="button"
              onClick={voteSkip}
              aria-pressed={voted}
              className={btn(voted)}
            >
              {voted ? "Voted to skip" : "Vote to skip"} · {votes}/{need}
            </button>
          )}
        </div>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Keys: Space plays and pauses for everyone · ← → jump 10 seconds · M mutes this device · F full screen · C
        subtitles.
      </p>
    </div>
  );
}

const STEP_DONE = "grid size-7 flex-none place-items-center rounded-full bg-accent text-on-accent";
const STEP_TODO =
  "grid size-7 flex-none place-items-center rounded-full border-2 border-accent text-[12px] font-bold text-accent";

/**
 * What to do first, while nothing is playing — two steps for a host, and for a
 * guest the reassurance that waiting is all they need to do.
 */
function GettingStarted({ isHost, guests }: { isHost: boolean; guests: number }) {
  const setTab = useWatchPartyStore((s) => s.setTab);

  if (!isHost) {
    return (
      <section className={CARD} aria-label="Getting started">
        <p className="text-[13px] leading-relaxed">
          You&apos;re in! It starts playing here by itself when the host picks something. Want to suggest
          something? Add a link in <b>Queue</b>.
        </p>
        <button type="button" onClick={() => setTab("queue")} className={`${BTN} self-start`}>
          Suggest something
        </button>
      </section>
    );
  }

  const invited = guests > 0;
  const steps = [
    {
      done: invited,
      label: invited ? `${guests} ${guests === 1 ? "friend has" : "friends have"} joined` : "Invite your friends",
      detail: invited ? "Invite more any time from People." : "Share an invite, then paste the reply they send back.",
      action: invited ? "Invite more" : "Invite",
      tab: "people" as const,
    },
    {
      done: false,
      label: "Pick something to watch",
      detail: "A YouTube link, a video link, a file on this device, or your screen.",
      action: "Choose",
      tab: "queue" as const,
    },
  ];

  return (
    <section className={CARD} aria-labelledby="party-start">
      <h3 id="party-start" className={SECTION_TITLE}>
        Get the party going
      </h3>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-3">
            <span className={s.done ? STEP_DONE : STEP_TODO}>{s.done ? <CheckIcon size={14} /> : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">
                {s.done && <span className="sr-only">Done: </span>}
                {s.label}
              </p>
              <p className="text-[12px] leading-relaxed text-ink-soft">{s.detail}</p>
            </div>
            <button type="button" onClick={() => setTab(s.tab)} className={btn(false, true)}>
              {s.action}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
