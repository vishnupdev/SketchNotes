/**
 * Drawing the boxes — over the live preview, and burnt into a saved picture.
 *
 * One routine serves both, because they have to agree: a snapshot that framed
 * things differently from the preview it was taken from would be a picture of
 * something that never happened. The only difference between the two callers is
 * the canvas they hand in — the overlay is the size of the element on screen,
 * the snapshot is the size of the source frame — and {@link drawBoxes} takes
 * the projection to use rather than assuming either.
 *
 * Colours are passed in, never written here. They live as theme tokens in
 * `globals.css` (rule #6) and are resolved by the component, which is the only
 * place that can read a custom property.
 */

import type { Box, Size, SourceFit, TrackedDetection } from "./detections";
import { projectBox } from "./detections";

/** The theme's colours for the overlay, resolved from custom properties. */
export interface BoxPalette {
  /** Outline and label plate for something being seen right now. */
  box: string;
  /** Outline for something held over a gap while the model looks again. */
  held: string;
  /** Text on the label plate. */
  ink: string;
}

export interface DrawOptions {
  /** Where the source sits inside the canvas. */
  fit: SourceFit;
  /** The canvas's own size, so a label can be kept inside it. */
  view: Size;
  palette: BoxPalette;
  /** Multiplier on line widths and text, so a snapshot is not hairline-thin. */
  density?: number;
  /** Draw the score after the label. */
  showScores?: boolean;
}

/** Corner-bracket length as a share of the shorter side of the box. */
const CORNER_SHARE = 0.22;

/**
 * Draw one frame's boxes onto a canvas that has already been cleared.
 *
 * The brackets are corners rather than a full rectangle, which is not
 * decoration: a closed outline over a busy scene hides exactly the edge of the
 * thing you are trying to look at, and four corners locate the box just as well
 * while leaving the object visible. It is also what keeps a dozen overlapping
 * boxes legible instead of turning the frame into a grid.
 */
export function drawBoxes(
  ctx: CanvasRenderingContext2D,
  detections: readonly TrackedDetection[],
  options: DrawOptions,
): void {
  const { fit, view, palette, density = 1, showScores = true } = options;
  if (fit.scale <= 0) return;

  const lineWidth = Math.max(1.5, 2.5 * density);
  const fontSize = Math.max(11, 13 * density);
  const pad = Math.max(4, 5 * density);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;

  for (const detection of detections) {
    const box = projectBox(detection.box, fit);
    if (box.w <= 0 || box.h <= 0) continue;

    const held = detection.missedFrames > 0;
    ctx.strokeStyle = held ? palette.held : palette.box;
    ctx.lineWidth = held ? lineWidth * 0.75 : lineWidth;
    // A held box is drawn dashed as well as dimmer, because "the model has lost
    // this for a moment" has to survive being looked at on a bright phone
    // screen outdoors, where a colour difference alone does not.
    ctx.setLineDash(held ? [lineWidth * 2.5, lineWidth * 2] : []);
    drawCorners(ctx, box);

    if (held) continue; // no plate for something not currently seen

    ctx.setLineDash([]);
    const text = showScores
      ? `${detection.label} ${Math.round(detection.score * 100)}%`
      : detection.label;
    drawPlate(ctx, box, text, { palette, pad, fontSize, lineWidth, view });
  }

  ctx.restore();
}

/** Four corner brackets, inset nowhere — they sit exactly on the box. */
function drawCorners(ctx: CanvasRenderingContext2D, box: Box): void {
  const arm = Math.min(box.w, box.h) * CORNER_SHARE;
  const { x, y, w, h } = box;
  ctx.beginPath();
  ctx.moveTo(x, y + arm);
  ctx.lineTo(x, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x + w - arm, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + arm);
  ctx.moveTo(x + w, y + h - arm);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - arm, y + h);
  ctx.moveTo(x + arm, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - arm);
  ctx.stroke();
}

/**
 * The label plate.
 *
 * Filled, not outlined text: a label drawn straight onto video is unreadable
 * about half the time, because whatever is behind it changes every frame.
 *
 * Both of the adjustments below exist because a detection at the edge of the
 * frame is the common case, not the exotic one — a person walking out of shot
 * is exactly when you want to read their label. The plate flips *below* the box
 * when there is no room above it, and slides back inside the canvas when the
 * text would run off the right-hand edge. Without the second one, the widest
 * labels on the most interesting detections are the ones that get cut in half.
 */
function drawPlate(
  ctx: CanvasRenderingContext2D,
  box: Box,
  text: string,
  style: { palette: BoxPalette; pad: number; fontSize: number; lineWidth: number; view: Size },
): void {
  const { palette, pad, fontSize, lineWidth, view } = style;
  const width = ctx.measureText(text).width + pad * 2;
  const height = fontSize + pad * 1.6;
  const above = box.y - height - lineWidth >= 0;
  // Slide, never shrink or wrap: a label that changes size as the thing it
  // names drifts toward the edge reads as a glitch.
  const x = Math.max(0, Math.min(box.x, view.width - width));
  const y = Math.max(
    0,
    Math.min(above ? box.y - height - lineWidth : box.y + lineWidth, view.height - height),
  );
  const radius = Math.min(height / 2.6, 7);

  ctx.fillStyle = palette.box;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  ctx.fillStyle = palette.ink;
  ctx.fillText(text, x + pad, y + height - pad * 0.9);
}

/**
 * Compose a still: the frame as it was, with the boxes burnt in.
 *
 * Rendered at the *source's* own resolution rather than the preview's, so the
 * saved picture is the full frame the sensor gave and not a screenshot of a
 * phone-sized video element. `density` scales the overlay back up to match, so
 * a 1080p snapshot does not come out with hairline boxes and four-pixel text.
 */
export function composeSnapshot(
  source: CanvasImageSource,
  size: { width: number; height: number },
  detections: readonly TrackedDetection[],
  palette: BoxPalette,
  options: { mirrored?: boolean; showScores?: boolean } = {},
): HTMLCanvasElement | null {
  if (size.width <= 0 || size.height <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (options.mirrored) {
    // Mirror the picture, not the overlay: the boxes have already been mirrored
    // into preview space by the caller, and flipping them again here would put
    // every label back to front.
    ctx.save();
    ctx.translate(size.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, size.width, size.height);
    ctx.restore();
  } else {
    ctx.drawImage(source, 0, 0, size.width, size.height);
  }

  drawBoxes(ctx, detections, {
    fit: { scale: 1, offsetX: 0, offsetY: 0 },
    view: size,
    palette,
    density: Math.max(1, Math.min(size.width, size.height) / 420),
    showScores: options.showScores ?? true,
  });

  return canvas;
}
