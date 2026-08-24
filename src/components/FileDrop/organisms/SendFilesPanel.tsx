"use client";

import { useMemo, useState } from "react";
import { useFileDrop } from "@/hooks/useFileDrop";
import { metaOf } from "@/lib/FileDrop/transfer";
import type { ReachMode } from "@/lib/rtc/peer";
import { inviteLink } from "@/lib/rtc/code";
import { CodeExchange } from "@/components/FileDrop/molecules/CodeExchange";
import { TransferView } from "@/components/FileDrop/molecules/TransferView";
import { ReachPicker } from "@/components/FileDrop/molecules/ReachPicker";
import { FileQueue } from "@/components/FileDrop/molecules/FileQueue";
import { cx, formatBytes } from "@/lib/utils";
import { SendIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

/** Past this, a transfer takes long enough that the user deserves a warning. */
const BIG_TRANSFER = 512 * 1024 * 1024;

/**
 * The sending side: choose files, hand over an invite, then watch them go.
 *
 * Files are never read up front — a `File` is a reference to something on disk,
 * so a 4 GB video costs nothing to queue and is only ever read a chunk at a time
 * once the transfer starts.
 */
export function SendFilesPanel({ drop }: { drop: ReturnType<typeof useFileDrop> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<ReachMode>("local");
  const [replyCode, setReplyCode] = useState("");

  const total = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);
  const metas = useMemo(() => files.map(metaOf), [files]);

  const link =
    typeof window !== "undefined" && drop.myCode
      ? inviteLink(window.location.origin, "/drop", drop.myCode)
      : "";

  /* --------------------------- pick the files --------------------------- */
  if (drop.phase === "idle" || drop.phase === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Send files of any size to another device — a phone in your hand or a laptop in another
          country. The files travel straight between the two devices: nothing is uploaded, and
          nothing is stored anywhere in between.
        </p>

        <FileQueue
          files={files}
          onAdd={(added) => setFiles((current) => [...current, ...added])}
          onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
          onClear={() => setFiles([])}
        />

        {files.length > 0 && (
          <>
            <ReachPicker mode={mode} onMode={setMode} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void drop.host(files, mode)}
                disabled={!drop.supported}
                className={BTN_ACCENT}
              >
                <SendIcon size={15} />
                Create an invite
              </button>
              <span className="text-[12px] text-ink-soft">
                {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(total)}
              </span>
            </div>
            {/* Nothing is read until the transfer runs, so size costs no memory
                here — but minutes of transfer is worth saying out loud. */}
            {total > BIG_TRANSFER && (
              <p className="text-[12px] leading-relaxed text-ink-soft">
                {formatBytes(total)} is a long transfer — keep this tab open on both devices.
                It resumes from where it stopped if the connection drops, as long as the
                receiving side saved into a folder. The screen is held awake while it runs.
              </p>
            )}
          </>
        )}

        {!drop.supported && (
          <p className="text-[12.5px] text-danger">
            This browser can&apos;t open a direct connection, so File Drop can&apos;t run here.
          </p>
        )}
        {drop.error && (
          <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
            {drop.error}
          </p>
        )}
      </div>
    );
  }

  /* ------------------------------ transfer ------------------------------ */
  if (drop.phase === "transferring" || drop.phase === "done" || drop.phase === "cancelled") {
    return (
      <div className="flex flex-col gap-4">
        <TransferView
          files={metas}
          total={total}
          progress={drop.progress}
          results={drop.results}
          onCancel={drop.phase === "transferring" ? drop.cancel : undefined}
        />
        {drop.checking && (
          <p role="status" className="text-[12.5px] text-ink-soft">
            {drop.checking}
          </p>
        )}
        {drop.message && (
          <p role="status" className="text-[12.5px] text-ink-soft">
            {drop.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setFiles([]);
            setReplyCode("");
            drop.reset();
          }}
          className={cx(BTN, "self-start")}
        >
          Send something else
        </button>
      </div>
    );
  }

  /* ------------------------------- pairing ------------------------------ */
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => {
          setReplyCode("");
          drop.reset();
        }}
        className={cx(BTN, "self-start")}
      >
        ← Choose different files
      </button>

      <p className="text-[12.5px] text-ink-soft">
        {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(total)} ·{" "}
        {mode === "local" ? "this network only" : "anywhere"}
      </p>

      {drop.myCode ? (
        <CodeExchange
          code={drop.myCode}
          link={link}
          title="Step 1 — send this invite"
          hint={
            mode === "local"
              ? "Show the QR to the other device, or send the link if it is already open on it. Both devices must be on this network."
              : "Send the link by message, email or anything else you use. The code lives after the # so it never reaches a server."
          }
        />
      ) : (
        <p className="text-[12.5px] text-ink-soft">{drop.message}</p>
      )}

      {drop.awaitingReply && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-paper p-3.5">
          <p className="text-[13px] font-semibold">Step 2 — paste the reply</p>
          <p className="text-[12px] leading-relaxed text-ink-soft">
            The other device shows a reply code once it opens the invite. Paste it here to open the
            connection and start sending.
          </p>
          <textarea
            rows={3}
            value={replyCode}
            onChange={(e) => setReplyCode(e.target.value)}
            placeholder="OAD1.…"
            aria-label="Reply code from the other device"
            className="w-full resize-y rounded-[9px] border-[1.5px] border-border bg-panel px-2.5 py-2 font-mono text-[11.5px] wrap-anywhere text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="button"
            onClick={() => void drop.reply(replyCode)}
            disabled={replyCode.trim().length < 12 || drop.phase === "connecting"}
            className={cx(BTN_ACCENT, "self-start")}
          >
            {drop.phase === "connecting" ? "Connecting…" : "Connect and send"}
          </button>
        </div>
      )}

      {drop.error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {drop.error}
        </p>
      )}
    </div>
  );
}
