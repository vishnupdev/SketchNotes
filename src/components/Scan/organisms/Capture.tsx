"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScanStore } from "@/store/useScanStore";
import {
  CAMERA_MESSAGES,
  captureFrame,
  cameraSupported,
  classifyCameraError,
  closeCamera,
  openScanCamera,
} from "@/lib/Scan/camera";
import { canvasToJpeg, loadImage } from "@/lib/Scan/enhance";
import { fullFrameQuad } from "@/lib/Scan/warp";
import {
  CameraIcon,
  ImportIcon,
  StopIcon,
} from "@/components/SketchNotes/atoms/icons";

/** Cap on an imported picture's longest edge, to keep the warp fast. */
const MAX_IMPORT_EDGE = 3000;

/**
 * Getting pages in: the camera, or files already on the device.
 *
 * Both routes exist because they are both the common case — you scan a form with
 * the camera, and you "scan" a photo someone sent you from the gallery. The file
 * route also matters as the fallback wherever there is no camera at all, which is
 * most laptops.
 *
 * The camera is closed by the effect's cleanup, so leaving this app — the frame
 * unmounts it (see `Workspace.tsx`) — is what turns the camera light off. That is
 * the same guarantee Color Lens and the QR scanner give.
 */
export function Capture() {
  const addPage = useScanStore((s) => s.addPage);
  const edit = useScanStore((s) => s.edit);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const stop = useCallback(() => {
    closeCamera(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }, []);

  // Release the camera on unmount, whatever state it is in.
  useEffect(() => stop, [stop]);

  const start = async () => {
    setError(null);
    try {
      const stream = await openScanCamera();
      streamRef.current = stream;
      setLive(true);
      // Assigned after the state flip so the element exists to receive it.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      streamRef.current = null;
      setLive(false);
      setError(CAMERA_MESSAGES[classifyCameraError(err)]);
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = captureFrame(video);
    if (!canvas) {
      setError("The frame could not be captured. Give the camera a moment and try again.");
      return;
    }
    const id = addPage({
      original: canvasToJpeg(canvas, 0.92),
      width: canvas.width,
      height: canvas.height,
      // Starts as the whole frame rather than a guess at the page: a wrong
      // auto-detected quad is more work to fix than four corners to drag.
      quad: fullFrameQuad(canvas.width, canvas.height),
      filter: "document",
      rotation: 0,
    });
    edit(id);
  };

  const importFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      let lastId: string | null = null;
      for (const file of Array.from(files).slice(0, 30)) {
        if (!file.type.startsWith("image/")) continue;

        const url = URL.createObjectURL(file);
        try {
          const image = await loadImage(url);

          // Downscale a huge photo before it ever reaches the warp — a 48 MP
          // capture would otherwise mean tens of millions of sampled pixels.
          const longest = Math.max(image.naturalWidth, image.naturalHeight);
          const scale = longest > MAX_IMPORT_EDGE ? MAX_IMPORT_EDGE / longest : 1;
          const width = Math.round(image.naturalWidth * scale);
          const height = Math.round(image.naturalHeight * scale);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.drawImage(image, 0, 0, width, height);

          lastId = addPage({
            original: canvasToJpeg(canvas, 0.92),
            width,
            height,
            quad: fullFrameQuad(width, height),
            filter: "document",
            rotation: 0,
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      // Open the editor only for a single import — after a batch, the page list
      // is the more useful place to land.
      if (lastId && files.length === 1) edit(lastId);
    } catch {
      setError("One of those pictures could not be opened.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-panel p-3">
      {live ? (
        <>
          <div className="overflow-hidden rounded-[12px] border border-border bg-paper">
            {/* A live viewfinder has nothing to caption — there is no recorded
                audio track, and the frame is described by the label below. */}
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera viewfinder"
              className="block max-h-[60vh] w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shoot}
              className="tint inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-accent px-4 py-3 text-[13.5px] font-bold text-on-accent hover:opacity-90"
            >
              <CameraIcon size={18} />
              Capture the page
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Turn the camera off"
              className="tint grid size-11 flex-none place-items-center rounded-[12px] border border-border bg-paper text-ink-soft hover:border-danger hover:text-danger"
            >
              <StopIcon size={17} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void start()}
            disabled={!cameraSupported()}
            className="tint inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-accent px-4 py-3 text-[13.5px] font-bold text-on-accent hover:opacity-90 disabled:opacity-40"
          >
            <CameraIcon size={18} />
            Open the camera
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="tint inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-border bg-paper px-4 py-3 text-[13.5px] font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <ImportIcon size={18} />
            {importing ? "Opening…" : "Add pictures"}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void importFiles(e.target.files)}
        className="hidden"
      />

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Fill the frame with the page and keep it lit evenly — you mark the exact corners next, so it
        does not need to be square on. Everything happens on this device; no picture is uploaded.
      </p>
    </div>
  );
}
