"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClipStore } from "@/store/useClipStore";
import {
  AUDIO_LABELS,
  bytesPerSecond,
  cameraConstraints,
  combineTracks,
  COUNTDOWN_CHOICES,
  describeMime,
  detectSupport,
  displayConstraints,
  formatDuration,
  FPS_CHOICES,
  HEIGHT_CHOICES,
  SOURCE_LABELS,
  stopStreams,
  supportedMimeType,
  type AudioSource,
  type ClipSource,
  type ClipSupport,
} from "@/lib/Clip/recorder";
import { measureLoudness, meterFill } from "@/lib/audio-level";
import { formatBytes } from "@/lib/utils";
import {
  CameraIcon,
  MicIcon,
  MicOffIcon,
  RecordIcon,
  ScreenShareIcon,
  StopIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** Fraction of the frame the camera inset occupies when recording both. */
const INSET = 0.24;

/**
 * The recorder.
 *
 * Four implementation notes, because each is a place this could quietly do the
 * wrong thing.
 *
 * **Screen + camera is composited, not two tracks.** `MediaRecorder` takes one
 * stream, and handing it two video tracks produces a file whose second track
 * most players ignore — you would get a recording that silently lost the
 * camera. So both are drawn onto a canvas each frame and the *canvas* is
 * recorded. Screen-only and camera-only skip the canvas entirely and record the
 * capture directly, which is both sharper and much cheaper.
 *
 * **The browser's own "stop sharing" ends the recording.** A screen capture can
 * be stopped from the browser's bar rather than from this page; without
 * listening for that, recording would continue against a dead track and produce
 * a file of frozen frames.
 *
 * **The countdown runs after the permission prompt, never before.** Counting
 * down and *then* asking would put the browser's dialog on screen at zero, so
 * the first seconds of every take would be the dialog. It is cancellable, and
 * nothing is recorded until it reaches zero.
 *
 * **The level meter exists to prevent the silent take.** Recording ten minutes
 * against a muted or wrong microphone is the single most expensive mistake this
 * app allows, and it is invisible without a meter — so the meter runs from the
 * moment the capture is live, before the countdown finishes.
 */
export function RecordPanel() {
  const settings = useClipStore((s) => s.settings);
  const setSettings = useClipStore((s) => s.setSettings);
  const state = useClipStore((s) => s.state);
  const setState = useClipStore((s) => s.setState);
  const elapsed = useClipStore((s) => s.elapsed);
  const setElapsed = useClipStore((s) => s.setElapsed);
  const counting = useClipStore((s) => s.counting);
  const setCounting = useClipStore((s) => s.setCounting);
  const level = useClipStore((s) => s.level);
  const setLevel = useClipStore((s) => s.setLevel);
  const error = useClipStore((s) => s.error);
  const setError = useClipStore((s) => s.setError);
  const addClip = useClipStore((s) => s.addClip);

  const [support, setSupport] = useState<ClipSupport | null>(null);
  /** True once an audio track was actually captured, not merely requested. */
  const [micLive, setMicLive] = useState(false);

  const preview = useRef<HTMLVideoElement | null>(null);
  const screenVideo = useRef<HTMLVideoElement | null>(null);
  const cameraVideo = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const sources = useRef<MediaStream[]>([]);
  const frame = useRef<number | null>(null);
  const ticker = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);
  const levelFrame = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const recorded = useRef(0);
  /** Set when the countdown is cancelled, so it cannot start a recording. */
  const abandoned = useRef(false);

  // Feature detection has to happen on the client: `MediaRecorder` and
  // `getDisplayMedia` don't exist during the server render.
  useEffect(() => setSupport(detectSupport()), []);

  /** Stop everything: recorder, draw loop, meter, tracks, timers. */
  const teardown = useCallback(() => {
    for (const handle of [frame, levelFrame]) {
      if (handle.current !== null) cancelAnimationFrame(handle.current);
      handle.current = null;
    }
    for (const handle of [ticker, countdownTimer]) {
      if (handle.current !== null) window.clearInterval(handle.current);
      handle.current = null;
    }
    // The AudioContext holds the mic open on some platforms even after the
    // track is stopped, so it is closed rather than merely suspended.
    void audio.current?.close().catch(() => undefined);
    audio.current = null;
    stopStreams(sources.current);
    sources.current = [];
    setMicLive(false);
    setLevel(0);
    if (preview.current) preview.current.srcObject = null;
  }, [setLevel]);

  useEffect(() => () => teardown(), [teardown]);

  const stop = useCallback(() => {
    abandoned.current = true;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    else {
      teardown();
      setState("idle");
    }
  }, [setState, teardown]);

  /** Run the level meter off whichever stream carries the audio track. */
  const startMeter = (stream: MediaStream) => {
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    try {
      const context = new AudioContext();
      audio.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      // A stream of just the audio track: feeding the video track in as well
      // does nothing useful and keeps a reference to it alive.
      context.createMediaStreamSource(new MediaStream([track])).connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      let smoothed = 0;

      const read = () => {
        levelFrame.current = requestAnimationFrame(read);
        analyser.getFloatTimeDomainData(buffer);
        const fill = meterFill(measureLoudness(buffer).rms);
        // Fast attack, slow release — a meter that decayed as fast as it rose
        // flickers too much to read.
        smoothed = fill > smoothed ? fill : smoothed * 0.86 + fill * 0.14;
        setLevel(smoothed);
      };
      read();
      setMicLive(true);
    } catch {
      // No AudioContext (or a blocked one) costs the meter and nothing else —
      // the recording itself is unaffected, so this is not worth an error.
    }
  };

  /** Create the recorder and start it. Called at zero on the countdown. */
  const begin = (recordable: MediaStream, combined: MediaStream, mime: string) => {
    const media = new MediaRecorder(recordable, { mimeType: mime });
    chunks.current = [];
    recorder.current = media;

    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };

    media.onstop = () => {
      const blob = new Blob(chunks.current, { type: mime });
      const track = recordable.getVideoTracks()[0];
      const size = track?.getSettings() ?? {};

      teardown();

      if (blob.size > 0) {
        addClip({
          blob,
          url: URL.createObjectURL(blob),
          mime,
          bytes: blob.size,
          // Measured, not read off the file: a WebM from `MediaRecorder`
          // frequently reports its duration as Infinity.
          duration: recorded.current,
          source: settings.source,
          width: size.width ?? 0,
          height: size.height ?? 0,
          recorded: Date.now(),
          hasAudio: combined.getAudioTracks().length > 0,
        });
      }
      setState("idle");
    };

    media.start(1000);
    recorded.current = 0;
    setElapsed(0);
    setState("recording");

    ticker.current = window.setInterval(() => {
      if (recorder.current?.state === "recording") {
        recorded.current += 250;
        setElapsed(recorded.current);
      }
    }, 250);
  };

  const start = async () => {
    setError(null);
    abandoned.current = false;

    const mime = supportedMimeType();
    if (!mime) {
      setError("This browser has no video recorder available.");
      return;
    }

    setState("arming");

    try {
      const streams: MediaStream[] = [];
      let screen: MediaStream | null = null;
      let camera: MediaStream | null = null;

      if (settings.source === "screen" || settings.source === "both") {
        screen = await navigator.mediaDevices.getDisplayMedia(displayConstraints(settings));
        streams.push(screen);
      }
      if (settings.source === "camera" || settings.source === "both") {
        camera = await navigator.mediaDevices.getUserMedia(cameraConstraints(settings, "user"));
        streams.push(camera);
      }
      // The microphone is its own capture when the video source doesn't carry
      // it — a screen capture has no mic track of its own.
      if ((settings.audio === "mic" || settings.audio === "both") && !camera) {
        streams.push(await navigator.mediaDevices.getUserMedia({ audio: true }));
      }

      sources.current = streams;

      const combined = combineTracks(streams);
      let recordable = combined;

      if (settings.source === "both" && screen && camera) {
        recordable = compose(screen, camera, combined, settings.fps);
      }

      if (preview.current) {
        preview.current.srcObject = recordable;
        await preview.current.play().catch(() => undefined);
      }

      startMeter(combined);

      // Stopping the share from the browser's own bar has to end the recording,
      // or it keeps going against a dead track.
      for (const track of recordable.getVideoTracks()) {
        track.addEventListener("ended", () => stop());
      }

      // The user may have cancelled while the permission prompt was up.
      if (abandoned.current) {
        teardown();
        setState("idle");
        return;
      }

      if (settings.countdown > 0) {
        setState("counting");
        setCounting(settings.countdown);

        let left = settings.countdown;
        countdownTimer.current = window.setInterval(() => {
          left -= 1;
          if (abandoned.current) return;
          if (left > 0) {
            setCounting(left);
            return;
          }
          if (countdownTimer.current !== null) window.clearInterval(countdownTimer.current);
          countdownTimer.current = null;
          setCounting(0);
          begin(recordable, combined, mime);
        }, 1000);
        return;
      }

      begin(recordable, combined, mime);
    } catch (cause) {
      teardown();
      setState("idle");
      // A refused permission is the ordinary case, not a failure worth alarm.
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Permission was declined, so nothing was recorded."
          : "The capture could not be started.",
      );
    }
  };

  /** Draw screen and camera onto the canvas, and record that. */
  const compose = (
    screen: MediaStream,
    camera: MediaStream,
    withAudio: MediaStream,
    fps: number,
  ): MediaStream => {
    const board = canvas.current;
    const screenEl = screenVideo.current;
    const cameraEl = cameraVideo.current;
    if (!board || !screenEl || !cameraEl) return withAudio;

    screenEl.srcObject = screen;
    cameraEl.srcObject = camera;
    void screenEl.play().catch(() => undefined);
    void cameraEl.play().catch(() => undefined);

    const track = screen.getVideoTracks()[0]?.getSettings() ?? {};
    board.width = track.width ?? 1280;
    board.height = track.height ?? 720;

    const context = board.getContext("2d");
    const draw = () => {
      frame.current = requestAnimationFrame(draw);
      if (!context) return;

      context.drawImage(screenEl, 0, 0, board.width, board.height);

      if (cameraEl.videoWidth > 0) {
        const width = board.width * INSET;
        const height = (width * cameraEl.videoHeight) / cameraEl.videoWidth;
        const x = board.width - width - board.width * 0.02;
        const y = board.height - height - board.width * 0.02;
        context.drawImage(cameraEl, x, y, width, height);
      }
    };
    draw();

    const composed = board.captureStream(fps);
    for (const audioTrack of withAudio.getAudioTracks()) composed.addTrack(audioTrack);
    return composed;
  };

  const live = state === "recording" || state === "paused";
  const busy = live || state === "counting" || state === "arming";
  const estimate = bytesPerSecond(settings);
  const wantsMic = settings.audio === "mic" || settings.audio === "both";

  if (support && !support.recorder) {
    return (
      <p className="rounded-[14px] border border-border bg-panel p-5 text-[13px] leading-relaxed text-ink-soft">
        This browser has no <code className="font-mono">MediaRecorder</code>, so it cannot record
        video. Chrome, Edge, Firefox and Safari 15+ on a desktop all can.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The live preview. Muted, or the microphone would feed back through the
          speakers the moment recording starts. */}
      <div className="relative overflow-hidden rounded-[14px] border border-border bg-panel">
        <video
          ref={preview}
          muted
          playsInline
          className={cx("block aspect-video w-full bg-paper object-contain", !busy && "opacity-40")}
        />

        {!busy && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <RecordIcon size={24} />
              </span>
              <p className="mt-2 text-[13px] font-bold">Nothing recording</p>
              <p className="text-[11.5px] text-ink-soft">
                {support?.mime ? describeMime(support.mime) : "…"}
              </p>
            </div>
          </div>
        )}

        {/* The countdown, over the live preview — so you can see what is about
            to be recorded while you wait for it. */}
        {state === "counting" && (
          <div className="absolute inset-0 grid place-items-center bg-paper/55">
            <div className="text-center">
              <p
                aria-live="assertive"
                className="text-[64px] font-extrabold leading-none tabular-nums"
              >
                {counting}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold">Recording starts in {counting}s</p>
            </div>
          </div>
        )}

        {state === "arming" && (
          <div className="absolute inset-x-0 bottom-3 text-center">
            <span className="rounded-full bg-panel px-3 py-1.5 text-[12px] font-semibold">
              Waiting for permission…
            </span>
          </div>
        )}

        {live && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-danger px-3 py-1.5 text-[12px] font-bold text-on-accent">
            <span className="size-2 rounded-full bg-on-accent" />
            {formatDuration(elapsed)}
          </div>
        )}
      </div>

      {/* Off-screen elements the compositor draws from. */}
      <video ref={screenVideo} muted playsInline className="hidden" />
      <video ref={cameraVideo} muted playsInline className="hidden" />
      <canvas ref={canvas} className="hidden" />

      {/* The level meter. Shown from the moment a capture is live, which is
          before the countdown ends — so a muted mic is caught in time. */}
      {busy && wantsMic && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3.5 py-2.5">
          <span className={micLive ? "text-accent" : "text-ink-soft"}>
            {micLive ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
          </span>

          <span
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-border"
            role="meter"
            aria-label="Microphone level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.max(2, level * 100)}%` }}
            />
          </span>

          <span className="w-[9.5rem] flex-none text-right text-[11.5px] font-semibold text-ink-soft">
            {!micLive
              ? "no microphone track"
              : level < 0.04
                ? "silent — check the mic"
                : "picking you up"}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className={cx(
              "tint inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-bold",
              live ? "bg-danger text-on-accent" : "border border-border",
            )}
          >
            {live ? <StopIcon size={17} /> : null}
            {live ? "Stop and keep it" : "Cancel"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={settings.source !== "camera" && support?.screen === false}
            className="tint inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[14px] font-bold text-on-accent disabled:opacity-45"
          >
            <RecordIcon size={17} />
            Start recording
          </button>
        )}
      </div>

      {support?.screen === false && settings.source !== "camera" && (
        <p className="text-[12px] leading-snug text-ink-soft">
          This browser cannot capture the screen — iOS Safari has no screen-capture API at all. The
          camera still works.
        </p>
      )}

      <fieldset
        disabled={busy}
        className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-panel p-4 disabled:opacity-60"
      >
        <legend className="px-1 font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          What to capture
        </legend>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["screen", <ScreenShareIcon key="s" size={15} />],
              ["camera", <CameraIcon key="c" size={15} />],
              ["both", <RecordIcon key="b" size={15} />],
            ] as const
          ).map(([source, icon]) => (
            <button
              key={source}
              type="button"
              onClick={() => setSettings({ source: source as ClipSource })}
              aria-pressed={settings.source === source}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                settings.source === source
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border",
              )}
            >
              {icon}
              {SOURCE_LABELS[source as ClipSource]}
            </button>
          ))}
        </div>

        {settings.source === "both" && (
          <p className="text-[11.5px] leading-snug text-ink-soft">
            The camera is drawn into the bottom-right corner of the screen recording, and the two
            are composited into one video — not saved as two tracks, which most players would
            silently ignore half of.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(["none", "mic", "system", "both"] as AudioSource[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSettings({ audio: option })}
              aria-pressed={settings.audio === option}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                settings.audio === option
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border",
              )}
            >
              {option === "mic" && <MicIcon size={14} />}
              {AUDIO_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
              Frames a second
            </span>
            <select
              value={settings.fps}
              onChange={(event) => setSettings({ fps: Number(event.target.value) })}
              className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12.5px] outline-none focus-visible:border-accent"
            >
              {FPS_CHOICES.map((fps) => (
                <option key={fps} value={fps}>
                  {fps} fps
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
              Height
            </span>
            <select
              value={settings.maxHeight}
              onChange={(event) => setSettings({ maxHeight: Number(event.target.value) })}
              className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12.5px] outline-none focus-visible:border-accent"
            >
              {HEIGHT_CHOICES.map((height) => (
                <option key={height} value={height}>
                  {height === 0 ? "As the source is" : `${height}p`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
              Countdown
            </span>
            <select
              value={settings.countdown}
              onChange={(event) => setSettings({ countdown: Number(event.target.value) })}
              className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12.5px] outline-none focus-visible:border-accent"
            >
              {COUNTDOWN_CHOICES.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds === 0 ? "None" : `${seconds}s`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-[11.5px] leading-snug text-ink-soft">
          The countdown starts <strong className="font-semibold text-text">after</strong> you grant
          permission, so the browser&apos;s own prompt is never in the recording — and it can be
          cancelled without recording anything. Roughly {formatBytes(estimate)} a second, about{" "}
          {formatBytes(estimate * 600)} for a ten-minute take. Recordings are held in memory and
          never written to this browser&apos;s storage, so save the ones you want before you leave.
        </p>
      </fieldset>
    </div>
  );
}
