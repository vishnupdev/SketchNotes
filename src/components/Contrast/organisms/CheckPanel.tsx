"use client";

import { useMemo } from "react";
import { useContrastStore } from "@/store/useContrastStore";
import { hexContrast } from "@/lib/color";
import { formatRatio, gradeAll, headlineGrade, nearestPassing } from "@/lib/Contrast/wcag";
import { ColorField } from "@/components/Contrast/molecules/ColorField";
import { CheckIcon, CloseIcon, SwapIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Grade a foreground/background pair, and offer the fix.
 *
 * The preview is the important half. A ratio is an abstraction; seeing the actual
 * sentence at the actual size on the actual background is what makes a marginal
 * 4.6:1 obviously fine or obviously horrible. So the sample shows the three sizes
 * the thresholds are defined for — body, large, and a UI control — rather than one
 * generic swatch.
 */
export function CheckPanel() {
  const foreground = useContrastStore((s) => s.foreground);
  const background = useContrastStore((s) => s.background);
  const setForeground = useContrastStore((s) => s.setForeground);
  const setBackground = useContrastStore((s) => s.setBackground);
  const swap = useContrastStore((s) => s.swap);

  const ratio = hexContrast(foreground, background);
  const grades = useMemo(() => gradeAll(ratio), [ratio]);
  const headline = headlineGrade(ratio);

  // Only worth computing — and only worth showing — when body text fails.
  const suggestion = useMemo(
    () => (ratio < 4.5 ? nearestPassing(foreground, background, 4.5) : null),
    [background, foreground, ratio],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ColorField label="Foreground" value={foreground} onChange={setForeground} />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap foreground and background"
          title="Swap foreground and background"
          className="tint mb-0.5 grid size-10 flex-none place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent"
        >
          <SwapIcon size={16} />
        </button>
        <ColorField label="Background" value={background} onChange={setBackground} />
      </div>

      {/* The verdict. Colour alone never carries it — the word and the icon do,
          because a contrast tool that signals only in colour would be its own
          worst example (rule #7). */}
      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-3 rounded-[14px] border px-4 py-3",
          headline.tone === "pass"
            ? "border-accent/45 bg-accent-soft"
            : headline.tone === "mixed"
              ? "border-border bg-panel"
              : "border-danger/50 bg-panel",
        )}
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Contrast ratio
          </div>
          <div className="text-[30px] font-extrabold leading-none tabular-nums">
            {formatRatio(ratio)}
          </div>
        </div>
        <div
          className={cx(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-bold",
            headline.tone === "pass"
              ? "bg-accent text-on-accent"
              : headline.tone === "mixed"
                ? "border border-border text-text"
                : "bg-danger text-on-accent",
          )}
        >
          {headline.tone === "pass" ? <CheckIcon size={15} /> : <CloseIcon size={15} />}
          {headline.label}
        </div>
      </div>

      {/* Live sample, at the three sizes the WCAG thresholds are written for. */}
      <div
        className="rounded-[14px] border border-border p-4"
        style={{ background, color: foreground }}
      >
        <p className="text-[26px] font-bold leading-tight">Large heading, 26px bold</p>
        <p className="mt-2 text-[15px] leading-relaxed">
          Body copy at 15px. This is the size almost all reading happens at, and the size the 4.5:1
          threshold exists for. If this sentence is tiring to read, the number above is being
          generous.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
            style={{ borderColor: foreground }}
          >
            A bordered control
          </span>
          <span
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
            style={{ background: foreground, color: background }}
          >
            A filled control
          </span>
        </div>
      </div>

      {suggestion && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border bg-panel p-3">
          <span
            aria-hidden
            className="size-11 flex-none rounded-[10px] border border-border"
            style={{ background: suggestion.hex }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">
              The nearest {suggestion.direction} shade that passes AA
            </p>
            <p className="mt-0.5 font-mono text-[12px] uppercase text-ink-soft">
              {suggestion.hex} · {formatRatio(suggestion.ratio)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForeground(suggestion.hex)}
            className="tint flex-none rounded-full border border-border bg-paper px-3.5 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
          >
            Use it
          </button>
        </div>
      )}

      <section aria-labelledby="check-levels" className="rounded-[14px] border border-border bg-panel px-3 py-1">
        <h2 id="check-levels" className="sr-only">
          Every WCAG level
        </h2>
        {grades.map(({ requirement, passes }) => (
          <div
            key={requirement.id}
            className="flex items-start gap-3 border-b border-border py-2.5 last:border-b-0"
          >
            <span
              className={cx(
                "mt-0.5 grid size-6 flex-none place-items-center rounded-full",
                passes ? "bg-accent text-on-accent" : "bg-danger text-on-accent",
              )}
            >
              {passes ? <CheckIcon size={13} /> : <CloseIcon size={13} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">{requirement.label}</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[.08em] text-ink-soft">
                  needs {requirement.min}:1
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                {requirement.applies}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
