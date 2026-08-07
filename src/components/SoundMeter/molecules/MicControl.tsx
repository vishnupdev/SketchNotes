"use client";

import { useSoundMeterStore } from "@/store/useSoundMeterStore";
import { MicIcon, MicOffIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Start/stop the microphone, and explain what happened when it won't open.
 *
 * The button is the only thing that opens the mic — capture always begins from
 * a real user gesture, which is both what browsers require and what stops a
 * page from listening the moment it loads.
 */
export function MicControl() {
  const status = useSoundMeterStore((s) => s.status);
  const error = useSoundMeterStore((s) => s.error);
  const capture = useSoundMeterStore((s) => s.capture);
  const start = useSoundMeterStore((s) => s.start);
  const stop = useSoundMeterStore((s) => s.stop);

  const live = status === "live";
  const starting = status === "starting";

  return (
    <section className="rounded-2xl border border-border bg-panel p-4 shadow-panel">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (live ? stop() : void start())}
          disabled={starting}
          aria-busy={starting}
          className={cx(
            "hover-pop inline-flex min-h-11 flex-1 items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-[14.5px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60",
            live
              ? "border border-border bg-paper text-text hover:border-accent hover:text-accent"
              : "bg-accent text-on-accent",
          )}
        >
          {live ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
          {starting ? "Starting…" : live ? "Stop listening" : "Start listening"}
        </button>

        <p
          className="flex min-w-0 items-center gap-2 text-[12px] text-ink-soft"
          role="status"
          aria-live="polite"
        >
          <span
            aria-hidden
            className={cx(
              "size-2 flex-none rounded-full",
              live ? "bg-success motion-safe:animate-pulse" : "bg-border",
            )}
          />
          <span className="truncate">
            {live
              ? capture?.deviceLabel
                ? `Listening — ${capture.deviceLabel}`
                : "Listening"
              : "Microphone off"}
          </span>
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3.5 py-2.5 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      {live && capture && !capture.rawInput && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
          Your browser kept its voice processing on (noise suppression or automatic gain), so the
          level reading is the processed signal rather than the raw microphone.
        </p>
      )}
    </section>
  );
}
