import type { ExportFormat, SketchElement } from "../types";
import { contentBBox } from "../geometry";
import { shapeAbs } from "../shapes";
import { buildSVG } from "./svg";
import { buildPDF } from "./pdf";
import { buildDOC } from "./doc";
import { canvasBlob, rasterCanvas } from "./raster";

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Sanitised, extensioned filename derived from the note title. */
export function exportName(title: string, ext: string): string {
  return (
    (title.trim().replace(/[^\w\- ]+/g, "").slice(0, 40) || "sketchnote") + "." + ext
  );
}

/** Trigger a browser download for a blob. */
export function saveBlob(bl: Blob, name: string): void {
  const u = URL.createObjectURL(bl);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export interface ExportResult {
  blob: Blob;
  name: string;
}

/**
 * Produce a downloadable blob of the drawing in the requested format.
 * Returns null when the canvas is empty. Rendering-only — the caller decides
 * whether to actually save and how to surface toasts.
 */
export async function exportDrawing(
  fmt: ExportFormat,
  els: SketchElement[],
  title: string,
  dark: boolean,
): Promise<ExportResult | null> {
  if (!els.length) return null;
  const b = contentBBox(els, shapeAbs);
  if (!b) return null;
  const pad = 48;
  const wW = b.X - b.x + pad * 2;
  const wH = b.Y - b.y + pad * 2;

  if (fmt === "svg") {
    const blob = new Blob([buildSVG(els, b, pad, wW, wH, dark)], {
      type: "image/svg+xml;charset=utf-8",
    });
    return { blob, name: exportName(title, "svg") };
  }

  if (fmt === "json") {
    const data = JSON.stringify({ app: "sketchnotes", version: 1, title, els });
    return { blob: new Blob([data], { type: "application/json" }), name: exportName(title, "json") };
  }

  if (fmt === "pdf") {
    const oc = rasterCanvas(els, b, pad, wW, wH, dark);
    const jpeg = new Uint8Array(await (await canvasBlob(oc, "image/jpeg", 0.92)).arrayBuffer());
    const pdf = buildPDF(jpeg, oc.width, oc.height, r2(wW * 0.75), r2(wH * 0.75));
    return { blob: new Blob([pdf as BlobPart], { type: "application/pdf" }), name: exportName(title, "pdf") };
  }

  if (fmt === "doc") {
    const oc = rasterCanvas(els, b, pad, wW, wH, dark);
    const b64 = oc.toDataURL("image/png").split(",")[1];
    const doc = buildDOC(b64, wW, wH, title, new Date().toLocaleDateString());
    return { blob: new Blob([doc], { type: "application/msword" }), name: exportName(title, "doc") };
  }

  // Raster formats: png / jpg / webp
  const mime = fmt === "jpg" ? "image/jpeg" : fmt === "webp" ? "image/webp" : "image/png";
  const blob = await canvasBlob(rasterCanvas(els, b, pad, wW, wH, dark), mime, 0.92);
  return { blob, name: exportName(title, fmt) };
}
