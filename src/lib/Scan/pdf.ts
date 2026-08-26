"use client";

import { PDFDocument } from "pdf-lib";

/**
 * Assembling scanned pages into a PDF.
 *
 * `pdf-lib` is already a dependency of the PDF editor, and it runs entirely in the
 * browser — so a scan becomes a PDF without the bytes leaving the device, which is
 * the whole proposition. This module is Scan's own (rule #4/#5): it does not reach
 * into `lib/PdfEditor/`, it just uses the same library.
 */

/** Page presets. `fit` sizes each page to its own image, which is often best. */
export type PageSize = "fit" | "a4" | "letter" | "legal";

export const PAGE_SIZES: { id: PageSize; label: string; hint: string }[] = [
  { id: "fit", label: "Fit the scan", hint: "Each page exactly matches its image — no margins" },
  { id: "a4", label: "A4", hint: "210 × 297 mm, centred with a small margin" },
  { id: "letter", label: "Letter", hint: "8.5 × 11 in, centred with a small margin" },
  { id: "legal", label: "Legal", hint: "8.5 × 14 in, centred with a small margin" },
];

/** Points, at 72 per inch — PDF's native unit. */
const DIMENSIONS: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
};

/** Margin on a fixed page size, in points (about 10 mm). */
const MARGIN = 28;

export interface ScanPageInput {
  /** A `data:image/jpeg;base64,…` URL, as produced by `canvasToJpeg`. */
  dataUrl: string;
}

/**
 * Build a PDF from scanned pages.
 *
 * On a fixed page size each image is scaled to fit inside the margins **preserving
 * its aspect ratio**, and centred. Stretching a scan to fill A4 is the one thing
 * that would make the output obviously wrong, so the scale is the smaller of the
 * two ratios rather than each axis independently.
 *
 * Portrait and landscape scans are both handled by swapping the page's own
 * orientation to match the image, so a landscape receipt does not end up as a
 * letterboxed strip in the middle of a portrait page.
 */
export async function buildScanPdf(
  pages: ScanPageInput[],
  size: PageSize,
  title = "Scan",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  doc.setTitle(title);
  doc.setCreator("OneApp Scan");
  doc.setProducer("OneApp Scan");

  for (const page of pages) {
    // `embedJpg` takes the raw bytes, so the base64 payload is decoded here.
    const bytes = dataUrlBytes(page.dataUrl);
    if (!bytes) continue;

    const image = await doc.embedJpg(bytes);

    if (size === "fit") {
      const sheet = doc.addPage([image.width, image.height]);
      sheet.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      continue;
    }

    const [shortSide, longSide] = DIMENSIONS[size];
    // Match the sheet's orientation to the image's, rather than letterboxing.
    const landscape = image.width > image.height;
    const pageWidth = landscape ? longSide : shortSide;
    const pageHeight = landscape ? shortSide : longSide;

    const sheet = doc.addPage([pageWidth, pageHeight]);

    const boxWidth = pageWidth - MARGIN * 2;
    const boxHeight = pageHeight - MARGIN * 2;
    const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    sheet.drawImage(image, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  // A PDF with no pages is invalid; a blank page is a better failure than a file
  // that will not open.
  if (doc.getPageCount() === 0) doc.addPage(DIMENSIONS.a4);

  return doc.save();
}

/** Decode the base64 payload of a data URL into bytes. */
function dataUrlBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  try {
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Save bytes to the device as a PDF. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  // A fresh ArrayBuffer copy, because `bytes` may be a view onto a larger buffer
  // and Blob would otherwise take the whole thing.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);

  const url = URL.createObjectURL(new Blob([copy], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** A filename from a title and today's date. */
export function scanFilename(title: string): string {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "scan";
  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `${slug}-${stamp}.pdf`;
}
