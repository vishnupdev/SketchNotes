"use client";

import { useState } from "react";
import { useVoiceStore, type Memo } from "@/store/useVoiceStore";
import { dataUrlToBlob, extensionFor, formatClock } from "@/lib/Voice/recorder";
import { copyText } from "@/lib/export-text";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx, timeAgo, trackSpot } from "@/lib/utils";

/**
 * One memo: a title you can edit in place, a player, and its transcript.
 *
 * The player is the browser's own `<audio controls>`. A custom one would have to
 * re-implement seeking, keyboard control and screen-reader labels to end up worse
 * than the platform's — and the native control already handles playback-rate
 * menus and background-audio behaviour that a voice memo actually wants.
 */
export function MemoCard({ memo }: { memo: Memo }) {
  const rename = useVoiceStore((s) => s.rename);
  const remove = useVoiceStore((s) => s.remove);
  const dropAudio = useVoiceStore((s) => s.dropAudio);

  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const when = new Date(memo.createdAt);
  const label =
    memo.title.trim() ||
    when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const download = () => {
    if (!memo.audio) return;
    const blob = dataUrlToBlob(memo.audio);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug =
      memo.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      `memo-${when.toISOString().slice(0, 10)}`;
    link.download = `${slug}.${extensionFor(memo.mimeType)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const copy = async () => {
    if (!memo.transcript || !(await copyText(memo.transcript))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article
      onPointerMove={trackSpot}
      className="hover-spot flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-3"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`memo-title-${memo.id}`} className="sr-only">
            Title for the memo recorded {when.toLocaleString()}
          </label>
          <input
            id={`memo-title-${memo.id}`}
            type="text"
            value={memo.title}
            onChange={(e) => rename(memo.id, e.target.value)}
            placeholder={label}
            className="w-full truncate rounded-[8px] border border-transparent bg-transparent px-1 py-0.5 text-[14px] font-bold outline-none hover:border-border focus:border-accent focus:bg-paper"
          />
          <p className="mt-0.5 px-1 font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
            {formatClock(memo.durationMs)} · {timeAgo(memo.createdAt)}
            {!memo.audio && " · audio cleared"}
          </p>
        </div>

        <span className="flex flex-none gap-1">
          {memo.audio && (
            <button
              type="button"
              onClick={download}
              aria-label={`Download ${label}`}
              title="Download the audio"
              className="tint grid size-8 place-items-center rounded-lg text-ink-soft hover:text-accent"
            >
              <DownloadIcon size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => (confirmDelete ? remove(memo.id) : setConfirmDelete(true))}
            aria-label={confirmDelete ? `Confirm deleting ${label}` : `Delete ${label}`}
            className={cx(
              "tint grid size-8 place-items-center rounded-lg",
              confirmDelete ? "bg-danger text-on-accent" : "text-ink-soft hover:text-danger",
            )}
          >
            <TrashSmallIcon size={14} />
          </button>
        </span>
      </div>

      {memo.audio ? (
        /* No caption track: the memo's transcript is rendered below as real text,
           which is a better equivalent than a generated caption file would be. */
        <audio
          controls
          preload="metadata"
          src={memo.audio}
          aria-label={`Play ${label}`}
          className="w-full"
        />
      ) : (
        <p className="rounded-[8px] border border-border bg-paper px-2.5 py-2 text-[11.5px] leading-snug text-ink-soft">
          The audio was cleared to make room for newer memos. The transcript below is kept.
        </p>
      )}

      {memo.transcript && (
        <div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              aria-expanded={showTranscript}
              className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft hover:text-accent"
            >
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              aria-label="Copy the transcript"
              className="tint grid size-6 place-items-center rounded text-ink-soft hover:text-accent"
            >
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </div>
          {showTranscript && (
            <p className="mt-1 rounded-[8px] border border-border bg-paper px-2.5 py-2 text-[12.5px] leading-relaxed">
              {memo.transcript}
            </p>
          )}
        </div>
      )}

      {memo.audio && memo.transcript && (
        <button
          type="button"
          onClick={() => dropAudio(memo.id)}
          className="w-fit font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft hover:text-danger"
        >
          Clear the audio, keep the transcript
        </button>
      )}
    </article>
  );
}
