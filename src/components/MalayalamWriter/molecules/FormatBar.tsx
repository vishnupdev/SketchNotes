"use client";

import type { DocFormat, FontFamily } from "@/store/useMalayalamStore";
import { cx } from "@/lib/utils";

interface FormatBarProps {
  format: DocFormat;
  onChange: (patch: Partial<DocFormat>) => void;
  /** The theme's current text/paper colours, shown in the pickers when unset. */
  defaultColor: string;
  defaultBackground: string;
}

const FONTS: { id: FontFamily; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
  { id: "hand", label: "Handwriting" },
];

const SIZES = [14, 16, 18, 20, 24, 28, 32, 40, 48];

const fieldBase =
  "rounded-lg border border-border bg-paper px-2 py-1.5 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent";
const toggleBase =
  "grid size-9 place-items-center rounded-lg border text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** Uniform formatting controls for the document: family, size, weight, style,
 *  text colour and background. Colours default to the theme until overridden. */
export function FormatBar({ format, onChange, defaultColor, defaultBackground }: FormatBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel px-2.5 py-2">
      <label className="sr-only" htmlFor="ml-font">Font</label>
      <select
        id="ml-font"
        value={format.fontFamily}
        onChange={(e) => onChange({ fontFamily: e.target.value as FontFamily })}
        className={fieldBase}
        aria-label="Font family"
      >
        {FONTS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="ml-size">Font size</label>
      <select
        id="ml-size"
        value={format.fontSize}
        onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        className={fieldBase}
        aria-label="Font size"
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange({ bold: !format.bold })}
        aria-pressed={format.bold}
        aria-label="Bold"
        className={cx(
          toggleBase,
          "font-bold",
          format.bold ? "border-accent bg-accent-soft text-accent" : "border-border bg-paper text-ink-soft hover:text-text",
        )}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => onChange({ italic: !format.italic })}
        aria-pressed={format.italic}
        aria-label="Italic"
        className={cx(
          toggleBase,
          "italic font-serif",
          format.italic ? "border-accent bg-accent-soft text-accent" : "border-border bg-paper text-ink-soft hover:text-text",
        )}
      >
        I
      </button>

      {/* Text colour */}
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-paper px-1.5 py-1">
        <label htmlFor="ml-color" className="text-[12px] font-semibold text-ink-soft">A</label>
        <input
          id="ml-color"
          type="color"
          value={format.color ?? defaultColor}
          onChange={(e) => onChange({ color: e.target.value })}
          aria-label="Text colour"
          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        {format.color && (
          <button
            type="button"
            onClick={() => onChange({ color: null })}
            aria-label="Reset text colour to theme"
            className="text-[11px] text-ink-soft hover:text-text"
          >
            ↺
          </button>
        )}
      </div>

      {/* Background colour */}
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-paper px-1.5 py-1">
        <label htmlFor="ml-bg" className="text-[12px] font-semibold text-ink-soft">BG</label>
        <input
          id="ml-bg"
          type="color"
          value={format.background ?? defaultBackground}
          onChange={(e) => onChange({ background: e.target.value })}
          aria-label="Background colour"
          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        {format.background && (
          <button
            type="button"
            onClick={() => onChange({ background: null })}
            aria-label="Reset background colour to theme"
            className="text-[11px] text-ink-soft hover:text-text"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
