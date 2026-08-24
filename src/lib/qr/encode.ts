import type { QrEcc } from "./types";

/**
 * Drawing QR codes.
 *
 * The `qrcode` package does the encoding (Reed–Solomon, masking, versioning —
 * a spec best not re-implemented by hand), and is loaded dynamically so it
 * lands in this app's chunk rather than the initial payload (rule #7). Both apps
 * that draw codes go through here, so there is one place that knows the colours
 * and the quiet-zone rules.
 *
 * Colours come from the theme (`--qr-dark` / `--qr-light`) but are deliberately
 * *not* the theme's paper and ink: an inverted, low-contrast or tinted code is
 * one many phone cameras will not read at all, so those two tokens are fixed
 * black-on-white in every theme. Rule #6 is satisfied without pretending a
 * scanner cares about our palette.
 */

export interface QrRenderOptions {
  /** Pixel width/height of the finished square image. */
  size?: number;
  ecc?: QrEcc;
  /** Quiet-zone width in modules. 4 is the spec minimum; below it, scanners
   *  struggle when the code sits against other content. */
  margin?: number;
}

const DEFAULTS: Required<QrRenderOptions> = { size: 320, ecc: "M", margin: 4 };

/** Read a colour token, falling back to plain black/white before hydration. */
function themeColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const colors = () => ({
  dark: themeColor("--qr-dark", "#000000"),
  light: themeColor("--qr-light", "#ffffff"),
});

type QrCodeModule = typeof import("qrcode");
let cached: Promise<QrCodeModule> | null = null;

/** One shared import, so a live preview doesn't re-resolve the module. */
function qrcode(): Promise<QrCodeModule> {
  if (!cached) cached = import("qrcode").then((m) => m.default ?? m);
  return cached;
}

/** Draw `text` into an existing canvas at `size` pixels square. */
export async function drawQr(
  canvas: HTMLCanvasElement,
  text: string,
  options: QrRenderOptions = {},
): Promise<void> {
  const { size, ecc, margin } = { ...DEFAULTS, ...options };
  const QR = await qrcode();
  await QR.toCanvas(canvas, text, {
    width: size,
    margin,
    errorCorrectionLevel: ecc,
    color: colors(),
  });
  /*
   * The library sets the canvas's *inline* width and height as well as its pixel
   * buffer, which silently beats whatever layout classes the caller put on the
   * element — a 512px code then overflows the frame it was meant to fit. The
   * buffer (the `width`/`height` attributes) is what we want to keep at `size`
   * for sharpness; the inline style is not, so it goes.
   */
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
}

/** A PNG of the code, for downloading or sharing. */
export async function qrPngBlob(text: string, options: QrRenderOptions = {}): Promise<Blob> {
  const { size, ecc, margin } = { ...DEFAULTS, ...options };
  const QR = await qrcode();
  const dataUrl = await QR.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel: ecc,
    color: colors(),
    type: "image/png",
  });
  return (await fetch(dataUrl)).blob();
}

/** An SVG of the code — resolution-independent, for print. */
export async function qrSvg(text: string, options: QrRenderOptions = {}): Promise<string> {
  const { ecc, margin } = { ...DEFAULTS, ...options };
  const QR = await qrcode();
  return QR.toString(text, {
    type: "svg",
    margin,
    errorCorrectionLevel: ecc,
    color: colors(),
  });
}

/**
 * How many bytes a code can hold at a given error-correction level, at the
 * largest version (40). Used to warn *before* encoding fails, which is friendlier
 * than an exception with a spec reference in it.
 */
export const QR_BYTE_CAPACITY: Record<QrEcc, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
};

/** Payload length in bytes — what the capacity limit is actually measured in. */
export const payloadBytes = (text: string): number =>
  typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length;
