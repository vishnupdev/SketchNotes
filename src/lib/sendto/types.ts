import type { AppId } from "@/store/useWorkspaceStore";

/**
 * Handing a result from one app to another, *inside* the workspace.
 *
 * `lib/intake` brings things in from the operating system; this is the missing
 * direction. Before it, every app was a dead end: Text Recognition read a page
 * and offered Copy and Save, so getting that text into Markdown Studio meant a
 * `.txt` round-trip through the downloads folder — in a workspace whose whole
 * premise is that these tools already live together.
 *
 * The shape is deliberately the same as intake's, because the arrangement that
 * makes intake safe is what makes this safe: the sender leaves a payload
 * addressed to an app, the shell switches to it, and that app takes it and
 * decides what it means. Neither side imports the other, so **no app can break
 * another by sending to it** (rules #4/#5) — the worst a bad payload can do is
 * be ignored.
 *
 * Growing it is two edits: a row in {@link SEND_TARGETS} for a new
 * destination, and one `useEffect` in the app that wants to receive. A producer
 * gains a destination for free the moment one registers, and an app that never
 * looks costs nothing.
 */

/**
 * What is being sent, in terms of what a destination has to understand.
 *
 * Kept coarse on purpose. A kind per producer ("ocr-text", "transcript") would
 * make every new producer a change in every consumer; a kind per *shape of
 * data* means a consumer written once accepts everything that shape.
 */
export type SendKind = "text" | "color";

/** Longer than any real payload, short of holding a novel in memory. */
export const MAX_SEND_TEXT = 100_000;

export interface SendItem {
  id: string;
  kind: SendKind;
  /** The app it is addressed to — the destination the sender chose. */
  to: AppId;
  /** The app it came from, so the destination can say where it got it. */
  from: AppId;
  /** Text body, or a `#rrggbb` colour. Interpreted by {@link SendKind}. */
  value: string;
  /**
   * What this payload is, in the sender's words — "Recognised text",
   * "Transcript". Destinations show it, so it is written to be read by someone
   * who has just arrived in an app they did not open themselves.
   */
  label: string;
}

export interface SendTarget {
  app: AppId;
  /**
   * What this destination will do with the payload, as the menu row's second
   * line. Phrased as the action, not the app's tagline: someone choosing a
   * destination is choosing an outcome, and "Append it to the document" answers
   * that where "Write markdown, see it rendered" does not.
   */
  does: string;
}

/**
 * Where each kind of payload can go.
 *
 * Order is the order the menu offers them, so the most likely destination for
 * that shape of data goes first.
 */
export const SEND_TARGETS: Record<SendKind, readonly SendTarget[]> = {
  text: [
    { app: "markdown", does: "Append it to the document" },
    { app: "board", does: "Add it to a note on the board" },
  ],
  color: [{ app: "contrast", does: "Grade it for readability" }],
};

/** The destinations for a kind. Never empty — see the test. */
export const targetsFor = (kind: SendKind): readonly SendTarget[] => SEND_TARGETS[kind];

/**
 * Trim a payload to something a destination can hold.
 *
 * Applied when the item is *sent* rather than when it is received, so a
 * destination never has to defend against a payload no one meant to produce,
 * and so the cap is one number rather than one per consumer.
 */
export function clampValue(kind: SendKind, value: string): string {
  const trimmed = value.trim();
  return kind === "text" ? trimmed.slice(0, MAX_SEND_TEXT) : trimmed;
}
