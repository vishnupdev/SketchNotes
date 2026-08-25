"use client";

import { useEffect, useRef, useState } from "react";
import { useTextKitStore } from "@/store/useTextKitStore";
import { HASHES, hashFile, hashText, SHA_FILE_LIMIT, type HashId } from "@/lib/TextKit/hash";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { cx, formatBytes } from "@/lib/utils";
import { CheckIcon, CloseIcon, ImportIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

const input =
  "w-full rounded-[9px] border-[1.5px] border-border bg-paper px-2.5 py-2 font-mono text-[12.5px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

/**
 * Hashes of text, and of files.
 *
 * The file half is the one that matters: checking a download against a published
 * checksum is exactly the job people hand to a random website, and the file is
 * often the last thing you should upload anywhere. Here it is read in this tab
 * and nothing leaves.
 *
 * The comparison box is deliberately not a "do they match" afterthought —
 * eyeballing two 64-character strings is how a mismatch gets missed, so the
 * answer is computed and stated.
 */
export function HashPanel() {
  const text = useTextKitStore((s) => s.text);
  const setText = useTextKitStore((s) => s.setText);
  const [algorithm, setAlgorithm] = useState<HashId>("sha256");
  const [textDigest, setTextDigest] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileDigest, setFileDigest] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [expected, setExpected] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Text hashes are cheap, so they follow every keystroke.
  useEffect(() => {
    if (!text) {
      setTextDigest("");
      return;
    }
    let cancelled = false;
    void hashText(text, algorithm).then((digest) => {
      if (!cancelled) setTextDigest(digest);
    });
    return () => {
      cancelled = true;
    };
  }, [text, algorithm]);

  const shaTooBig = file != null && algorithm !== "crc32" && file.size > SHA_FILE_LIMIT;

  const runFile = async (chosen: File, id: HashId) => {
    setBusy(true);
    setProgress(0);
    setFileDigest("");
    try {
      const digest = await hashFile(chosen, id, setProgress);
      setFileDigest(digest);
    } catch {
      setFileDigest("");
    } finally {
      setBusy(false);
    }
  };

  /** Compare loosely: checksums are pasted with stray spaces and any case. */
  const normalised = expected.trim().toLowerCase().replace(/\s+/g, "");
  const target = fileDigest || textDigest;
  const verdict = normalised && target ? normalised === target : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {HASHES.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.hint}
            onClick={() => {
              setAlgorithm(option.id);
              if (file) void runFile(file, option.id);
            }}
            aria-current={option.id === algorithm}
            className={cx(
              "flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              option.id === algorithm
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-ink-soft">{HASHES.find((h) => h.id === algorithm)?.hint}</p>

      <TextField
        label="Text"
        value={text}
        onChange={setText}
        rows={5}
        placeholder="Anything you want the hash of."
      />
      {textDigest && (
        <TextField label={`${algorithm.toUpperCase()} of the text`} value={textDigest} rows={2} />
      )}

      {/* ---------------------------- a file ---------------------------- */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-paper p-3.5">
        <p className="text-[13px] font-semibold">Hash a file</p>
        <p className="text-[12px] leading-relaxed text-ink-soft">
          Read in this tab and never uploaded — which is the point when the file is the thing you
          are checking.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className={BTN} disabled={busy}>
            <ImportIcon size={15} />
            {file ? "Choose another file" : "Choose a file"}
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            aria-label="Choose a file to hash"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              e.target.value = "";
              if (!chosen) return;
              setFile(chosen);
              if (!(algorithm !== "crc32" && chosen.size > SHA_FILE_LIMIT)) {
                void runFile(chosen, algorithm);
              }
            }}
          />
          {file && (
            <span className="min-w-0 truncate text-[12.5px] text-ink-soft">
              {file.name} · {formatBytes(file.size)}
            </span>
          )}
        </div>

        {busy && (
          <div
            role="progressbar"
            aria-label="Hashing the file"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
        )}

        {shaTooBig && (
          <p className="text-[12px] leading-relaxed text-danger">
            {formatBytes(file.size)} is too large for {algorithm.toUpperCase()}: the browser has to
            hold the whole file in one buffer for the SHA family. Pick CRC-32, which reads the file
            in pieces and has no size limit.
          </p>
        )}

        {fileDigest && (
          <TextField label={`${algorithm.toUpperCase()} of the file`} value={fileDigest} rows={2} />
        )}
      </div>

      {/* -------------------------- comparison -------------------------- */}
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Compare with a published checksum
        </span>
        <input
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="Paste the checksum you were given"
          spellCheck={false}
          aria-label="Expected checksum"
          className={input}
        />
      </label>

      {verdict !== null && (
        <p
          role="status"
          className={cx(
            "inline-flex items-center gap-2 text-[13px] font-semibold",
            verdict ? "text-success" : "text-danger",
          )}
        >
          {verdict ? <CheckIcon size={16} /> : <CloseIcon size={16} />}
          {verdict
            ? "They match."
            : "They do not match — the file or the text is not what the checksum describes."}
        </p>
      )}
    </div>
  );
}
