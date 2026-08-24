"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFileDrop } from "@/hooks/useFileDrop";
import { clearInviteFromLocation, inviteFromLocation } from "@/lib/rtc/code";
import { BLOB_SINK_LIMIT } from "@/lib/FileDrop/sink";
import { acceptFrame, newCollector } from "@/lib/qr/frames";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import type { ReachMode } from "@/lib/rtc/peer";
import { CodeExchange } from "@/components/FileDrop/molecules/CodeExchange";
import { TransferView } from "@/components/FileDrop/molecules/TransferView";
import { ReachPicker } from "@/components/FileDrop/molecules/ReachPicker";
import { cx, formatBytes } from "@/lib/utils";
import { CameraIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

/**
 * The receiving side: take an invite, say yes, choose where files land.
 *
 * Three ways in, because "the other device" could be anywhere: an invite link
 * opened on this device (picked up from the URL fragment automatically), a code
 * pasted from a message, or a QR code held up to the camera.
 *
 * Nothing is written to disk before the offer has been shown and accepted, and
 * the app says up front whether files will stream into a folder or be collected
 * as downloads — the difference matters for a multi-gigabyte file, and only
 * before it starts.
 */
export function ReceiveFilesPanel({ drop }: { drop: ReturnType<typeof useFileDrop> }) {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<ReachMode>("local");
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const collectorRef = useRef(newCollector());
  const joinRef = useRef(drop.join);
  joinRef.current = drop.join;

  const stopScan = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stopScan, [stopScan]);

  /*
   * An invite link opened on this device. The code sits in the URL fragment,
   * which never reached a server on its way here; it is taken up once and cleared
   * from the address bar so a reload can't replay a stale invite.
   */
  useEffect(() => {
    const invite = inviteFromLocation();
    if (!invite) return;
    clearInviteFromLocation();
    setCode(invite);
    // An invite that travelled by link almost certainly crossed networks.
    setMode("internet");
    void joinRef.current(invite, "internet");
  }, []);

  const scan = useCallback(async () => {
    setScanNote("");
    collectorRef.current = newCollector();
    const video = videoRef.current;
    if (!video) return;
    setScanning(true);
    const scanner = await startScanner({
      video,
      continuous: true,
      onError: (message) => {
        setScanNote(message);
        setScanning(false);
      },
      onResult: (text) => {
        void (async () => {
          // An invite is usually one code but can be several frames; the frame
          // collector handles both, and a bare code (not framed) is taken as-is.
          const result = await acceptFrame(collectorRef.current, text);
          if (result.status === "progress") {
            setScanNote(`Reading the invite… ${result.received} of ${result.total} parts`);
            return;
          }
          if (result.status === "failed") {
            setScanNote(result.reason);
            return;
          }
          const invite = result.status === "complete" ? result.payload : text;
          stopScan();
          setCode(invite);
          void joinRef.current(invite, mode);
        })();
      },
    });
    scannerRef.current = scanner;
    if (!scanner) setScanning(false);
  }, [mode, stopScan]);

  /* ------------------------------ transfer ------------------------------ */
  if (drop.phase === "transferring" || drop.phase === "done" || drop.phase === "cancelled") {
    const files = drop.offer?.files ?? [];
    return (
      <div className="flex flex-col gap-4">
        <TransferView
          files={files}
          total={drop.offer?.total ?? 0}
          progress={drop.progress}
          results={drop.results}
          onCancel={drop.phase === "transferring" ? drop.cancel : undefined}
        />
        {drop.message && (
          <p role="status" className="text-[12.5px] leading-relaxed text-ink-soft">
            {drop.message}
          </p>
        )}
        {drop.phase === "done" && drop.sinkLabel.startsWith("collecting") && (
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Each file was collected in memory before being saved. Choosing a folder streams
            straight to disk instead, which is what very large files need.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setCode("");
            drop.reset();
          }}
          className={cx(BTN, "self-start")}
        >
          Receive something else
        </button>
      </div>
    );
  }

  /* ------------------------- the offer to accept ------------------------ */
  if (drop.phase === "offered" && drop.offer) {
    const { files, total } = drop.offer;
    const resumeBytes = Object.values(drop.resumable).reduce((sum, p) => sum + p.bytes, 0);
    // Above this, holding the file in memory is a real risk — so the folder (or
    // a streaming download) stops being a nicety.
    const huge = total > BLOB_SINK_LIMIT;
    const memoryOnly = !drop.canPickFolder && !drop.canStream;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4">
          <div>
            <p className="text-[14px] font-bold">
              {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(total)}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Coming straight from the other device. Nothing is saved until you accept.
            </p>
          </div>

          <ul role="list" className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {files.map((file, index) => {
              const partial = drop.resumable[index];
              return (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 text-[12.5px]"
                >
                  <span className="min-w-0 truncate font-semibold">{file.name}</span>
                  <span className="flex-none text-ink-soft">
                    {partial
                      ? `${formatBytes(partial.bytes)} of ${formatBytes(file.size)} already here`
                      : formatBytes(file.size)}
                  </span>
                </li>
              );
            })}
          </ul>

          {resumeBytes > 0 && (
            <p className="rounded-xl border border-border bg-paper p-2.5 text-[12.5px] leading-relaxed">
              {formatBytes(resumeBytes)} is already on disk from an interrupted attempt and
              won&apos;t be sent again. Accept into the same folder to carry on from there.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {drop.canPickFolder && (
              <button type="button" onClick={() => void drop.accept(true)} className={BTN_ACCENT}>
                {resumeBytes > 0 ? "Continue into that folder" : "Choose a folder and accept"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void drop.accept(false)}
              className={drop.canPickFolder ? BTN : BTN_ACCENT}
            >
              {drop.canStream ? "Accept as a download" : "Accept as downloads"}
            </button>
            {drop.canPickFolder && !resumeBytes && (
              <button
                type="button"
                onClick={() => void drop.checkResume()}
                className={BTN}
                title="Look in a folder for part of this transfer from a previous attempt"
              >
                Resume an earlier attempt…
              </button>
            )}
            <button type="button" onClick={drop.decline} className={BTN}>
              Decline
            </button>
          </div>

          {drop.checking && (
            <p role="status" className="text-[12px] text-ink-soft">
              {drop.checking}
            </p>
          )}

          <p className="text-[12px] leading-relaxed text-ink-soft">
            {drop.canPickFolder
              ? "A folder streams each file straight to disk as it arrives — no size limit, and an interrupted transfer can be continued."
              : drop.canStream
                ? "Files stream straight into your downloads as they arrive, so there is no size limit. Interrupted transfers have to start again."
                : "This browser has to collect each file before saving it, so a very large one may not fit in memory."}
            {memoryOnly && huge
              ? ` This transfer is ${formatBytes(total)}, which is more than that route can be trusted with — open it in a browser that can pick a folder, or ask for smaller files.`
              : ""}
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------- pairing ------------------------------ */
  return (
    <div className="flex flex-col gap-4">
      {drop.myCode ? (
        <>
          <CodeExchange
            code={drop.myCode}
            title="Send this reply back"
            hint="Paste it into the sending device's “Step 2” box (or hold the QR up to its camera). The transfer starts as soon as it connects."
          />
          <p role="status" className="text-[12.5px] text-ink-soft">
            {drop.message || "Waiting for the sending device…"}
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Open the invite link the other device gave you, paste its code here, or scan its QR.
            Files arrive directly from that device — nothing passes through a server.
          </p>

          <ReachPicker mode={mode} onMode={setMode} />

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
              Invite code or link
            </span>
            <textarea
              rows={3}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OAD1.… or https://…/drop#i=…"
              aria-label="Invite code or link from the sending device"
              className="w-full resize-y rounded-[9px] border-[1.5px] border-border bg-panel px-2.5 py-2 font-mono text-[11.5px] wrap-anywhere text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void drop.join(code, mode)}
              disabled={code.trim().length < 12 || !drop.supported}
              className={BTN_ACCENT}
            >
              Open the invite
            </button>
            {scanning ? (
              <button type="button" onClick={stopScan} className={BTN}>
                <StopIcon size={15} />
                Stop camera
              </button>
            ) : (
              <button type="button" onClick={() => void scan()} className={BTN}>
                <CameraIcon size={15} />
                Scan a QR instead
              </button>
            )}
          </div>

          <div
            className={cx(
              "relative aspect-square w-full max-w-80 overflow-hidden rounded-2xl border border-border bg-paper",
              scanning ? "" : "hidden",
            )}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera preview"
              className="size-full object-cover"
            />
          </div>

          {scanNote && <p className="text-[12.5px] text-ink-soft">{scanNote}</p>}
        </>
      )}

      {drop.error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {drop.error}
        </p>
      )}
    </div>
  );
}
