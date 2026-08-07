/**
 * Dominant-colour extraction from image pixels, by median cut.
 *
 * Median cut is the right trade here: it is deterministic (the same photo always
 * yields the same palette, so a user can re-open a picture and get the swatches
 * they saw before), needs no iteration to converge like k-means does, and runs
 * in a few milliseconds on the sampled pixel set — fast enough to do on the main
 * thread the moment an image loads, with no worker and no added bundle weight.
 */

import { rgbToHex } from "./convert";
import type { PaletteEntry, RGB } from "./types";

/**
 * Pixels examined per image. A photo has far more pixels than a palette needs;
 * sampling caps the work at a fixed cost regardless of whether the source is a
 * thumbnail or a 48-megapixel camera frame.
 */
const MAX_SAMPLES = 24_000;

/** Below this alpha a pixel is treated as absent (transparent PNGs). */
const ALPHA_FLOOR = 128;

/** Read RGBA bytes into an evenly-sampled list of opaque pixels. */
function samplePixels(data: Uint8ClampedArray): RGB[] {
  const total = Math.floor(data.length / 4);
  const step = Math.max(1, Math.floor(total / MAX_SAMPLES));
  const out: RGB[] = [];
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (data[o + 3] < ALPHA_FLOOR) continue;
    out.push({ r: data[o], g: data[o + 1], b: data[o + 2] });
  }
  return out;
}

type Channel = "r" | "g" | "b";

/** The channel over which this bucket's pixels are most spread out. */
function widestChannel(bucket: RGB[]): { channel: Channel; range: number } {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const p of bucket) {
    if (p.r < rMin) rMin = p.r;
    if (p.r > rMax) rMax = p.r;
    if (p.g < gMin) gMin = p.g;
    if (p.g > gMax) gMax = p.g;
    if (p.b < bMin) bMin = p.b;
    if (p.b > bMax) bMax = p.b;
  }
  const ranges: Array<{ channel: Channel; range: number }> = [
    { channel: "r", range: rMax - rMin },
    { channel: "g", range: gMax - gMin },
    { channel: "b", range: bMax - bMin },
  ];
  return ranges.reduce((a, b) => (b.range > a.range ? b : a));
}

/** Mean colour of a bucket. */
function meanOf(bucket: RGB[]): RGB {
  let r = 0, g = 0, b = 0;
  for (const p of bucket) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  const n = bucket.length;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/** Squared distance in RGB — no sqrt, since only the ordering matters. */
function distance2(p: RGB, c: RGB): number {
  const dr = p.r - c.r;
  const dg = p.g - c.g;
  const db = p.b - c.b;
  return dr * dr + dg * dg + db * db;
}

/** Index of the centroid nearest to a pixel. */
function nearestCentroid(p: RGB, centroids: RGB[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let k = 0; k < centroids.length; k++) {
    const d = distance2(p, centroids[k]);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

/**
 * Split the widest-spread bucket at its median, repeatedly, until we have
 * `count` buckets. Splitting the *widest* bucket first is what makes the result
 * cover the image's range rather than over-describing one busy region.
 */
function medianCut(pixels: RGB[], count: number): RGB[][] {
  let buckets: RGB[][] = [pixels];

  while (buckets.length < count) {
    // Pick the bucket with the largest colour spread that can still be halved.
    let targetIndex = -1;
    let targetRange = 0;
    let targetChannel: Channel = "r";
    buckets.forEach((bucket, i) => {
      if (bucket.length < 2) return;
      const { channel, range } = widestChannel(bucket);
      if (range > targetRange) {
        targetRange = range;
        targetIndex = i;
        targetChannel = channel;
      }
    });
    // Every bucket is a single colour (or a single pixel) — nothing left to cut.
    if (targetIndex === -1 || targetRange === 0) break;

    const bucket = buckets[targetIndex];
    const sorted = bucket.slice().sort((a, b) => a[targetChannel] - b[targetChannel]);
    const mid = Math.floor(sorted.length / 2);
    buckets = [
      ...buckets.slice(0, targetIndex),
      sorted.slice(0, mid),
      sorted.slice(mid),
      ...buckets.slice(targetIndex + 1),
    ];
  }
  return buckets;
}

/**
 * Refinement passes after the median cut. Median cut alone splits a bucket at
 * its median *pixel*, not at a gap in the colours, so an image made of two
 * unequal blocks of colour gets a cut straight through the larger one — the
 * reported swatch is then a blend of both, a colour that isn't in the picture.
 * Reassigning each pixel to its nearest swatch and re-averaging (Lloyd's
 * algorithm, seeded by the cut) pulls the swatches back onto the real clusters.
 * It converges in a handful of passes; the loop exits as soon as nothing moves.
 */
const REFINE_PASSES = 8;

/**
 * The `count` most representative colours in an RGBA buffer, each with the share
 * of sampled pixels it stands for, most-dominant first.
 */
export function extractPalette(data: Uint8ClampedArray, count = 8): PaletteEntry[] {
  const pixels = samplePixels(data);
  if (pixels.length === 0) return [];

  let centroids = medianCut(pixels, count)
    .filter((bucket) => bucket.length > 0)
    .map(meanOf);

  // -1 = unassigned, so the first pass always counts as movement.
  const assignment = new Int32Array(pixels.length).fill(-1);
  const counts = new Array<number>(centroids.length).fill(0);

  for (let pass = 0; pass < REFINE_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < pixels.length; i++) {
      const k = nearestCentroid(pixels[i], centroids);
      if (assignment[i] !== k) {
        assignment[i] = k;
        moved = true;
      }
    }
    // Re-average every cluster from the pixels that just landed in it.
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < pixels.length; i++) {
      const s = sums[assignment[i]];
      s.r += pixels[i].r;
      s.g += pixels[i].g;
      s.b += pixels[i].b;
      s.n++;
    }
    centroids = centroids.map((c, k) => {
      const s = sums[k];
      // An emptied cluster keeps its position; it's dropped below on zero share.
      return s.n === 0
        ? c
        : { r: Math.round(s.r / s.n), g: Math.round(s.g / s.n), b: Math.round(s.b / s.n) };
    });
    for (let k = 0; k < counts.length; k++) counts[k] = sums[k].n;
    if (!moved) break;
  }

  const total = pixels.length;
  return centroids
    .map((rgb, k) => ({ hex: rgbToHex(rgb), rgb, share: counts[k] / total }))
    .filter((entry) => entry.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** The image's overall average colour — its single-swatch summary. */
export function averageColor(data: Uint8ClampedArray): RGB | null {
  const pixels = samplePixels(data);
  return pixels.length === 0 ? null : meanOf(pixels);
}
