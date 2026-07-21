/** Local image helpers: loading, rendering (crop+resize), and size-targeted
 *  compression. Everything is browser-only (Image, canvas, Blob). */

export interface LoadedImage {
  el: HTMLImageElement;
  url: string;
  w: number;
  h: number;
  name: string;
  type: string;
  size: number;
}

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIMES: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
export const EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };
export const isLossy = (fmt: string) => fmt === "jpeg" || fmt === "webp";

export function fmtSize(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

export function baseName(n: string): string {
  return n.replace(/\.[a-z0-9]+$/i, "") || "image";
}

export function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () =>
      resolve({
        el,
        url,
        w: el.naturalWidth,
        h: el.naturalHeight,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    el.src = url;
  });
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Draw the cropped source region into an ow×oh canvas and encode to a blob. */
export function renderBlob(
  img: HTMLImageElement,
  crop: Crop,
  ow: number,
  oh: number,
  mime: string,
  quality: number,
): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(ow));
  c.height = Math.max(1, Math.round(oh));
  const ctx = c.getContext("2d")!;
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff"; // flatten transparency for JPEG
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height);
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("Encoding failed"))), mime, quality),
  );
}

/**
 * Encode aiming for a maximum file size. For lossy formats it binary-searches
 * quality, then progressively downscales if even the lowest quality overshoots.
 * Returns the blob plus the dimensions/quality actually used.
 */
export async function encodeToTarget(
  img: HTMLImageElement,
  crop: Crop,
  ow: number,
  oh: number,
  mime: string,
  targetBytes: number,
): Promise<{ blob: Blob; w: number; h: number; quality: number }> {
  if (!isLossy(mime)) {
    // PNG is lossless — meet the target by downscaling.
    let scale = 1;
    let last = await renderBlob(img, crop, ow, oh, mime, 1);
    while (last.size > targetBytes && scale > 0.15) {
      scale *= 0.85;
      last = await renderBlob(img, crop, ow * scale, oh * scale, mime, 1);
    }
    return { blob: last, w: Math.round(ow * scale), h: Math.round(oh * scale), quality: 1 };
  }

  // Lossy: binary-search quality at full size.
  let lo = 0.3,
    hi = 0.95,
    best: Blob | null = null,
    bestQ = 0.3;
  for (let i = 0; i < 8; i++) {
    const q = (lo + hi) / 2;
    const blob = await renderBlob(img, crop, ow, oh, mime, q);
    if (blob.size <= targetBytes) {
      best = blob;
      bestQ = q;
      lo = q;
    } else {
      hi = q;
    }
  }
  if (best) return { blob: best, w: Math.round(ow), h: Math.round(oh), quality: bestQ };

  // Still too big at lowest quality — downscale.
  let scale = 1;
  let last = await renderBlob(img, crop, ow, oh, mime, 0.3);
  while (last.size > targetBytes && scale > 0.15) {
    scale *= 0.85;
    last = await renderBlob(img, crop, ow * scale, oh * scale, mime, 0.5);
  }
  return { blob: last, w: Math.round(ow * scale), h: Math.round(oh * scale), quality: 0.5 };
}

/** An upload-requirement preset. */
export interface ImagePreset {
  id: string;
  label: string;
  group: string;
  w?: number;
  h?: number;
  format?: string;
  maxKB?: number;
}

export const PRESETS: ImagePreset[] = [
  { id: "custom", label: "Custom", group: "General" },
  { id: "web1920", label: "Web — max 1920px wide", group: "General", w: 1920, format: "jpeg" },
  { id: "ig-square", label: "Instagram — Square 1080²", group: "Social", w: 1080, h: 1080, format: "jpeg" },
  { id: "ig-portrait", label: "Instagram — Portrait 1080×1350", group: "Social", w: 1080, h: 1350, format: "jpeg" },
  { id: "ig-story", label: "Instagram/Story — 1080×1920", group: "Social", w: 1080, h: 1920, format: "jpeg" },
  { id: "yt-thumb", label: "YouTube thumbnail — 1280×720", group: "Social", w: 1280, h: 720, format: "jpeg" },
  { id: "x-header", label: "X/Twitter header — 1500×500", group: "Social", w: 1500, h: 500, format: "jpeg" },
  { id: "fb-cover", label: "Facebook cover — 820×312", group: "Social", w: 820, h: 312, format: "jpeg" },
  { id: "li-cover", label: "LinkedIn cover — 1584×396", group: "Social", w: 1584, h: 396, format: "jpeg" },
  { id: "avatar", label: "Profile picture — 400²", group: "Profile", w: 400, h: 400, format: "jpeg" },
  { id: "passport", label: "Passport photo — 600² (2×2in)", group: "ID", w: 600, h: 600, format: "jpeg", maxKB: 240 },
  { id: "id-200", label: "ID upload — 600², ≤200 KB", group: "ID", w: 600, h: 600, format: "jpeg", maxKB: 200 },
  { id: "favicon", label: "Favicon/icon — 512²", group: "Web", w: 512, h: 512, format: "png" },
];
