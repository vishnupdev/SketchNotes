"use client";

/**
 * Recording from the microphone.
 *
 * A thin, explicit wrapper over `MediaRecorder` rather than a hook, because the
 * lifetime of a recording is not the lifetime of a component: the stream, the
 * recorder and the chunk list have to be released in a `finally` no matter how the
 * component unmounts, and burying that in a hook's cleanup makes it easy to leak a
 * live microphone. A leaked mic is the worst bug this app could have — the browser
 * shows a recording indicator the user cannot explain.
 */

/** Container/codec preference, best first. Browsers disagree on all of these. */
const MIME_CANDIDATES = [
  // Opus in WebM is the best speech codec that is widely supported.
  "audio/webm;codecs=opus",
  "audio/webm",
  // Safari records MP4/AAC and nothing else.
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export type RecorderError =
  | "unsupported"
  | "denied"
  | "no-device"
  | "in-use"
  | "failed";

export const RECORDER_MESSAGES: Record<RecorderError, string> = {
  unsupported: "This browser cannot record audio.",
  denied:
    "Microphone access was refused. Allow it for this site in your browser's address bar, then try again.",
  "no-device": "No microphone was found on this device.",
  "in-use": "The microphone is already in use by something else.",
  failed: "The recording could not be started.",
};

export const recordingSupported = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

/** The first candidate this browser will actually record, or "" for its default. */
export function pickMimeType(): string {
  if (typeof window === "undefined" || !window.MediaRecorder?.isTypeSupported) return "";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function classifyRecorderError(err: unknown): RecorderError {
  const name = (err as { name?: string } | null)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-device";
  if (name === "NotReadableError" || name === "AbortError") return "in-use";
  return "failed";
}

export interface Recording {
  blob: Blob;
  mimeType: string;
  /** Milliseconds, measured rather than read off the blob (which often lies). */
  durationMs: number;
}

/**
 * A single recording session.
 *
 * `stop()` resolves with the finished audio. `cancel()` throws the audio away.
 * Either one releases the microphone — and so does a `stop()` that fails, which is
 * why the track cleanup sits in a `finally`.
 */
export interface RecordingSession {
  stop: () => Promise<Recording>;
  cancel: () => void;
  /** Live input level, 0–1, for the meter. Safe to call at animation rate. */
  level: () => number;
  /** Milliseconds elapsed so far. */
  elapsed: () => number;
  pause: () => void;
  resume: () => void;
  paused: () => boolean;
}

/**
 * Open the microphone and start recording.
 *
 * The constraints ask for the processing a voice memo wants — echo cancellation,
 * noise suppression, auto gain — because the alternative is a recording of a room
 * rather than of a person. Mono and 32 kbps: speech gains nothing from stereo, and
 * the bitrate is what keeps a ten-minute memo small enough to keep on the device.
 */
export async function startRecording(): Promise<RecordingSession> {
  if (!recordingSupported()) {
    throw Object.assign(new Error(RECORDER_MESSAGES.unsupported), { name: "UnsupportedError" });
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  });

  const mimeType = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 32_000,
    });
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw err;
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // A level meter off the same stream. Kept small and time-domain: an FFT would
  // be more than a single bar needs.
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let samples: Uint8Array<ArrayBuffer> | null = null;
  try {
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    samples = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  } catch {
    // No meter is a cosmetic loss; the recording itself is unaffected.
    audioCtx = null;
    analyser = null;
  }

  const startedAt = Date.now();
  let pausedAt: number | null = null;
  let pausedTotal = 0;
  let settled = false;

  const elapsed = () =>
    Date.now() - startedAt - pausedTotal - (pausedAt === null ? 0 : Date.now() - pausedAt);

  /** Release everything. Safe to call twice. */
  const release = () => {
    stream.getTracks().forEach((t) => t.stop());
    void audioCtx?.close().catch(() => {});
    audioCtx = null;
    analyser = null;
  };

  recorder.start(1000); // timeslice, so a crash still leaves usable chunks

  return {
    elapsed,
    paused: () => pausedAt !== null,

    pause: () => {
      if (recorder.state !== "recording") return;
      recorder.pause();
      pausedAt = Date.now();
    },

    resume: () => {
      if (recorder.state !== "paused") return;
      recorder.resume();
      if (pausedAt !== null) pausedTotal += Date.now() - pausedAt;
      pausedAt = null;
    },

    level: () => {
      if (!analyser || !samples) return 0;
      analyser.getByteTimeDomainData(samples);
      // Peak deviation from the 128 midpoint — cheaper than RMS and reads more
      // responsively on a single bar.
      let peak = 0;
      for (let i = 0; i < samples.length; i += 4) {
        const d = Math.abs(samples[i] - 128);
        if (d > peak) peak = d;
      }
      return Math.min(1, peak / 96);
    },

    cancel: () => {
      if (settled) return;
      settled = true;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } finally {
        release();
      }
    },

    stop: () =>
      new Promise<Recording>((resolve, reject) => {
        if (settled) {
          reject(new Error("This recording has already finished."));
          return;
        }
        settled = true;
        const durationMs = elapsed();

        recorder.onstop = () => {
          try {
            const type = recorder.mimeType || mimeType || "audio/webm";
            resolve({ blob: new Blob(chunks, { type }), mimeType: type, durationMs });
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          } finally {
            release();
          }
        };

        recorder.onerror = () => {
          release();
          reject(new Error(RECORDER_MESSAGES.failed));
        };

        try {
          if (recorder.state === "inactive") recorder.onstop?.(new Event("stop"));
          else recorder.stop();
        } catch (err) {
          release();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
  };
}

/**
 * A Blob as a `data:` URL.
 *
 * Storage in this workspace is a string key/value store (`lib/storage.ts`), and
 * the established way to keep binary in it is a data URL — the same thing custom
 * cursors do. Base64 costs about a third more space, which is why the app caps
 * both the length of a memo and the size of the library.
 */
export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("The recording could not be read."));
    reader.readAsDataURL(blob);
  });

/** Turn a stored data URL back into a Blob, for download. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const [, type = "audio/webm", base64, payload] = match;
  try {
    if (!base64) return new Blob([decodeURIComponent(payload)], { type });
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type });
  } catch {
    return null;
  }
}

/** File extension for a recorded MIME type, for the download name. */
export function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/** mm:ss, or h:mm:ss past an hour. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
