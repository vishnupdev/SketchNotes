"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDetectStore } from "@/store/useDetectStore";
import { DetectionCanvas } from "@/components/Detect/molecules/DetectionCanvas";
import { DetectionList } from "@/components/Detect/molecules/DetectionList";
import { DetectSettings } from "@/components/Detect/molecules/DetectSettings";
import {
  frameRate,
  mirrorBox,
  reconcile,
  summarise,
  type Detection,
  type TrackedDetection,
} from "@/lib/Detect/detections";
import { composeSnapshot, type BoxPalette } from "@/lib/Detect/draw";
import {
  cameraSupported,
  classifyCameraError,
  closeCamera,
  openCamera,
  type CameraError,
} from "@/lib/camera";
import { cx } from "@/lib/utils";
import {
  CameraFlipIcon,
  CameraIcon,
  DownloadIcon,
  PlayIcon,
  StopIcon,
} from "@/components/SketchNotes/atoms/icons";

/**
 * The live view's wording for each camera failure.
 *
 * The *classification* is the workspace's shared one (`lib/camera.ts`); only the
 * wording is this app's, because only this app can suggest the Picture tab as
 * the way to carry on without a camera at all.
 */
const CAMERA_MESSAGES: Record<CameraError, string> = {
  unsupported: "This browser can't open a camera. Use the Picture tab to detect in a photo instead.",
  denied:
    "Camera access was blocked. Allow it in your browser's site settings and start again — or use the Picture tab, which needs no camera.",
  notfound: "No camera was found on this device. The Picture tab works without one.",
  inuse: "The camera is already in use by another app or tab.",
  insecure:
    "Using the camera needs a secure (https) connection. The Picture tab works either way.",
  unknown: "The camera couldn't be started.",
};

/** How often the running frame rate is repainted. Any faster is unreadable. */
const FPS_INTERVAL_MS = 500;
/** How often a frame is folded into the session tally. */
const RECORD_INTERVAL_MS = 1000;
/** Frames the rolling frame-rate average is taken over. */
const FPS_WINDOW = 12;

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

/**
 * The camera, and what it is looking at.
 *
 * Three things here are worth knowing before changing any of it.
 *
 * **The detections never enter React state.** They arrive about ten times a
 * second; routing them through state would re-render this panel and everything
 * under it on every frame, to update a canvas the renderer cannot see. So they
 * live in a ref, the overlay pulls them at paint time, and React is told only
 * when the *set of labels* changes — which is what the written list and the
 * screen-reader announcement are made of, and which happens at walking pace.
 *
 * **Every exit path stops the camera.** Leaving the tab unmounts this panel
 * (the tab bar swaps panels rather than hiding them), switching apps unmounts
 * the app, and both land in the same cleanup. A stream left running shows a
 * recording indicator the user cannot explain or dismiss.
 *
 * **Nothing leaves the device.** Frames are read into the detector and dropped;
 * no frame is stored, uploaded or kept beyond the moment it is scored. The only
 * thing that survives a frame is the tally — labels and counts, in memory.
 */
export function LivePanel() {
  const model = useDetectStore((s) => s.model);
  const minScore = useDetectStore((s) => s.minScore);
  const showScores = useDetectStore((s) => s.showScores);
  const facing = useDetectStore((s) => s.facing);
  const setFacing = useDetectStore((s) => s.setFacing);
  const record = useDetectStore((s) => s.record);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackedRef = useRef<TrackedDetection[]>([]);
  const runningRef = useRef(false);
  const stampsRef = useRef<number[]>([]);
  const labelKeyRef = useRef("");
  const lastFpsRef = useRef(0);
  const lastRecordRef = useRef(0);

  // Settings the loop reads. Kept in refs so that moving the threshold slider
  // takes effect on the next frame without restarting the loop — and without
  // the loop capturing a stale value from the render it was started in.
  const settingsRef = useRef({ model, minScore, facing });
  settingsRef.current = { model, minScore, facing };

  const [status, setStatus] = useState<"idle" | "starting" | "running">("idle");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Detection[]>([]);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [fps, setFps] = useState<number | null>(null);
  const [multipleCameras, setMultipleCameras] = useState(false);

  const mirrored = facing === "user";

  const stop = useCallback(() => {
    runningRef.current = false;
    closeCamera(streamRef.current);
    streamRef.current = null;
    // Detaching the stream is what actually clears the "camera in use" state in
    // some browsers, even after the tracks have been stopped.
    if (videoRef.current) videoRef.current.srcObject = null;
    trackedRef.current = [];
    stampsRef.current = [];
    labelKeyRef.current = "";
    setVisible([]);
    setFps(null);
    setStatus("idle");
  }, []);

  // The one cleanup every exit funnels through: tab change, app switch, reload.
  useEffect(() => stop, [stop]);

  // A flip button only earns its place on a device with something to flip to.
  useEffect(() => {
    if (!cameraSupported() || !navigator.mediaDevices?.enumerateDevices) return;
    let live = true;
    void navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (live) setMultipleCameras(devices.filter((d) => d.kind === "videoinput").length > 1);
      })
      .catch(() => {
        /* a browser that won't enumerate simply gets no flip button */
      });
    return () => {
      live = false;
    };
  }, []);

  const loop = useCallback(async () => {
    const { detect } = await import("@/lib/Detect/engine");

    while (runningRef.current) {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) {
        await nextFrame();
        continue;
      }

      let found: Detection[];
      try {
        found = await detect(video, settingsRef.current.model, {
          minScore: settingsRef.current.minScore,
        });
      } catch {
        // A frame the detector choked on is not worth tearing the session down
        // for; the next one is 100ms away. A *persistent* failure shows up as a
        // frozen frame rate, which is visible on screen.
        await nextFrame();
        continue;
      }
      if (!runningRef.current) break;

      // The model is given the unflipped frame; the preview is mirrored in CSS.
      // Mirroring the boxes rather than the frame keeps it to one canvas read.
      //
      // Read from the ref, never from a closure: flipping the camera restarts
      // this loop from the *previous* render's callback, so a value captured at
      // render time would be the camera we just flipped away from — and every
      // box would sit on the wrong side of a mirrored preview.
      const placed =
        settingsRef.current.facing === "user"
          ? found.map((d) => ({ ...d, box: mirrorBox(d.box, video.videoWidth) }))
          : found;

      trackedRef.current = reconcile(trackedRef.current, placed);

      const now = performance.now();
      stampsRef.current = [...stampsRef.current, now].slice(-FPS_WINDOW);
      if (now - lastFpsRef.current > FPS_INTERVAL_MS) {
        lastFpsRef.current = now;
        setFps(frameRate(stampsRef.current));
      }

      // React hears about a frame only when what is in it changed. Ten renders
      // a second to redraw the same three list rows is the cost this avoids —
      // and an aria-live region that re-announces every frame is unusable.
      const key = summarise(found);
      if (key !== labelKeyRef.current) {
        labelKeyRef.current = key;
        setVisible(found);
      }

      if (now - lastRecordRef.current > RECORD_INTERVAL_MS) {
        lastRecordRef.current = now;
        record(found);
      }

      // Yield a frame so the overlay's own loop can paint and the page stays
      // responsive; without it the detector monopolises the main thread.
      await nextFrame();
    }
  }, [record]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("starting");

    // The model first, the camera second. Asking for the camera and then making
    // someone watch a permission-granted preview freeze for ten seconds while
    // several megabytes download is the wrong order — this way the wait happens
    // before the light comes on.
    try {
      const { prepare } = await import("@/lib/Detect/engine");
      await prepare(settingsRef.current.model, (progress) => setNote(progress.note));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The detector could not be loaded.");
      setNote(null);
      setStatus("idle");
      return;
    }
    setNote(null);

    let stream: MediaStream;
    try {
      // 720p: enough detail for the model, small enough that a detection every
      // frame stays affordable. Deliberately not the sensor's maximum.
      stream = await openCamera({
        facingMode: { ideal: settingsRef.current.facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      });
    } catch (failure) {
      setError(CAMERA_MESSAGES[classifyCameraError(failure)]);
      setStatus("idle");
      return;
    }

    const video = videoRef.current;
    if (!video) {
      closeCamera(stream);
      setStatus("idle");
      return;
    }

    streamRef.current = stream;
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    try {
      await video.play();
    } catch {
      // Autoplay refused (rare for a muted inline stream); the frame loop still
      // works once the element has a frame, so this isn't fatal.
    }

    setSourceSize({ width: video.videoWidth, height: video.videoHeight });
    runningRef.current = true;
    setStatus("running");
    void loop();
  }, [loop]);

  const flip = useCallback(() => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    if (runningRef.current) {
      // Restarting is the only way to change camera: a track's facing mode is
      // fixed for its lifetime.
      //
      // The ref is written here rather than left to the render, because `setFacing`
      // has not re-rendered anything yet when the next line runs — and `start`
      // reads the camera it should open from the ref, not from this closure.
      stop();
      settingsRef.current = { ...settingsRef.current, facing: next };
      void start();
    }
  }, [facing, setFacing, start, stop]);

  const snapshot = useCallback(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage || !video.videoWidth) return;

    const styles = getComputedStyle(stage);
    const palette: BoxPalette = {
      box: styles.getPropertyValue("--detect-box").trim(),
      held: styles.getPropertyValue("--detect-box-held").trim(),
      ink: styles.getPropertyValue("--detect-box-ink").trim(),
    };

    const canvas = composeSnapshot(
      video,
      { width: video.videoWidth, height: video.videoHeight },
      trackedRef.current.filter((d) => d.missedFrames === 0),
      palette,
      { mirrored, showScores },
    );
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detected-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [mirrored, showScores]);

  const getDetections = useCallback(() => trackedRef.current, []);
  const running = status === "running";

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={stageRef}
        className="relative overflow-hidden rounded-[18px] border border-border bg-ink"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          // The front camera is mirrored so the preview behaves like a mirror,
          // which is what anyone expects of a selfie view. The boxes are
          // mirrored to match in the loop above, not here.
          style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
          className={cx("block max-h-[56vh] w-full object-contain", !running && "opacity-0")}
        />

        {running && sourceSize.width > 0 && (
          <DetectionCanvas
            sourceSize={sourceSize}
            getDetections={getDetections}
            live
            showScores={showScores}
          />
        )}

        {!running && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                <CameraIcon size={26} />
              </span>
              <p className="max-w-[44ch] text-[12.5px] leading-relaxed text-white/80">
                {status === "starting"
                  ? (note ?? "Opening the camera…")
                  : "The camera stays off until you start it, and every frame is read and dropped on this device."}
              </p>
            </div>
          </div>
        )}

        {running && (
          /* Bottom-left, not top-left. Labels are drawn at the top edge of
             whatever they name, so the top corners are exactly where they
             collect — and a frame rate sitting on top of a label is the readout
             obscuring the thing it is reporting on. Nothing is ever drawn along
             the bottom edge, because a box's lower corners carry no plate. */
          <p className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[.1em] text-white/85">
            {fps === null ? "Looking…" : `${fps.toFixed(1)} fps`}
          </p>
        )}

        {/* An empty stage would otherwise collapse to nothing before the first
            frame arrives, and the panel would jump when it does (rule #7, CLS). */}
        {!running && <div className="aspect-[4/3] max-h-[56vh] w-full" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={running ? stop : () => void start()}
          disabled={status === "starting"}
          className="hover-glow inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-bold text-on-accent disabled:opacity-45"
        >
          {running ? <StopIcon size={16} /> : <PlayIcon size={16} />}
          {running ? "Stop the camera" : status === "starting" ? "Starting…" : "Start the camera"}
        </button>

        {multipleCameras && (
          <button
            type="button"
            onClick={flip}
            disabled={status === "starting"}
            aria-label={
              facing === "environment" ? "Switch to the front camera" : "Switch to the rear camera"
            }
            className="grid size-11 place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent disabled:opacity-45"
          >
            <CameraFlipIcon size={18} />
          </button>
        )}

        <button
          type="button"
          onClick={snapshot}
          disabled={!running}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-semibold hover:border-accent hover:text-accent disabled:opacity-45"
        >
          <DownloadIcon size={15} />
          Save the frame
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] font-semibold leading-relaxed text-danger">
          {error}
        </p>
      )}

      <DetectionList
        detections={visible}
        announce={running}
        emptyNote={
          running
            ? "Nothing recognised in this frame. Try moving closer, or lowering the confidence below."
            : "Start the camera and whatever it recognises will be listed here."
        }
      />

      <DetectSettings idPrefix="detect-live" locked={running} />
    </div>
  );
}
