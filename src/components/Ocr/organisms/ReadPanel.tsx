"use client";

import { useMemo, useState } from "react";
import { useOcrStore, LAYOUTS } from "@/store/useOcrStore";
import { OpenPicture } from "@/components/Ocr/molecules/OpenPicture";
import { WordOverlay } from "@/components/Ocr/molecules/WordOverlay";
import { LOW_CONFIDENCE, flagged, stats, verdict } from "@/lib/Ocr/blocks";
import { SHAPES, exportName, render } from "@/lib/Ocr/export";
import { cx } from "@/lib/utils";
import { CopyIcon, DownloadIcon, ScanTextIcon, TrashIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The main screen: the picture, the text it gave, and how sure it is.
 *
 * The confidence is not decoration and it is not tucked into a corner. OCR does
 * not fail loudly — it returns `5` where the page said `S`, in the same
 * matter-of-fact tone as everything it got right. So the read is presented with
 * a verdict that says what to *do*, the uncertain words are marked in the text
 * itself, and they can be lit up on the picture. Text without that is text you
 * have to re-read against the original anyway.
 */
export function ReadPanel() {
  const picture = useOcrStore((s) => s.picture);
  const result = useOcrStore((s) => s.result);
  const busy = useOcrStore((s) => s.busy);
  const progress = useOcrStore((s) => s.progress);
  const error = useOcrStore((s) => s.error);
  const read = useOcrStore((s) => s.read);
  const close = useOcrStore((s) => s.close);
  const layout = useOcrStore((s) => s.layout);
  const setLayout = useOcrStore((s) => s.setLayout);
  const shape = useOcrStore((s) => s.shape);
  const setShape = useOcrStore((s) => s.setShape);
  const overlay = useOcrStore((s) => s.overlay);
  const setOverlay = useOcrStore((s) => s.setOverlay);

  const [copied, setCopied] = useState(false);

  const figures = useMemo(() => (result ? stats(result) : null), [result]);
  const text = useMemo(() => (result ? render(result, shape) : ""), [result, shape]);
  const lowWords = useMemo(() => (result ? flagged(result) : []), [result]);
  const shapeInfo = SHAPES.find((candidate) => candidate.id === shape) ?? SHAPES[0];

  if (!picture) return <OpenPicture />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* a denied clipboard is not worth an error state; the text is on screen */
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: `${shapeInfo.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportName(picture.name, shape);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-soft" title={picture.name}>
          {picture.name} · {picture.width}×{picture.height}
        </p>
        <button
          type="button"
          onClick={close}
          className="inline-flex flex-none items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft hover:border-danger hover:text-danger"
        >
          <TrashIcon size={13} />
          Close
        </button>
      </div>

      <figure className="m-0 overflow-hidden rounded-[14px] border border-border bg-panel">
        <WordOverlay
          src={picture.url}
          alt={`The picture being read: ${picture.name}`}
          result={overlay ? result : null}
        />
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3.5 py-2.5">
          <span className="text-[11.5px] text-ink-soft">
            {result
              ? `${figures?.words ?? 0} words found`
              : "Not read yet"}
          </span>
          {result && (
            <button
              type="button"
              onClick={() => setOverlay(!overlay)}
              aria-pressed={overlay}
              className={cx(
                "rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[.1em]",
                overlay
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              Show words
            </button>
          )}
        </figcaption>
      </figure>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          How the page is laid out
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {LAYOUTS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setLayout(candidate.id)}
              aria-pressed={layout === candidate.id}
              title={candidate.hint}
              className={cx(
                "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                layout === candidate.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-panel text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-soft">
          {LAYOUTS.find((candidate) => candidate.id === layout)?.hint}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void read()}
        disabled={busy}
        className="tint inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-[14px] font-bold text-on-accent disabled:opacity-45"
      >
        <ScanTextIcon size={16} />
        {busy ? "Reading…" : result ? "Read it again" : "Read the text"}
      </button>

      {progress && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[14px] border border-border bg-panel px-3.5 py-3"
        >
          <p className="text-[12.5px] font-semibold">{progress.note}</p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.round((progress.ratio ?? 0) * 100)}%`, transition: "var(--fx)" }}
            />
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-[14px] border border-danger/50 bg-panel px-3.5 py-3 text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {result && figures && (
        <>
          <div
            className={cx(
              "rounded-[14px] border px-4 py-3.5",
              figures.confidence >= 80
                ? "border-accent/40 bg-accent-soft"
                : "border-danger/50 bg-panel",
            )}
          >
            <p
              className={cx(
                "font-mono text-[10px] uppercase tracking-[.14em]",
                figures.confidence >= 80 ? "text-accent" : "text-danger",
              )}
            >
              Confidence
            </p>
            <p
              className={cx(
                "mt-0.5 text-[30px] font-extrabold leading-none tabular-nums",
                figures.confidence >= 80 ? "text-accent" : "text-danger",
              )}
            >
              {Math.round(figures.confidence)}%
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              {verdict(figures.confidence, figures.low, figures.words)}
            </p>
            <dl className="m-0 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Words" value={figures.words} />
              <Figure label="Lines" value={figures.lines} />
              <Figure label="Characters" value={figures.characters} />
              <Figure label={`Under ${LOW_CONFIDENCE}%`} value={figures.low} />
            </dl>
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
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
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

          <label htmlFor="ocr-text" className="sr-only">
            The recognised text
          </label>
          <textarea
            id="ocr-text"
            readOnly
            value={text}
            rows={12}
            spellCheck={false}
            className="w-full resize-y rounded-[14px] border-[1.5px] border-border bg-paper px-3.5 py-3 font-mono text-[13px] leading-[1.6] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent"
            >
              <CopyIcon size={15} />
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-bold hover:border-accent hover:text-accent"
            >
              <DownloadIcon size={15} />
              Save as {shapeInfo.extension.toUpperCase()}
            </button>
          </div>

          {lowWords.length > 0 && (
            <p className="rounded-[14px] border border-border bg-panel px-3.5 py-3 text-[12px] leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">Check these {lowWords.length}:</strong>{" "}
              {lowWords.slice(0, 24).map((word, index) => (
                <span key={`${word.line}-${index}`}>
                  <span className="font-mono text-[11.5px] text-danger">{word.text}</span>
                  <span className="text-[10.5px]"> ({Math.round(word.confidence)}%)</span>
                  {index < Math.min(lowWords.length, 24) - 1 && ", "}
                </span>
              ))}
              {lowWords.length > 24 && ` …and ${lowWords.length - 24} more`}. The engine scored these
              below {LOW_CONFIDENCE}% — they are the ones it guessed at. “For checking” above marks
              them in place, which is the quicker way to proofread against the picture.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">{label}</dt>
      <dd className="m-0 text-[19px] font-bold leading-tight tabular-nums">{value}</dd>
    </div>
  );
}
