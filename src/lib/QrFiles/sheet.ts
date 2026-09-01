/**
 * Getting the codes off the screen: onto paper, or into a folder of images.
 *
 * The on-screen loop (`FramePlayer`) is the fast way to move a file between two
 * devices in the same room. This is the other half of the point — a file turned
 * into something physical, that keeps working when the screen it came from is
 * gone: a sheet in a drawer, a page glued into a notebook, an image folder that
 * outlives the format it was in.
 *
 * Both outputs carry the same header on every page: the file's name, its size,
 * and how many codes make it whole. Without that, a sheet found later is a grid
 * of squares nobody can tell is complete.
 */

import { qrPngBlob, qrSvg } from "@/lib/qr/encode";
import type { QrEcc } from "@/lib/qr/types";
import { saveBlob } from "@/lib/download";
import { esc, formatBytes } from "@/lib/utils";
import { CODES_PER_SHEET, safeFileName } from "./files";

/** What both outputs need to know about the file the codes came from. */
export interface SheetInfo {
  name: string;
  bytes: number;
  ecc: QrEcc;
}

/**
 * Beyond this the browser is being asked to lay out thousands of vector codes at
 * once, which is where printing stops being slow and starts being a hung tab.
 * The ZIP has no equivalent limit — it writes one image at a time.
 */
export const MAX_PRINTABLE_CODES = 600;

/** Pad the part number so the images sort in order in every file manager. */
const partName = (index: number, total: number): string =>
  String(index + 1).padStart(String(total).length, "0");

/* --------------------------------- print --------------------------------- */

/**
 * The printed page.
 *
 * Written as its own tiny stylesheet rather than reusing the app's, because it
 * is not the app: it is black on white at a fixed grid, and the theme has no
 * business reaching it. `page-break-inside: avoid` on each cell is what stops a
 * code being sliced in half across two pages — which would make it, and the file
 * it belongs to, unrecoverable.
 */
function sheetHtml(info: SheetInfo, codes: string[]): string {
  const cells = codes
    .map(
      (svg, i) => `<figure class="cell">${svg}<figcaption>${partName(i, codes.length)} / ${
        codes.length
      }</figcaption></figure>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(
    info.name,
  )} as QR codes</title><style>
    *{box-sizing:border-box}
    body{margin:0;padding:14mm 10mm;font:12px/1.4 system-ui,sans-serif;color:#000;background:#fff}
    header{margin-bottom:8mm;border-bottom:1px solid #000;padding-bottom:3mm}
    h1{margin:0 0 2mm;font-size:15px}
    p{margin:0;font-size:11px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
    .cell{margin:0;text-align:center;page-break-inside:avoid;break-inside:avoid}
    .cell svg{width:100%;height:auto;display:block}
    figcaption{margin-top:1mm;font-family:ui-monospace,monospace;font-size:10px}
    @page{margin:10mm}
  </style></head><body>
    <header>
      <h1>${esc(info.name)}</h1>
      <p>${formatBytes(info.bytes)} &middot; ${codes.length} code${
        codes.length === 1 ? "" : "s"
      } &middot; error correction ${info.ecc} &middot; scan every code with OneApp &rarr; QR Files &rarr; Rebuild</p>
    </header>
    <div class="grid">${cells}</div>
  </body></html>`;
}

/**
 * Send the codes to the printer.
 *
 * Through a hidden iframe rather than a popup: a new window is what pop-up
 * blockers stop, and this way the print dialog belongs to the page the user
 * pressed the button on.
 */
export async function printSheet(info: SheetInfo, frames: string[]): Promise<void> {
  if (frames.length > MAX_PRINTABLE_CODES) {
    throw new Error(
      `${frames.length} codes is more than a browser will lay out for printing in one go. Save the images instead, or pick a denser code size.`,
    );
  }
  const codes = await Promise.all(
    frames.map((frame) => qrSvg(frame, { ecc: info.ecc, margin: 2 })),
  );

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Print sheet");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
  document.body.appendChild(frame);

  await new Promise<void>((resolve) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.srcdoc = sheetHtml(info, codes);
  });

  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  // The dialog is modal but not awaitable, and removing the iframe under it
  // cancels the job in some browsers — so it goes once the dialog has had time
  // to take its snapshot.
  window.setTimeout(() => frame.remove(), 60_000);
}

/* ---------------------------------- zip ---------------------------------- */

/** The note that goes in the folder, so the images are still usable in a year. */
function readme(info: SheetInfo, total: number): string {
  return [
    `${info.name}`,
    `${formatBytes(info.bytes)}, split across ${total} QR code${total === 1 ? "" : "s"}.`,
    "",
    "To put the file back together:",
    "  1. Open OneApp and go to QR Files > Rebuild.",
    "  2. Scan every code with the camera, or add these images one at a time.",
    "  3. Order does not matter, and re-reading a code you already have is harmless.",
    "",
    "Every code is needed. The file is checksummed, so a missing or misread code",
    "is reported rather than producing a file that looks fine and is not.",
    "",
    `Error correction: ${info.ecc}.`,
  ].join("\n");
}

/** Every code as a PNG, zipped, with a note explaining how to rebuild them. */
export async function saveSheetZip(
  info: SheetInfo,
  frames: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  // Imported here rather than at the top of the file: the zip writer is ~100 KB
  // and only the "save the images" button ever needs it, so loading it eagerly
  // would put it in the chunk of everyone who merely opens the app (rule #7).
  // Every other caller in the workspace loads it the same way.
  const { default: JSZip } = await import("jszip");

  const zip = new JSZip();
  const base = safeFileName(info.name).replace(/\.[^.]+$/, "") || "file";
  const folder = zip.folder(`${base}-qr`) ?? zip;

  for (let i = 0; i < frames.length; i++) {
    // One at a time on purpose: rendering hundreds of canvases in parallel is
    // what makes a phone drop the tab.
    const png = await qrPngBlob(frames[i], { ecc: info.ecc, size: 640, margin: 2 });
    folder.file(`part-${partName(i, frames.length)}.png`, png);
    onProgress?.(i + 1, frames.length);
  }
  folder.file("README.txt", readme(info, frames.length));

  const blob = await zip.generateAsync({ type: "blob" });
  const zipName = `${base}-qr.zip`;
  saveBlob(blob, zipName);
  return zipName;
}

/** Pages a print job would come to, for the line above the button. */
export const sheetCount = (frames: number): number => Math.ceil(frames / CODES_PER_SHEET);
