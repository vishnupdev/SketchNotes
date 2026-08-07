"use client";

/**
 * Bitmap plumbing for bring-your-own pointers (Settings → Pointer → Custom).
 *
 * A cursor image has to be a real bitmap at its final pixel size — CSS can't
 * scale one — so everything here funnels through a canvas and comes out as a
 * square PNG data URL. An uploaded file or a picked emoji is stored once at
 * {@link CUSTOM_MASTER_PX}, then resized on demand when the size setting
 * changes. Nothing leaves the device.
 */

import { CUSTOM_MASTER_PX } from "@/lib/cursors";

/** Largest file we'll try to read. Beyond this it's a mistake, not a pointer. */
export const MAX_CURSOR_FILE_BYTES = 8 * 1024 * 1024;

/** Thrown with a message that is safe (and useful) to show in the UI. */
export class CursorImageError extends Error {}

function canvasOf(px: number) {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CursorImageError("This browser can't process the image.");
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new CursorImageError("That image couldn't be read."));
    img.src = src;
  });
}

/**
 * Draw `img` into a square of `px`, scaled to fit whole and centred, keeping
 * its aspect ratio and its transparency.
 */
function fitToSquare(img: HTMLImageElement, px: number): string {
  const { canvas, ctx } = canvasOf(px);
  const k = Math.min(px / img.width, px / img.height);
  const w = Math.max(1, Math.round(img.width * k));
  const h = Math.max(1, Math.round(img.height * k));
  ctx.drawImage(img, Math.round((px - w) / 2), Math.round((px - h) / 2), w, h);
  return canvas.toDataURL("image/png");
}

/** Turn a chosen file into a pointer master bitmap. */
export async function cursorFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new CursorImageError("Pick an image file (PNG, JPG, SVG, GIF or WebP).");
  }
  if (file.size > MAX_CURSOR_FILE_BYTES) {
    throw new CursorImageError("That image is too large — pick one under 8 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return fitToSquare(img, CUSTOM_MASTER_PX);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Render an emoji to a pointer master bitmap. Drawing it through a canvas
 * (rather than putting the character in the SVG) means the glyph is baked in,
 * so it can't fall back to tofu once it's a cursor image.
 */
export function cursorFromEmoji(emoji: string): string {
  const px = CUSTOM_MASTER_PX;
  const { canvas, ctx } = canvasOf(px);
  ctx.font = `${Math.round(px * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, px / 2, px / 2 + px * 0.04);
  return canvas.toDataURL("image/png");
}

/**
 * Resized copies of a master, keyed by size. Rebuilding the same bitmap on
 * every theme change or re-render would be pure waste; the cache is trimmed so
 * a run of size changes can't pile up data URLs.
 */
const resized = new Map<string, string>();
const CACHE_LIMIT = 12;

/** Scale a stored master down (or up) to exactly `px` square. */
export async function resizeCursor(src: string, px: number): Promise<string> {
  const key = `${px}|${src}`;
  const hit = resized.get(key);
  if (hit) return hit;
  const out = fitToSquare(await loadImage(src), px);
  if (resized.size >= CACHE_LIMIT) resized.delete(resized.keys().next().value!);
  resized.set(key, out);
  return out;
}
