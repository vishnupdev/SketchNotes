"use client";

import { useMemo, useRef } from "react";
import { useOcrStore } from "@/store/useOcrStore";
import { SHAPES } from "@/lib/Ocr/export";
import { cx } from "@/lib/utils";
import { DownloadIcon, ImportIcon, StackIcon, TrashIcon } from "@/components/SketchNotes/atoms/icons";

/** Above this, the run takes long enough that people close the tab. */
const MAX_FILES = 40;

/**
 * A folder at a time.
 *
 * This is how the app is actually used once it is useful — nobody photographs
 * one receipt. The run is strictly sequential: one worker, one picture decoded
 * at a time. Forty phone photos decoded concurrently is a gigabyte of bitmaps
 * and a killed tab, and since the engine is a single worker anyway, parallelism
 * would only queue behind itself while costing all that memory.
 *
 * Failures are reported per file and never stop the run. A batch that abandoned
 * everything because picture nineteen was a HEIC the browser cannot decode
 * would be worse than useless — you would have to work out which one and start
 * again.
 */
export function BatchPanel() {
  const batch = useOcrStore((s) => s.batch);
  const running = useOcrStore((s) => s.batchRunning);
  const runBatch = useOcrStore((s) => s.runBatch);
  const clearBatch = useOcrStore((s) => s.clearBatch);
  const progress = useOcrStore((s) => s.progress);
  const shape = useOcrStore((s) => s.shape);
  const setShape = useOcrStore((s) => s.setShape);
  const error = useOcrStore((s) => s.error);
  const input = useRef<HTMLInputElement>(null);

  const done = batch.filter((item) => item.status === "done");
  const failed = batch.filter((item) => item.status === "failed");
  const shapeInfo = SHAPES.find((candidate) => candidate.id === shape) ?? SHAPES[0];

  /** Everything read, as one file, each part headed by its filename. */
  const combined = useMemo(
    () =>
      done
        .map((item) => `===== ${item.name} =====\n\n${item.text ?? ""}`)
        .join("\n\n"),
    [done],
  );

  const save = () => {
    const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recognised-text-${done.length}-pictures.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-border bg-panel p-3.5">
        <h3 className="text-[13.5px] font-bold">Read a folder of pictures</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          Up to {MAX_FILES} at once, one after another. They are read on this device and the
          settings from Tune are applied to all of them — so if one of them needed upscaling, set
          that up on a single picture first and the whole batch gets it.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={running}
            className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-45"
          >
            <ImportIcon size={15} />
            {running ? "Reading…" : "Choose pictures"}
          </button>

          {batch.length > 0 && !running && (
            <button
              type="button"
              onClick={clearBatch}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[13px] font-bold text-ink-soft hover:border-danger hover:text-danger"
            >
              <TrashIcon size={15} />
              Clear
            </button>
          )}
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const files = [...(event.target.files ?? [])].slice(0, MAX_FILES);
            if (files.length > 0) void runBatch(files);
            event.target.value = "";
          }}
          className="hidden"
        />
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Shape of the text
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SHAPES.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setShape(candidate.id)}
              aria-pressed={shape === candidate.id}
              disabled={running}
              className={cx(
                "rounded-full border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45",
                shape === candidate.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-panel text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-soft">{shapeInfo.hint}</p>
      </div>

      {running && progress && (
        <div role="status" aria-live="polite" className="rounded-[14px] border border-border bg-panel px-3.5 py-3">
          <p className="text-[12.5px] font-semibold">
            {done.length + failed.length} of {batch.length} — {progress.note}
          </p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-accent"
              style={{
                width: `${Math.round(((done.length + failed.length) / Math.max(1, batch.length)) * 100)}%`,
                transition: "var(--fx)",
              }}
            />
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-[14px] border border-danger/50 bg-panel px-3.5 py-3 text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {batch.length > 0 && (
        <>
          <ol className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-[14px] border border-border bg-border p-0">
            {batch.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-baseline gap-3 bg-panel px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px]" title={item.name}>
                  {item.name}
                </span>
                {item.status === "done" ? (
                  <span className="flex-none font-mono text-[11px] tabular-nums text-ink-soft">
                    {item.words} words ·{" "}
                    <span
                      className={cx(
                        "font-bold",
                        (item.confidence ?? 0) >= 80 ? "text-accent" : "text-danger",
                      )}
                    >
                      {Math.round(item.confidence ?? 0)}%
                    </span>
                  </span>
                ) : item.status === "failed" ? (
                  <span className="flex-none font-mono text-[11px] text-danger" title={item.error}>
                    failed
                  </span>
                ) : (
                  <span className="flex-none font-mono text-[11px] text-ink-soft">
                    {item.status === "reading" ? "reading…" : "waiting"}
                  </span>
                )}
              </li>
            ))}
          </ol>

          {failed.length > 0 && !running && (
            <p className="rounded-[14px] border border-danger/50 bg-panel px-3.5 py-3 text-[12px] leading-relaxed text-danger">
              {failed.length} could not be read — most often a format the browser cannot decode,
              such as an iPhone HEIC. The rest of the batch was unaffected.
            </p>
          )}

          {done.length > 0 && !running && (
            <>
              <button
                type="button"
                onClick={save}
                className="tint inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-[14px] font-bold text-on-accent"
              >
                <DownloadIcon size={16} />
                Save all {done.length} as one text file
              </button>

              <label htmlFor="ocr-batch-text" className="sr-only">
                All the recognised text
              </label>
              <textarea
                id="ocr-batch-text"
                readOnly
                value={combined}
                rows={12}
                spellCheck={false}
                className="w-full resize-y rounded-[14px] border-[1.5px] border-border bg-paper px-3.5 py-3 font-mono text-[12.5px] leading-[1.6] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </>
          )}
        </>
      )}

      {batch.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-border bg-panel p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <StackIcon size={26} />
          </span>
          <p className="text-[12.5px] text-ink-soft">
            Nothing read yet. Each picture&rsquo;s confidence is reported beside it, so a page the
            engine struggled with is visible without opening the text.
          </p>
        </div>
      )}
    </div>
  );
}
