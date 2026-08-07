/**
 * Turning an extracted palette into something usable elsewhere — a stylesheet,
 * a design-token file, or plain hex codes to paste into any tool.
 */

import { describeHex } from "./detail";
import type { PaletteEntry } from "./types";

export type ExportFormat = "hex" | "css" | "tailwind" | "scss" | "json";

export const EXPORT_FORMATS: Array<{ id: ExportFormat; label: string; ext: string; mime: string }> = [
  { id: "hex", label: "Hex list", ext: "txt", mime: "text/plain" },
  { id: "css", label: "CSS variables", ext: "css", mime: "text/css" },
  { id: "tailwind", label: "Tailwind v4 theme", ext: "css", mime: "text/css" },
  { id: "scss", label: "SCSS variables", ext: "scss", mime: "text/plain" },
  { id: "json", label: "JSON", ext: "json", mime: "application/json" },
];

/** `--color-1`-style slugs; stable and collision-free regardless of names. */
const slug = (index: number) => `color-${index + 1}`;

/** Render a palette in the requested format. */
export function formatPalette(palette: PaletteEntry[], format: ExportFormat): string {
  if (palette.length === 0) return "";

  switch (format) {
    case "hex":
      return palette.map((entry) => entry.hex).join("\n");

    case "css":
      return [
        ":root {",
        ...palette.map((entry, i) => `  --${slug(i)}: ${entry.hex};`),
        "}",
      ].join("\n");

    case "tailwind":
      return [
        "@theme {",
        ...palette.map((entry, i) => `  --color-palette-${i + 1}: ${entry.hex};`),
        "}",
      ].join("\n");

    case "scss":
      return palette.map((entry, i) => `$${slug(i)}: ${entry.hex};`).join("\n");

    case "json":
      return JSON.stringify(
        palette.map((entry, i) => {
          const detail = describeHex(entry.hex);
          return {
            name: slug(i),
            hex: entry.hex,
            rgb: detail.rgb,
            hsl: detail.hsl,
            closestName: detail.name.name,
            share: Math.round(entry.share * 1000) / 10,
          };
        }),
        null,
        2,
      );
  }
}

/**
 * Save text to the user's device. Local-only, like every other export in the
 * workspace — nothing is uploaded to produce it.
 */
export function downloadText(text: string, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked well after the click: revoking too eagerly cancels the download in
  // some browsers, and the blob is a few kilobytes at most.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Copy to the clipboard, reporting whether it worked so the UI can show a
 * "copied" state only when it truly was. Fails silently on browsers that block
 * clipboard writes outside a user gesture.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
