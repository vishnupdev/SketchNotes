"use client";

import { useId, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { QueueRow } from "@/components/WatchParty/molecules/QueueRow";
import { FileButton } from "@/components/WatchParty/atoms/FileButton";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  FilmIcon,
  PlayIcon,
  ScreenShareIcon,
  SkipIcon,
} from "@/components/SketchNotes/atoms/icons";
import { BTN, BTN_ACCENT, btn, CARD, FIELD, ICON_BTN, LABEL, SECTION_TITLE } from "@/components/WatchParty/ui";

const MEDIA_ACCEPT = "video/*,audio/*,.mkv,.mov,.m4v,.flac,.opus";

const canShareScreen = () =>
  typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";

/**
 * The Queue tab — what is on, what is next, and how things get added.
 *
 * Anyone may paste a link (if the host allows it). Only the host can offer a
 * file or a screen, because those live on the host's device and reach everyone
 * else as a stream.
 */
export function QueuePanel() {
  const room = useWatchPartyStore((s) => s.room);
  const role = useWatchPartyStore((s) => s.role);
  const me = useWatchPartyStore((s) => s.me);
  const recent = useWatchPartyStore((s) => s.recent);
  const addLink = useWatchPartyStore((s) => s.addLink);
  const addFiles = useWatchPartyStore((s) => s.addFiles);
  const shareScreen = useWatchPartyStore((s) => s.shareScreen);
  const playNow = useWatchPartyStore((s) => s.playNow);
  const remove = useWatchPartyStore((s) => s.remove);
  const move = useWatchPartyStore((s) => s.move);
  const skip = useWatchPartyStore((s) => s.skip);
  const voteSkip = useWatchPartyStore((s) => s.voteSkip);
  const notify = useWatchPartyStore((s) => s.notify);

  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const fieldId = useId();

  if (!room) return null;
  const isHost = role === "host";
  const canAdd = isHost || room.settings.guestQueue;

  const submit = (where: "now" | "next" | "end") => {
    const result = addLink(link, where);
    if (result.ok) {
      setLink("");
      setError("");
      if (!isHost) notify("Sent to the host's queue.");
    } else {
      setError(result.reason);
    }
  };

  const voted = !!me && room.skipVotes.includes(me);
  const need = Math.floor(room.members.length / 2) + 1;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {canAdd ? (
        <section className={CARD} aria-labelledby={`${fieldId}-title`}>
          <h2 id={`${fieldId}-title`} className={SECTION_TITLE}>
            Add something
          </h2>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(isHost && !room.now ? "now" : "end");
            }}
          >
            <label htmlFor={fieldId} className={LABEL}>
              YouTube link or media file link
            </label>
            <input
              id={fieldId}
              type="text"
              inputMode="url"
              spellCheck={false}
              autoComplete="off"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setError("");
              }}
              placeholder="https://youtu.be/… or https://…/film.mp4"
              aria-describedby={error ? `${fieldId}-error` : undefined}
              className={FIELD}
            />
            {error && (
              <p id={`${fieldId}-error`} role="alert" className="text-[12px] leading-relaxed text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {isHost && (
                <button type="button" onClick={() => submit("now")} disabled={!link.trim()} className={BTN_ACCENT}>
                  <PlayIcon size={14} />
                  Play now
                </button>
              )}
              <button type="submit" disabled={!link.trim()} className={isHost ? BTN : BTN_ACCENT}>
                Add to queue
              </button>
              <button type="button" onClick={() => submit("next")} disabled={!link.trim()} className={BTN}>
                Play next
              </button>
            </div>
          </form>

          {recent.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Recent</span>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLink(r)}
                    title={r}
                    className="max-w-full truncate rounded-full border border-border bg-paper px-3 py-1.5 font-mono text-[11px] text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent min-[480px]:max-w-64"
                  >
                    {r.replace(/^https?:\/\/(www\.)?/, "")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isHost && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className={LABEL}>From this device</span>
              <div className="flex flex-wrap gap-2">
                <FileButton
                  accept={MEDIA_ACCEPT}
                  multiple
                  onFiles={(files) => {
                    const added = addFiles(files, room.now ? "end" : "now");
                    if (!added) notify("Those files aren't video or music this browser can play.");
                  }}
                >
                  <FilmIcon size={15} />
                  Video or music files
                </FileButton>
                {canShareScreen() && (
                  <button type="button" onClick={() => void shareScreen()} className={BTN}>
                    <ScreenShareIcon size={15} />
                    Share a tab or screen
                  </button>
                )}
              </div>
              <p className="text-[12px] leading-relaxed text-ink-soft">
                Files stay on this device and play to guests as a live stream — it uses your upload once per
                guest. Sharing a browser tab carries its sound too.
              </p>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-2xl border border-border bg-panel p-4 text-[12.5px] leading-relaxed text-ink-soft">
          The host is choosing what plays. Ask in the chat if you have something in mind.
        </p>
      )}

      <section aria-labelledby={`${fieldId}-now`} className="flex flex-col gap-2">
        <h2 id={`${fieldId}-now`} className={LABEL}>
          Now playing
        </h2>
        {room.now ? (
          <ul role="list">
            <QueueRow
              item={room.now}
              current
              actions={
                isHost ? (
                  <button type="button" onClick={skip} aria-label="Skip to the next" title="Skip" className={ICON_BTN}>
                    <SkipIcon size={16} />
                  </button>
                ) : room.settings.voteSkip ? (
                  <button
                    type="button"
                    onClick={voteSkip}
                    aria-pressed={voted}
                    className={btn(voted, true)}
                  >
                    Skip {room.skipVotes.length}/{need}
                  </button>
                ) : undefined
              }
            />
          </ul>
        ) : (
          <p className="text-[12.5px] text-ink-soft">Nothing yet.</p>
        )}
      </section>

      <section aria-labelledby={`${fieldId}-next`} className="flex flex-col gap-2">
        <h2 id={`${fieldId}-next`} className={LABEL}>
          Up next · {room.queue.length}
        </h2>
        {room.queue.length ? (
          <ol role="list" className="flex flex-col gap-2">
            {room.queue.map((item, i) => (
              <QueueRow
                key={item.id}
                item={item}
                actions={
                  isHost ? (
                    <>
                      <button type="button" onClick={() => playNow(item.id)} aria-label={`Play ${item.title} now`} title="Play now" className={ICON_BTN}>
                        <PlayIcon size={14} />
                      </button>
                      <span className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => move(item.id, -1)}
                          disabled={i === 0}
                          aria-label={`Move ${item.title} up`}
                          className="grid h-5 w-8 place-items-center rounded text-ink-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                        >
                          <ChevronUpIcon size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(item.id, 1)}
                          disabled={i === room.queue.length - 1}
                          aria-label={`Move ${item.title} down`}
                          className="grid h-5 w-8 place-items-center rounded text-ink-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                        >
                          <ChevronDownIcon size={15} />
                        </button>
                      </span>
                      <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.title}`} title="Remove" className={ICON_BTN}>
                        <CloseIcon size={15} />
                      </button>
                    </>
                  ) : undefined
                }
              />
            ))}
          </ol>
        ) : (
          <p className="text-[12.5px] text-ink-soft">
            {canAdd ? "The queue is empty — anything added lands here and plays in turn." : "The queue is empty."}
          </p>
        )}
      </section>

      {room.history.length > 0 && (
        <section aria-labelledby={`${fieldId}-past`} className="flex flex-col gap-2">
          <h2 id={`${fieldId}-past`} className={LABEL}>
            Played
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            {room.history.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                actions={
                  isHost ? (
                    <button type="button" onClick={() => playNow(item.id)} className={btn(false, true)}>
                      Again
                    </button>
                  ) : undefined
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
