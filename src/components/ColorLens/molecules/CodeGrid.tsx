"use client";

import { CodeRow } from "@/components/ColorLens/atoms/CodeRow";
import {
  cmykText,
  hslCss,
  hsvText,
  labText,
  lchText,
  rgbCss,
  xyzText,
} from "@/lib/ColorLens/convert";
import type { ColorDetail } from "@/lib/ColorLens/types";

interface CodeGridProps {
  detail: ColorDetail;
}

/**
 * Every notation for one colour, in the order they're reached for: the three
 * anyone pastes into CSS first, then print (CMYK), then the perceptual spaces a
 * designer uses for matching (LAB/LCH) and the CIE base they're built on.
 */
export function CodeGrid({ detail }: CodeGridProps) {
  const rows: Array<{ label: string; value: string; hint: string }> = [
    { label: "HEX", value: detail.hex, hint: "Web hexadecimal" },
    { label: "RGB", value: rgbCss(detail.rgb), hint: "Red, green, blue — CSS" },
    { label: "HSL", value: hslCss(detail.hsl), hint: "Hue, saturation, lightness — CSS" },
    { label: "HSB / HSV", value: hsvText(detail.hsv), hint: "Hue, saturation, brightness" },
    { label: "CMYK", value: cmykText(detail.cmyk), hint: "Cyan, magenta, yellow, key — print" },
    { label: "LAB", value: labText(detail.lab), hint: "CIE L*a*b*, perceptually uniform" },
    { label: "LCH", value: lchText(detail.lch), hint: "Lightness, chroma, hue" },
    { label: "XYZ", value: xyzText(detail.xyz), hint: "CIE 1931 tristimulus, D65" },
    {
      label: "Luminance",
      value: `${detail.luminance}`,
      hint: "WCAG relative luminance, 0 to 1",
    },
  ];

  return (
    <section
      aria-labelledby="colorlens-codes"
      className="rounded-2xl border border-border bg-panel p-4 shadow-panel sm:p-5"
    >
      <h3 id="colorlens-codes" className="text-[15px] font-bold tracking-[.1px]">
        Every code
      </h3>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        Tap any value to copy it.
      </p>
      <dl className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <CodeRow key={row.label} label={row.label} value={row.value} hint={row.hint} />
        ))}
      </dl>
    </section>
  );
}
