"use client";

import { useMemo, useState } from "react";
import { useContrastStore } from "@/store/useContrastStore";
import { RAMP_FORMATS, buildRamp, formatRamp } from "@/lib/Contrast/ramp";
import { formatRatio } from "@/lib/Contrast/wcag";
import { copyText, downloadText } from "@/lib/export-text";
import { ColorField } from "@/components/Contrast/molecules/ColorField";
import { CheckIcon, CopyIcon, DownloadIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** File extension and MIME per export format. */
const FILE: Record<string, { ext: string; mime: string }> = {
  css: { ext: "css", mime: "text/css" },
  tailwind: { ext: "css", mime: "text/css" },
  scss: { ext: "scss", mime: "text/plain" },
  json: { ext: "json", mime: "application/json" },
};

/**
 * Build a full tonal scale from one colour, graded as it goes.
 *
 * The contrast figures beside each step are the reason this is not just a
 * gradient. Choosing "500 for the button, 700 for the text" is a decision about
 * contrast, and normally means generating a ramp in one tool and then checking
 * each step in another. Here the answer is on the same row: what colour text that
 * step can carry, and at what ratio.
 */
export function RampPanel() {
  const base = useContrastStore((s) => s.rampBase);
  const setBase = useContrastStore((s) => s.setRampBase);
  const name = useContrastStore((s) => s.rampName);
  const setName = useContrastStore((s) => s.setRampName);
  const format = useContrastStore((s) => s.rampFormat);
  const setFormat = useContrastStore((s) => s.setRampFormat);

  const [copied, setCopied] = useState(false);

  const ramp = useMemo(() => buildRamp(base), [base]);
  const code = useMemo(() => formatRamp(name, ramp, format), [format, name, ramp]);

  const copy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  const save = () => {
    const { ext, mime } = FILE[format] ?? FILE.css;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "ramp";
    downloadText(code, `${slug}-ramp.${ext}`, mime);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ColorField label="Base colour (step 500)" value={base} onChange={setBase} />
        <div className="min-w-[140px] flex-1">
          <label
            htmlFor="ramp-name"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Token name
          </label>
          <input
            id="ramp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="brand"
            spellCheck={false}
            className="mt-0.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </div>

      <section aria-labelledby="ramp-scale" className="overflow-hidden rounded-[14px] border border-border">
        <h2 id="ramp-scale" className="sr-only">
          The generated scale
        </h2>
        {ramp.map((step) => (
          <div
            key={step.step}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5"
            style={{ background: step.hex, color: step.text.hex }}
          >
            <span className="w-9 flex-none font-mono text-[12px] font-bold tabular-nums">
              {step.step}
            </span>
            <span className="flex-none font-mono text-[12px] uppercase">{step.hex}</span>
            {step.base && (
              <span className="flex-none rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.1em]"
                style={{ borderColor: step.text.hex }}
              >
                base
              </span>
            )}
            <span className="ml-auto flex-none font-mono text-[10.5px] tabular-nums opacity-80">
              text {formatRatio(step.text.ratio)} · white {step.onWhite.toFixed(1)} · black{" "}
              {step.onBlack.toFixed(1)}
            </span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        {RAMP_FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFormat(f.id)}
            title={f.hint}
            aria-current={f.id === format}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              f.id === format
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => void copy()}
            className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={save}
            className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            <DownloadIcon size={14} />
            Save
          </button>
        </span>
      </div>

      <pre className="overflow-x-auto rounded-[12px] border border-border bg-panel p-3 font-mono text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        {RAMP_FORMATS.find((f) => f.id === format)?.hint}. Steps are mixed towards white and black in
        linear light, so the scale looks evenly spaced rather than bunching at the pale end.
      </p>
    </div>
  );
}
