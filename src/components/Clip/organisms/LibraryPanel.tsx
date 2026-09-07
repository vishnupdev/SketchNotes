"use client";

import { useRef, useState } from "react";
import { useClipStore } from "@/store/useClipStore";
import {
  clipFilename,
  describeMime,
  formatDuration,
  SOURCE_LABELS,
  stillFilename,
  type Clip,
} from "@/lib/Clip/recorder";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import {
  CameraIcon,
  DownloadIcon,
  FilmIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";

/**
 * This session's recordings.
 *
 * The banner is not boilerplate — it is the most important thing on the screen.
 * These clips exist in memory only, so closing the tab loses them, and a
 * library that looked permanent would be a trap. Everything else here exists to
 * get a clip *out*: save the video, or pull a single frame out of it as a PNG,
 * which is how a screen recording becomes a screenshot of the one moment you
 * actually wanted.
 */
export function LibraryPanel() {
  const clips = useClipStore((s) => s.clips);
  const removeClip = useClipStore((s) => s.removeClip);
  const clearClips = useClipStore((s) => s.clearClips);
  const setTool = useClipStore((s) => s.setTool);

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-border bg-panel p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <FilmIcon size={26} />
        </span>
        <p className="text-[14px] font-bold">Nothing recorded yet</p>
        <p className="mx-auto max-w-[40ch] text-[12.5px] leading-relaxed text-ink-soft">
          Recordings appear here as soon as you stop one. They live in memory for as long as this
          tab is open — save the ones you want to keep.
        </p>
        <button
          type="button"
          onClick={() => setTool("record")}
          className="tint rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-on-accent"
        >
          Record something
        </button>
      </div>
    );
  }

  const total = clips.reduce((sum, clip) => sum + clip.bytes, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl border border-accent/45 bg-accent-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed">
        <strong className="font-bold">These are not saved anywhere.</strong> {clips.length} clip
        {clips.length === 1 ? "" : "s"}, {formatBytes(total)}, held in this tab&apos;s memory —
        closing or reloading loses them. Video is far too large to keep in a browser&apos;s storage
        without pushing every other app here out of it.
      </p>

      <ul className="flex flex-col gap-3">
        {clips.map((clip) => (
          <ClipRow key={clip.id} clip={clip} onRemove={() => removeClip(clip.id)} />
        ))}
      </ul>

      {clips.length > 1 && (
        <button
          type="button"
          onClick={clearClips}
          className="self-center text-[12.5px] font-semibold text-ink-soft underline decoration-dotted hover:text-danger"
        >
          Discard all {clips.length}
        </button>
      )}
    </div>
  );
}

function ClipRow({ clip, onRemove }: { clip: Clip; onRemove: () => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /**
   * Grab the frame currently showing as a PNG.
   *
   * Drawn from the video element at its own natural size, so the still is the
   * recording's real resolution rather than the size of the player on screen.
   */
  const grabStill = () => {
    const element = video.current;
    if (!element || element.videoWidth === 0) {
      setNote("Play the clip to the frame you want first.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, stillFilename(clip, element.currentTime * 1000));
    }, "image/png");
  };

  return (
    <li className="overflow-hidden rounded-[14px] border border-border bg-panel">
      <video
        ref={video}
        src={clip.url}
        controls
        playsInline
        preload="metadata"
        className="block aspect-video w-full bg-paper object-contain"
      />

      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold">
            {SOURCE_LABELS[clip.source]} · {formatDuration(clip.duration)}
          </p>
          <p className="text-[11.5px] text-ink-soft">
            {describeMime(clip.mime)}
            {clip.width > 0 && ` · ${clip.width} × ${clip.height}`} · {formatBytes(clip.bytes)}
            {clip.hasAudio ? " · with sound" : " · silent"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => saveBlob(clip.blob, clipFilename(clip))}
          className="tint inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[12.5px] font-bold text-on-accent"
        >
          <DownloadIcon size={14} />
          Save
        </button>

        <button
          type="button"
          onClick={grabStill}
          title="Save the frame showing now as a PNG"
          className="tint inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
        >
          <CameraIcon size={14} />
          Still
        </button>

        <button
          type="button"
          onClick={confirming ? onRemove : () => setConfirming(true)}
          aria-label={confirming ? "Confirm discarding this clip" : "Discard this clip"}
          className={`grid size-9 flex-none place-items-center rounded-full border ${
            confirming
              ? "border-danger bg-danger text-on-accent"
              : "border-border text-ink-soft hover:border-danger hover:text-danger"
          }`}
        >
          <TrashSmallIcon size={15} />
        </button>
      </div>

      {note && (
        <p className="px-3 pb-3 text-[12px] text-ink-soft" role="status">
          {note}
        </p>
      )}
    </li>
  );
}
