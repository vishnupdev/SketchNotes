/**
 * Walkaround's data model: what a guided tour of an app is made of.
 *
 * A tour never touches the app it describes. It is authored against a *stage* —
 * a simplified drawing of that app's screen — so a step points at "the second
 * card in the body" or "the third bottom tab" rather than at a DOM node in
 * another app's tree. That is the whole design decision here: reaching into
 * twenty-five other apps for selectors would couple every app to this one
 * (rule #5) and break silently the first time any of them moved a button.
 * A schematic can only ever be out of date, which a test can check and a reader
 * can see.
 */

/**
 * What a step points at on the stage.
 *
 * - `brand` — the app's icon-and-name block, top left of every app's header
 * - `apps`  — the Apps button, top right, the way to the launcher
 * - `body`  — the whole working area
 * - `body:n`— the nth block of the working area, in the order they're authored
 * - `tab:n` — the nth tab of the app's bottom tab bar
 */
export type StageAnchor = "brand" | "apps" | "body" | `body:${number}` | `tab:${number}`;

/** One labelled block of an app's working area, as drawn on the stage. */
export interface StageBlock {
  /** Short name, drawn inside the block — what the app calls this region. */
  label: string;
  /** Columns of two this block occupies. Full width unless told otherwise. */
  span?: 1 | 2;
  /** Height relative to the other rows. 1 unless a region dominates the screen. */
  grow?: number;
}

/** The furniture of one app's screen, enough to recognise it from. */
export interface StageLayout {
  blocks: readonly StageBlock[];
  /** Bottom tab labels in bar order; omitted for apps with no tab bar. */
  tabs?: readonly string[];
}

/** One stop on a tour: where to look, what to do there, what to try. */
export interface TourStep {
  /** The tooltip's heading — three or four words. */
  title: string;
  /** Where the thing is and how to use it. Imperative, one sentence. */
  direction: string;
  /** Something worth doing here that isn't obvious from the screen. */
  suggestion: string;
  /** The part of the stage this step is about. */
  at: StageAnchor;
}

/** A full walkaround of one app. */
export interface Tour {
  /** The app's own header tagline, so the stage reads like the real thing. */
  tagline: string;
  /** One line on what the tour will cover, shown before it starts. */
  intro: string;
  layout: StageLayout;
  steps: readonly TourStep[];
}

/** A box on the stage, in percentages of the stage's own width and height. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
