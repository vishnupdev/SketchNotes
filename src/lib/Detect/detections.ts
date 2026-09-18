/**
 * What a detection is, where it lands on screen, and how to stop it flickering.
 *
 * Everything here is pure arithmetic over plain objects — no model, no DOM, no
 * React — which is what makes the awkward parts testable. Three of them are
 * awkward enough to be worth the file:
 *
 * 1. **The model measures in a different space than the screen.** A box comes
 *    back in the *source's* pixels (1280×720 of camera sensor, or whatever the
 *    photo happens to be), and it has to be drawn over an element that is
 *    letterboxing that source into a completely different rectangle. Getting
 *    this wrong is the classic object-detection bug: boxes that are roughly
 *    right in the middle of the frame and drift further out the nearer the edge
 *    they get. {@link fitSource} is the one place that mapping lives.
 *
 * 2. **A detector run frame-by-frame strobes.** A model looking at live video
 *    is not tracking anything — every frame is an independent guess, so a cup
 *    sitting perfectly still flickers in and out as its score crosses the
 *    threshold. {@link reconcile} is what makes the overlay watchable.
 *
 * 3. **A pile of boxes is not an answer.** "Seven boxes" is what the model
 *    returns; "2 people and a laptop" is what a person wanted, and it is also
 *    the only form a screen reader can use. {@link summarise} does that.
 */

import { countPhrase } from "./labels";

/** A rectangle, in whatever pixel space its owner is measured in. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One thing the model found in one frame. `box` is in *source* pixels. */
export interface Detection {
  label: string;
  /** Model confidence, 0–1. */
  score: number;
  box: Box;
}

/**
 * A detection as the overlay holds it, once frames have been reconciled.
 *
 * `missedFrames` is the flicker fix made visible: it counts how many frames in
 * a row the model has *not* found this thing. Zero means it is being seen right
 * now; anything higher means it is being held over a gap.
 */
export interface TrackedDetection extends Detection {
  /** Stable across frames, so the overlay can animate rather than redraw. */
  id: string;
  missedFrames: number;
}

export interface Size {
  width: number;
  height: number;
}

/** How a source rectangle sits inside a view rectangle under `object-contain`. */
export interface SourceFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Where the source lands inside the view, the way `object-contain` puts it.
 *
 * The single scale factor is the point: a video is letterboxed, never stretched,
 * so both axes share one factor and the leftover space is split evenly into
 * bars. A degenerate size (a video element that has not produced a frame yet
 * reports 0×0) yields a scale of 0 rather than `Infinity` or `NaN`, so a caller
 * that draws one frame too early draws nothing instead of garbage.
 */
export function fitSource(source: Size, view: Size): SourceFit {
  if (source.width <= 0 || source.height <= 0 || view.width <= 0 || view.height <= 0) {
    return { scale: 0, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(view.width / source.width, view.height / source.height);
  return {
    scale,
    offsetX: (view.width - source.width * scale) / 2,
    offsetY: (view.height - source.height * scale) / 2,
  };
}

/** Move a source-space box into view space. */
export const projectBox = (box: Box, fit: SourceFit): Box => ({
  x: box.x * fit.scale + fit.offsetX,
  y: box.y * fit.scale + fit.offsetY,
  w: box.w * fit.scale,
  h: box.h * fit.scale,
});

/**
 * Mirror a source-space box horizontally.
 *
 * The front camera's preview is flipped so it behaves like a mirror, which is
 * what everybody expects of a selfie view — but the model is given the
 * *unflipped* frame, so its boxes would land on the wrong side of the picture.
 * Flipping the box rather than the frame keeps one canvas read per frame.
 */
export const mirrorBox = (box: Box, sourceWidth: number): Box => ({
  ...box,
  x: sourceWidth - box.x - box.w,
});

/** Intersection over union — how much two boxes agree, 0 (apart) to 1 (same). */
export function iou(a: Box, b: Box): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const overlap = Math.max(0, right - left) * Math.max(0, bottom - top);
  if (overlap <= 0) return 0;
  const union = a.w * a.h + b.w * b.h - overlap;
  return union > 0 ? overlap / union : 0;
}

export interface ReconcileOptions {
  /** Boxes of the same label overlapping by at least this are the same thing. */
  minIou?: number;
  /** How many consecutive misses a thing survives before it is dropped. */
  keepForFrames?: number;
}

/**
 * Carry the previous frame's detections into this one.
 *
 * Every frame is an independent guess, so a thing the model was sure about a
 * moment ago can vanish for a frame or two and come straight back. Dropping it
 * immediately is what makes a naive overlay strobe; holding it *forever* is
 * what makes one lie. So a missed thing is held for a few frames, keeping its
 * id (and therefore its position on the list and any CSS transition), and is
 * dropped if it does not come back.
 *
 * Matching is by label *and* overlap: two people standing apart stay two
 * entries, and a person who walks out of frame while a chair appears where they
 * were does not inherit their box.
 */
export function reconcile(
  previous: readonly TrackedDetection[],
  found: readonly Detection[],
  options: ReconcileOptions = {},
): TrackedDetection[] {
  const minIou = options.minIou ?? 0.35;
  const keepForFrames = options.keepForFrames ?? 3;

  const claimed = new Set<string>();
  const next: TrackedDetection[] = [];

  for (const detection of found) {
    // The best previous match, not merely the first: with two cups side by side
    // the first-match rule swaps their ids every time they jitter past each
    // other, and the list under the picture reorders itself for no reason.
    let bestId: string | null = null;
    let bestScore = minIou;
    for (const candidate of previous) {
      if (claimed.has(candidate.id) || candidate.label !== detection.label) continue;
      const overlap = iou(candidate.box, detection.box);
      if (overlap >= bestScore) {
        bestScore = overlap;
        bestId = candidate.id;
      }
    }
    if (bestId) claimed.add(bestId);
    next.push({
      ...detection,
      id: bestId ?? `${detection.label}-${nextSerial()}`,
      missedFrames: 0,
    });
  }

  for (const stale of previous) {
    if (claimed.has(stale.id)) continue;
    const missedFrames = stale.missedFrames + 1;
    if (missedFrames <= keepForFrames) next.push({ ...stale, missedFrames });
  }

  // Strongest first, so the list under the picture reads as "what it is most
  // sure of", and a held-over box never outranks something being seen now.
  return next.sort((a, b) => a.missedFrames - b.missedFrames || b.score - a.score);
}

/** Ids only have to be unique within a session; a counter is enough. */
let serial = 0;
const nextSerial = () => {
  serial += 1;
  return serial;
};

/** How many of each label, strongest first. */
export function countByLabel(detections: readonly Detection[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of detections) counts.set(d.label, (counts.get(d.label) ?? 0) + 1);
  return counts;
}

/**
 * The frame in one sentence: `2 people, 1 laptop and 1 cup`.
 *
 * This is the accessible view of the overlay, not a nicety beside it — a canvas
 * of rectangles is nothing at all to a screen reader, so this string is what
 * the app actually announces. It is ordered by count then name so that it is
 * stable between frames: an announcement that reorders itself while nothing has
 * changed is worse than none.
 */
export function summarise(detections: readonly Detection[]): string {
  const counts = [...countByLabel(detections)].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  if (!counts.length) return "Nothing recognised";
  const phrases = counts.map(([label, count]) => countPhrase(label, count));
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

/** One row of the session's running tally. */
export interface SeenEntry {
  label: string;
  /** Most seen at once in a single frame — not a running total of frames. */
  most: number;
  /** Best confidence this label has ever reached this session. */
  best: number;
  /** `Date.now()` of the last frame it appeared in. */
  lastSeen: number;
}

/**
 * Fold a frame into the running tally.
 *
 * `most` is the highest number seen *in one frame*, never a sum. A sum would be
 * meaningless at ten frames a second — leave a cup on the desk for a minute and
 * a totalling counter claims six hundred cups. The peak is the figure that
 * answers the question people are actually asking ("how many were there?").
 */
export function recordSeen(
  tally: readonly SeenEntry[],
  detections: readonly Detection[],
  now: number,
): SeenEntry[] {
  if (!detections.length) return [...tally];
  const byLabel = new Map(tally.map((entry) => [entry.label, entry]));

  for (const [label, count] of countByLabel(detections)) {
    const best = Math.max(...detections.filter((d) => d.label === label).map((d) => d.score));
    const existing = byLabel.get(label);
    byLabel.set(label, {
      label,
      most: Math.max(existing?.most ?? 0, count),
      best: Math.max(existing?.best ?? 0, best),
      lastSeen: now,
    });
  }

  return [...byLabel.values()].sort((a, b) => b.lastSeen - a.lastSeen || a.label.localeCompare(b.label));
}

/**
 * A rolling frame rate from the gaps between frames.
 *
 * Averaged over the last handful rather than reported per frame: an instant
 * figure derived from one gap swings between 6 and 40 on a steady stream and is
 * unreadable. Returns null until there are two timestamps to measure between.
 */
export function frameRate(timestamps: readonly number[]): number | null {
  if (timestamps.length < 2) return null;
  const span = timestamps[timestamps.length - 1] - timestamps[0];
  if (span <= 0) return null;
  return ((timestamps.length - 1) / span) * 1000;
}
