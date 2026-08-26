"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceStore, MAX_MEMO_MS } from "@/store/useVoiceStore";
import {
  blobToDataUrl,
  classifyRecorderError,
  formatClock,
  recordingSupported,
  RECORDER_MESSAGES,
  startRecording,
  type RecordingSession,
} from "@/lib/Voice/recorder";
import {
  joinTranscript,
  startTranscribing,
  transcriptionSupported,
  TRANSCRIPT_LANGUAGES,
  type TranscriptSession,
} from "@/lib/Voice/speech";
import {
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * The recorder: one big button, a level meter, and a live transcript.
 *
 * The unglamorous part of this component is the cleanup, and it is the part that
 * matters. A microphone left open shows a recording indicator the user cannot
 * explain and cannot dismiss, so every path out of a recording — stop, discard,
 * hitting the length cap, and *unmounting mid-recording* — releases the stream.
 * The app frame unmounts this whole app on an app switch (see `Workspace.tsx`),
 * which is what makes the unmount case real rather than theoretical.
 */
export function Recorder() {
  const save = useVoiceStore((s) => s.save);
  const transcribe = useVoiceStore((s) => s.transcribe);
  const setTranscribe = useVoiceStore((s) => s.setTranscribe);
  const language = useVoiceStore((s) => s.language);
  const setLanguage = useVoiceStore((s) => s.setLanguage);

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Transcript state: confirmed fragments plus the phrase in progress.
  const [fragments, setFragments] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [transcriptNote, setTranscriptNote] = useState<string | null>(null);

  const sessionRef = useRef<RecordingSession | null>(null);
  const speechRef = useRef<TranscriptSession | null>(null);
  const frameRef = useRef<number | null>(null);
  // Read inside the animation loop, which must not re-subscribe every render.
  const fragmentsRef = useRef<string[]>([]);
  fragmentsRef.current = fragments;

  const supported = recordingSupported();
  const canTranscribe = transcriptionSupported();

  /** Tear everything down. Safe to call in any state. */
  const releaseAll = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    speechRef.current?.stop();
    speechRef.current = null;
    sessionRef.current?.cancel();
    sessionRef.current = null;
  }, []);

  // The unmount guard. Deliberately depends on nothing but `releaseAll`, so it
  // runs exactly once on unmount and cannot be skipped by a re-render.
  useEffect(() => releaseAll, [releaseAll]);

  /** Finish the recording and store it. */
  const finish = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    speechRef.current?.stop();
    speechRef.current = null;
    sessionRef.current = null;

    setSaving(true);
    try {
      const result = await session.stop();
      // A recording with no audio in it is a mis-tap, not a memo.
      if (result.blob.size > 0 && result.durationMs > 400) {
        const audio = await blobToDataUrl(result.blob);
        save({
          title: "",
          audio,
          mimeType: result.mimeType,
          durationMs: result.durationMs,
          transcript: joinTranscript(fragmentsRef.current),
        });
      } else {
        setError("That recording was too short to keep.");
      }
    } catch {
      setError("The recording could not be saved.");
    } finally {
      setSaving(false);
      setRecording(false);
      setPaused(false);
      setElapsed(0);
      setLevel(0);
      setFragments([]);
      setInterim("");
    }
  }, [save]);

  /** Throw the recording away. */
  const discard = useCallback(() => {
    releaseAll();
    setRecording(false);
    setPaused(false);
    setElapsed(0);
    setLevel(0);
    setFragments([]);
    setInterim("");
  }, [releaseAll]);

  const begin = async () => {
    setError(null);
    setTranscriptNote(null);
    setFragments([]);
    setInterim("");

    try {
      const session = await startRecording();
      sessionRef.current = session;
      setRecording(true);
      setPaused(false);

      if (transcribe && canTranscribe) {
        speechRef.current = startTranscribing(language, {
          onFinal: (text) => setFragments((f) => [...f, text]),
          onInterim: setInterim,
          onError: setTranscriptNote,
        });
      }

      // One loop drives both the clock and the meter, and is also where the
      // length cap is enforced — so a forgotten recording stops itself.
      const tick = () => {
        const live = sessionRef.current;
        if (!live) return;
        const ms = live.elapsed();
        setElapsed(ms);
        setLevel(live.paused() ? 0 : live.level());
        if (ms >= MAX_MEMO_MS) {
          void finish();
          return;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      sessionRef.current = null;
      setRecording(false);
      setError(RECORDER_MESSAGES[classifyRecorderError(err)]);
    }
  };

  const togglePause = () => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.paused()) {
      session.resume();
      setPaused(false);
    } else {
      session.pause();
      setPaused(true);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-[14px] border border-border bg-panel p-4 text-center">
        <MicOffIcon size={22} className="mx-auto text-ink-soft" />
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          {RECORDER_MESSAGES.unsupported} Recording needs a browser with the MediaRecorder API —
          Chrome, Edge, Firefox or Safari 14 and later.
        </p>
      </div>
    );
  }

  const remaining = MAX_MEMO_MS - elapsed;

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-panel p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => (recording ? void finish() : void begin())}
          disabled={saving}
          aria-label={recording ? "Stop and save this recording" : "Start recording"}
          className={cx(
            "grid size-16 flex-none place-items-center rounded-full text-on-accent transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
            recording ? "bg-danger" : "bg-accent hover:scale-105",
          )}
        >
          {recording ? <StopIcon size={24} /> : <MicIcon size={26} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[24px] font-bold tabular-nums">
              {formatClock(elapsed)}
            </span>
            {recording && (
              <span className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">
                {paused ? "paused" : `${formatClock(remaining)} left`}
              </span>
            )}
          </div>

          {/* Level meter. A width transition, not a re-layout — it runs at frame
              rate and must cost nothing (rule #7). */}
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
            <div
              className={cx("h-full rounded-full", paused ? "bg-ink-soft" : "bg-accent")}
              style={{ width: `${Math.max(2, level * 100)}%` }}
            />
          </div>

          <p className="mt-1.5 text-[11.5px] text-ink-soft">
            {saving
              ? "Saving…"
              : recording
                ? paused
                  ? "Paused. Resume, or stop to save."
                  : "Recording. Stop to save it."
                : "Up to ten minutes per memo."}
          </p>
        </div>

        {recording && (
          <div className="flex flex-none flex-col gap-1.5">
            <button
              type="button"
              onClick={togglePause}
              aria-label={paused ? "Resume recording" : "Pause recording"}
              className="tint grid size-9 place-items-center rounded-full border border-border bg-paper text-ink-soft hover:border-accent hover:text-accent"
            >
              {paused ? <PlayIcon size={15} /> : <PauseIcon size={15} />}
            </button>
            <button
              type="button"
              onClick={discard}
              aria-label="Discard this recording"
              className="tint grid size-9 place-items-center rounded-full border border-border bg-paper text-ink-soft hover:border-danger hover:text-danger"
            >
              <TrashSmallIcon size={15} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold">
          <input
            type="checkbox"
            checked={transcribe && canTranscribe}
            disabled={!canTranscribe || recording}
            onChange={(e) => setTranscribe(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Transcribe as I speak
        </label>

        {transcribe && canTranscribe && (
          <>
            <label htmlFor="voice-language" className="sr-only">
              Transcription language
            </label>
            <select
              id="voice-language"
              value={language}
              disabled={recording}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-border bg-paper px-2 py-1.5 text-[12px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
            >
              {TRANSCRIPT_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* The privacy note is not a footnote. Recording is local; transcription is
          not, and that is the one thing in this workspace that leaves the device
          without the user asking for it — so it is stated where the switch is. */}
      <p className="text-[11px] leading-relaxed text-ink-soft">
        {!canTranscribe ? (
          <>This browser has no speech recognition, so memos are audio only. Recording still works.</>
        ) : transcribe ? (
          <>
            <b className="font-semibold text-text">Note:</b> your browser performs speech
            recognition, and in Chrome that means the audio is sent to Google&rsquo;s servers. The
            recording itself never leaves this device. Turn this off to keep everything local.
          </>
        ) : (
          <>Everything stays on this device. Turn on transcription to make memos searchable.</>
        )}
      </p>

      {(fragments.length > 0 || interim) && (
        <div className="rounded-[10px] border border-border bg-paper p-2.5">
          <span className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
            Live transcript
          </span>
          <p className="mt-1 text-[13px] leading-relaxed" aria-live="polite">
            {joinTranscript(fragments)}
            {interim && <span className="text-ink-soft"> {interim}…</span>}
          </p>
        </div>
      )}

      {transcriptNote && (
        <p role="status" className="text-[11.5px] leading-snug text-ink-soft">
          {transcriptNote}
        </p>
      )}
    </div>
  );
}
