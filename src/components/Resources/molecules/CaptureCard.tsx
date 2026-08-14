"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/lib/utils";
import { useResourcesStore, type CaptureKind } from "@/store/useResourcesStore";
import { ACCESS_MAP, STATE_LABEL, type AccessId, type AccessState } from "@/lib/Resources/catalog";
import { ResourceGlyph } from "@/components/Resources/atoms/ResourceGlyph";
import { Elapsed } from "@/components/Resources/atoms/Elapsed";
import { MicLevel } from "@/components/Resources/molecules/MicLevel";
import { StopIcon } from "@/components/SketchNotes/atoms/icons";

/** The capture card for each resource maps 1:1 onto a catalog entry. */
const ACCESS_FOR: Record<CaptureKind, AccessId> = {
  camera: "camera",
  microphone: "microphone",
  screen: "screen",
};

const START_LABEL: Record<CaptureKind, string> = {
  camera: "Open camera",
  microphone: "Open microphone",
  screen: "Share a screen",
};

const IDLE_NOTE: Record<CaptureKind, string> = {
  camera: "No camera is open in this workspace.",
  microphone: "No microphone is open in this workspace.",
  screen: "Nothing is being captured from your screen.",
};

/**
 * One capturable resource, with the only honest answer to "is it on?" — open it
 * and watch it.
 *
 * A page can only see its own streams; nothing here reports on other tabs or
 * other applications, and the card says so rather than implying otherwise. What
 * it *can* do is show exactly what a site sees once you allow it: the live
 * picture, the live level, the source the browser handed over, and how long it
 * has been held — with one button that gives it back.
 */
export function CaptureCard({ kind, state }: { kind: CaptureKind; state: AccessState }) {
  const item = ACCESS_MAP[ACCESS_FOR[kind]];
  const session = useResourcesStore((s) => s.sessions[kind]);
  const busy = useResourcesStore((s) => s.busy);
  const error = useResourcesStore((s) => s.errors[kind]);
  const start = useResourcesStore((s) => s.start);
  const stop = useResourcesStore((s) => s.stop);

  const videoRef = useRef<HTMLVideoElement>(null);
  const active = session != null;
  const waiting = busy === kind;
  const unsupported = state === "unsupported";

  // Attaching the stream is a DOM property, not an attribute, so it can't be
  // expressed in JSX — hence the ref. Detaching on teardown matters: a <video>
  // still holding a stopped MediaStream keeps its last frame on screen.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = session?.stream ?? null;
    return () => {
      el.srcObject = null;
    };
  }, [session]);

  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-2xl border bg-panel p-4 shadow-panel",
        active ? "border-accent" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "grid size-10 flex-none place-items-center rounded-xl",
            active ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
          )}
        >
          <ResourceGlyph glyph={item.glyph} size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-bold leading-tight">{item.name}</h3>
            {active ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-on-accent">
                {/* The dot pulses only where motion is welcome; the word "In use"
                    is what actually reports the state. */}
                <span aria-hidden className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                In use
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-ink-soft">
                Idle · {STATE_LABEL[state]}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            {active ? item.what : IDLE_NOTE[kind]}
          </p>
        </div>
      </div>

      {active && session && (
        <>
          {kind === "microphone" ? (
            <MicLevel stream={session.stream} />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label={`Live preview of ${item.name.toLowerCase()}`}
              className="aspect-video w-full rounded-xl border border-border bg-paper object-cover"
            />
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
            <dt className="text-ink-soft">Source</dt>
            <dd className="min-w-0 truncate font-medium" title={session.label}>
              {session.label}
            </dd>
            <dt className="text-ink-soft">Format</dt>
            <dd className="font-medium">{session.detail || "—"}</dd>
            <dt className="text-ink-soft">Open for</dt>
            <dd className="font-medium tabular-nums">
              <Elapsed since={session.startedAt} />
            </dd>
          </dl>
        </>
      )}

      {error && (
        <p role="status" className="text-[12px] leading-snug text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => (active ? stop(kind) : void start(kind))}
        disabled={unsupported || (waiting && !active)}
        className={cx(
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          active
            ? "bg-accent text-on-accent hover:brightness-110"
            : "border border-border bg-paper hover:border-accent hover:text-accent",
          unsupported && "cursor-not-allowed opacity-50",
        )}
      >
        {active && <StopIcon size={14} />}
        {unsupported
          ? "Not available here"
          : active
            ? "Stop and release"
            : waiting
              ? "Waiting for you…"
              : START_LABEL[kind]}
      </button>
    </div>
  );
}
