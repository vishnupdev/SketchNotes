"use client";

import { useCallback, useState } from "react";
import { useQrFilesStore } from "@/store/useQrFilesStore";
import {
  buildFileFrames,
  CHUNK_CHOICES,
  CHUNK_HINT,
  type ChunkSize,
} from "@/lib/qr/file-frames";
import { QR_ECCS, QR_ECC_HINT, type QrEcc } from "@/lib/qr/types";
import {
  formatDuration,
  planFor,
  readPickedFile,
  WARN_FRAMES,
  type PickedFile,
} from "@/lib/QrFiles/files";
import { MAX_PRINTABLE_CODES, printSheet, saveSheetZip, sheetCount } from "@/lib/QrFiles/sheet";
import { FileDropZone } from "@/components/QrFiles/molecules/FileDropZone";
import { FileTile } from "@/components/QrFiles/molecules/FileTile";
import { CodeGrid } from "@/components/QrFiles/molecules/CodeGrid";
import { FramePlayer } from "@/components/SketchNotes/molecules/FramePlayer";
import { DownloadIcon, LayersIcon, PlayIcon, QrIcon } from "@/components/SketchNotes/atoms/icons";
import { cx, formatBytes } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

interface Built {
  frames: string[];
  packedBytes: number;
}

/** A row of small choices — the same shape for both settings. */
function Choices<T extends string | number>({
  label,
  hint,
  options,
  value,
  render,
  title,
  onChange,
}: {
  label: string;
  hint: string;
  options: readonly T[];
  value: T;
  render: (option: T) => string;
  title: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    // Full width until there is room for both side by side: at 390px, two
    // columns of pills wrap into a ragged block that reads as one list.
    <fieldset className="min-w-0 flex-1 basis-full min-[520px]:basis-0">
      <legend className="font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={option === value}
            title={title(option)}
            onClick={() => onChange(option)}
            className={cx(
              "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
              option === value
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {render(option)}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">{hint}</p>
    </fieldset>
  );
}

/**
 * The forward direction: a file in, a wall of codes out.
 *
 * The order of the screen is the order of the decision. What the file is and
 * what it will cost — how many codes, how many pages, how long the loop runs —
 * comes *before* the button that spends that time, because with this transport
 * the cost is the whole question. A holiday photo is two hundred codes; knowing
 * that up front is what lets someone resize it first, or reach for File Drop
 * instead.
 */
export function EncodePanel() {
  const chunk = useQrFilesStore((s) => s.chunk);
  const ecc = useQrFilesStore((s) => s.ecc);
  const setChunk = useQrFilesStore((s) => s.setChunk);
  const setEcc = useQrFilesStore((s) => s.setEcc);
  const remember = useQrFilesStore((s) => s.remember);

  const [file, setFile] = useState<PickedFile | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const [view, setView] = useState<"loop" | "sheet">("loop");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const pick = useCallback(async (chosen: File) => {
    setError("");
    setBuilt(null);
    setBusy("Reading the file…");
    try {
      setFile(await readPickedFile(chosen));
    } catch (e) {
      setFile(null);
      setError(e instanceof Error ? e.message : "That file couldn't be read.");
    } finally {
      setBusy("");
    }
  }, []);

  const plan = file ? planFor(file.bytes.length, chunk) : null;

  const build = async () => {
    if (!file) return;
    setError("");
    setBusy("Making the codes…");
    try {
      const stream = await buildFileFrames(
        { name: file.name, type: file.mime, bytes: file.bytes },
        { chunkBytes: chunk },
      );
      setBuilt({ frames: stream.frames, packedBytes: stream.packedBytes });
      setView("loop");
      remember({
        name: file.name,
        mime: file.mime,
        fileClass: file.fileClass,
        size: file.bytes.length,
        parts: stream.frames.length,
        origin: "encoded",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The codes couldn't be made.");
    } finally {
      setBusy("");
    }
  };

  const print = async () => {
    if (!built || !file) return;
    setError("");
    setBusy("Laying out the sheet…");
    try {
      await printSheet({ name: file.name, bytes: file.bytes.length, ecc }, built.frames);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The sheet couldn't be printed.");
    } finally {
      setBusy("");
    }
  };

  const download = async () => {
    if (!built || !file) return;
    setError("");
    try {
      await saveSheetZip(
        { name: file.name, bytes: file.bytes.length, ecc },
        built.frames,
        (done, total) => setBusy(`Drawing code ${done} of ${total}…`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The images couldn't be saved.");
    } finally {
      setBusy("");
    }
  };

  const reset = () => {
    setFile(null);
    setBuilt(null);
    setError("");
  };

  return (
    <div className="flex flex-col gap-5">
      {!file && <FileDropZone onFile={(f) => void pick(f)} busy={!!busy} />}

      {file && (
        <FileTile
          name={file.name}
          mime={file.mime}
          size={file.bytes.length}
          fileClass={file.fileClass}
          parts={built?.frames.length}
          note={
            built
              ? `Packed to ${formatBytes(built.packedBytes)} before encoding. Every code is needed; they can be read in any order.`
              : plan
                ? `At most ${plan.frames} codes at this size — ${plan.sheets} printed page${
                    plan.sheets === 1 ? "" : "s"
                  }, or a loop of roughly ${formatDuration(plan.loopSeconds)}. Anything that compresses comes to fewer; a photo or a video, which already are compressed, will not.`
                : undefined
          }
          actions={
            <button type="button" onClick={reset} className={BTN}>
              Change file
            </button>
          }
        />
      )}

      {file && !built && (
        <>
          <div className="flex flex-wrap gap-5 rounded-2xl border border-border bg-panel p-4">
            <Choices
              label="Code size"
              hint={CHUNK_HINT[chunk]}
              options={CHUNK_CHOICES}
              value={chunk}
              render={(c) => `${c} B`}
              title={(c) => CHUNK_HINT[c as ChunkSize]}
              onChange={(c) => setChunk(c as ChunkSize)}
            />
            <Choices
              label="Error correction"
              hint={`${QR_ECC_HINT[ecc]}. Applies to the printed sheet and the saved images.`}
              options={QR_ECCS}
              value={ecc}
              render={(e) => e as string}
              title={(e) => QR_ECC_HINT[e as QrEcc]}
              onChange={(e) => setEcc(e as QrEcc)}
            />
          </div>

          {plan?.heavy && (
            <p className="rounded-2xl border border-border bg-panel p-3.5 text-[12.5px] leading-relaxed text-ink-soft">
              That is over {WARN_FRAMES} codes. It will work — the loop plays until the other
              device has them all — but if both devices are on the same network, File Drop sends
              the same file in one go. This is the transport for when there is no network at all,
              or when the file has to end up on paper.
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={() => void build()}
              disabled={!!busy}
              className={BTN_ACCENT}
            >
              <QrIcon size={15} />
              {busy || "Make the codes"}
            </button>
          </div>
        </>
      )}

      {built && file && (
        <>
          <div
            role="tablist"
            aria-label="How to show the codes"
            className="flex gap-1.5 self-start rounded-full border border-border bg-panel p-1"
          >
            {(
              [
                { id: "loop", label: "Loop", icon: <PlayIcon size={14} /> },
                { id: "sheet", label: "Sheet", icon: <LayersIcon size={14} /> },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={view === option.id}
                onClick={() => setView(option.id)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  view === option.id
                    ? "bg-accent text-on-accent"
                    : "text-ink-soft hover:text-accent",
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          {view === "loop" ? (
            <FramePlayer
              frames={built.frames}
              caption={
                built.frames.length > 1
                  ? "Open QR Files → Rebuild on the other device and hold it up to this screen. It reads the codes in any order and stops when it has them all."
                  : "The whole file fits in one code — scan it with QR Files → Rebuild."
              }
            />
          ) : (
            <CodeGrid frames={built.frames} ecc={ecc} />
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void print()}
              disabled={!!busy || built.frames.length > MAX_PRINTABLE_CODES}
              title={
                built.frames.length > MAX_PRINTABLE_CODES
                  ? `${built.frames.length} codes is more than a browser will lay out in one print job — save the images instead.`
                  : `${sheetCount(built.frames.length)} page(s)`
              }
              className={BTN}
            >
              <LayersIcon size={15} />
              Print {sheetCount(built.frames.length)} page
              {sheetCount(built.frames.length) === 1 ? "" : "s"}
            </button>
            <button type="button" onClick={() => void download()} disabled={!!busy} className={BTN}>
              <DownloadIcon size={15} />
              Save the images
            </button>
            <button type="button" onClick={reset} className={BTN}>
              Another file
            </button>
          </div>

          {busy && (
            <p role="status" className="text-[12.5px] text-ink-soft">
              {busy}
            </p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {!file && (
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          A QR code holds about a kilobyte, so anything bigger becomes a set of them — numbered,
          and useless one at a time. That is the trade this app makes on purpose: codes need no
          network, no cable and no account, and they keep working printed on paper long after the
          device that made them is gone.
        </p>
      )}
    </div>
  );
}
