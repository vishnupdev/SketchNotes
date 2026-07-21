/**
 * Core domain types for the sketch document model.
 *
 * A drawing is an ordered list of {@link SketchElement}s. Each element carries
 * its own style so it can be rendered, hit-tested and exported independently.
 * Coordinates are always in *world* space (pre-view-transform).
 */

/** Special sentinel meaning "use the theme's default ink colour". */
export type AutoColor = "auto";
/** A stroke/fill colour: either the theme-aware sentinel or any CSS colour. */
export type SketchColor = AutoColor | string;

export interface Point {
  x: number;
  y: number;
}

interface BaseElement {
  color: SketchColor;
  /** Stroke width in world units. */
  w: number;
}

/** Freehand stroke, stored as a poly-line that renders as a smoothed curve. */
export interface PenElement extends BaseElement {
  type: "pen";
  points: Point[];
}

/** Straight line or single-headed arrow between two points. */
export interface LineElement extends BaseElement {
  type: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Axis-aligned rectangle or ellipse defined by two drag corners. */
export interface BoxElement extends BaseElement {
  type: "rect" | "ellipse";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Parametric polygon (star, heart, arrow, …) mapped onto the drag box. */
export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A stamped emoji glyph. Carries no stroke — `color`/`w` are unused. */
export interface EmojiElement extends BaseElement {
  type: "emoji";
  ch: string;
  x: number;
  y: number;
  size: number;
}

/** Multi-line hand-lettered text. */
export interface TextElement extends BaseElement {
  type: "text";
  x: number;
  y: number;
  text: string;
  size: number;
}

export type SketchElement =
  | PenElement
  | LineElement
  | BoxElement
  | ShapeElement
  | EmojiElement
  | TextElement;

/** Any element addressed by its two drag corners (line/arrow/rect/ellipse/shape). */
export type CornerElement = LineElement | BoxElement | ShapeElement;

/** Pan + zoom of the canvas: screen = world * s + {x,y}. */
export interface View {
  x: number;
  y: number;
  s: number;
}

/** Axis-aligned bounding box in world space. */
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Theme = "light" | "dark";

/** The set of tools the dock can activate. Shape keys double as tools. */
export type Tool =
  | "select"
  | "pen"
  | "eraser"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "text"
  | "emoji"
  | string; // shape keys (triangle, star, …)

/** A saved note's list entry (the lightweight index record). */
export interface NoteMeta {
  id: string;
  title: string;
  updatedAt: number;
}

/** A note's full persisted payload. */
export interface NoteDocument {
  title: string;
  els: SketchElement[];
}

/** Shape of the exported / imported `.json` backup file. */
export interface SketchBackup {
  app: "sketchnotes";
  version: 1;
  title: string;
  els: SketchElement[];
}

export type ExportFormat = "png" | "jpg" | "webp" | "svg" | "pdf" | "doc" | "json";
