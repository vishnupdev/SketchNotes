/**
 * Turning the engine's output into something you can trust and paste.
 *
 * Tesseract hands back a tree of blocks, paragraphs, lines and words, each with
 * a bounding box and a confidence, plus a `text` field that is the whole page
 * with a hard line break at the end of every visual line. Most web OCR tools
 * show you that `text` field and stop. Two things are wrong with that:
 *
 * 1. **The line breaks are wrong.** They are where the *page* wrapped, not
 *    where the sentences end, so pasting the result into a document gives you a
 *    paragraph broken into ragged fragments. {@link reflow} puts it back
 *    together — including rejoining words hyphenated across a line break.
 * 2. **The confidence is thrown away.** OCR does not fail loudly; it fails by
 *    confidently returning `5` where the page said `S`. The per-word confidence
 *    is the only thing that tells you *which* words to check, and it is the
 *    single most useful number the engine produces. Everything here keeps it.
 *
 * The input is described structurally ({@link RawPage}) rather than imported
 * from the engine's types, so all of this is testable against a hand-written
 * fixture and none of it drags a 7 MB dependency into a unit test.
 */

/** The subset of the engine's result this module reads. */
export interface RawBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RawWord {
  text: string;
  confidence: number;
  bbox: RawBox;
}

export interface RawLine {
  text: string;
  confidence: number;
  bbox: RawBox;
  words: RawWord[];
}

export interface RawParagraph {
  lines: RawLine[];
}

export interface RawBlock {
  paragraphs: RawParagraph[];
}

export interface RawPage {
  blocks: RawBlock[] | null;
  text: string;
  confidence: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrWord {
  text: string;
  /** 0–100, as the engine reports it. */
  confidence: number;
  box: Box;
  /** Which line this word sits on, so a click can find its context. */
  line: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
  box: Box;
  words: OcrWord[];
  /**
   * Whether the engine considered this line the start of a new paragraph. Used
   * by {@link reflow} together with the geometry, because the engine's own
   * paragraph detection is good on a scan and poor on a phone photo.
   */
  startsParagraph: boolean;
}

export interface OcrResult {
  lines: OcrLine[];
  words: OcrWord[];
  /**
   * Mean confidence weighted by word length. An unweighted mean is dominated by
   * stray one-character fragments, which are exactly the words the engine is
   * always unsure about — so it reports a page of clean prose as mediocre.
   */
  confidence: number;
  /** Size of the image the boxes are measured in, for drawing an overlay. */
  width: number;
  height: number;
}

/**
 * Below this, a word is worth looking at. 70 is where Tesseract's confidence
 * starts to correlate with actual mistakes in practice; above about 85 it is
 * almost always right, and between the two it is usually right about the letters
 * and wrong about the punctuation.
 */
export const LOW_CONFIDENCE = 70;

const toBox = (bbox: RawBox): Box => ({
  x: bbox.x0,
  y: bbox.y0,
  w: bbox.x1 - bbox.x0,
  h: bbox.y1 - bbox.y0,
});

/**
 * Flatten the engine's tree into lines and words.
 *
 * Words whose text is empty or whitespace are dropped: the engine emits them
 * for gaps it could not resolve, they have meaningless boxes, and left in they
 * would each be counted as a low-confidence word to check.
 */
export function fromPage(page: RawPage, width: number, height: number): OcrResult {
  const lines: OcrLine[] = [];
  const words: OcrWord[] = [];

  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      paragraph.lines.forEach((rawLine, indexInParagraph) => {
        const lineIndex = lines.length;

        const lineWords = rawLine.words
          .filter((word) => word.text.trim() !== "")
          .map((word) => ({
            text: word.text,
            confidence: word.confidence,
            box: toBox(word.bbox),
            line: lineIndex,
          }));

        if (lineWords.length === 0) return;

        words.push(...lineWords);
        lines.push({
          // Rebuilt from the words rather than taken from `rawLine.text`, which
          // carries the trailing newline and any word just dropped.
          text: lineWords.map((word) => word.text).join(" "),
          confidence: rawLine.confidence,
          box: toBox(rawLine.bbox),
          words: lineWords,
          startsParagraph: indexInParagraph === 0,
        });
      });
    }
  }

  return { lines, words, confidence: weightedConfidence(words), width, height };
}

/** Length-weighted mean confidence, or 0 for nothing recognised. */
export function weightedConfidence(words: OcrWord[]): number {
  let total = 0;
  let weight = 0;
  for (const word of words) {
    const length = word.text.trim().length;
    total += word.confidence * length;
    weight += length;
  }
  return weight === 0 ? 0 : total / weight;
}

export interface ReflowOptions {
  /**
   * A vertical gap this many times the median line height starts a new
   * paragraph. 1.6 catches a blank line without splitting merely loose leading.
   */
  gapFactor?: number;
  /** Rejoin a word split by a hyphen at the end of a line. */
  dehyphenate?: boolean;
}

/**
 * Join the recognised lines back into paragraphs.
 *
 * Two signals decide where a paragraph ends, because neither is reliable alone:
 * the engine's own paragraph grouping, and the vertical gap between one line's
 * box and the next. The gap is measured against the *median* line height rather
 * than the mean — one oversized heading would drag a mean upward far enough to
 * swallow every real paragraph break on the page.
 *
 * De-hyphenation only fires when the next line begins with a lower-case letter.
 * "well-\nknown" is one word; "Section 4-\nB" is two, and guessing wrong there
 * silently corrupts a reference number.
 */
export function reflow(result: OcrResult, options: ReflowOptions = {}): string {
  const { gapFactor = 1.6, dehyphenate = true } = options;
  const { lines } = result;
  if (lines.length === 0) return "";

  const median = medianHeight(lines);
  const paragraphs: string[] = [];
  let current = "";

  lines.forEach((line, index) => {
    if (index === 0) {
      current = line.text;
      return;
    }

    const previous = lines[index - 1];
    // Baseline-to-baseline distance, so a tall line does not read as a gap.
    const gap = line.box.y + line.box.h - (previous.box.y + previous.box.h);
    const broken = line.startsParagraph || gap > median * gapFactor;

    if (broken) {
      paragraphs.push(current);
      current = line.text;
      return;
    }

    if (dehyphenate && /[-‐‑]$/.test(current) && /^[a-zß-ÿ]/.test(line.text)) {
      current = `${current.slice(0, -1)}${line.text}`;
      return;
    }

    current = `${current} ${line.text}`;
  });

  paragraphs.push(current);
  return paragraphs.join("\n\n");
}

function medianHeight(lines: OcrLine[]): number {
  const heights = lines.map((line) => line.box.h).sort((a, b) => a - b);
  const middle = Math.floor(heights.length / 2);
  const value =
    heights.length % 2 === 0 ? (heights[middle - 1] + heights[middle]) / 2 : heights[middle];
  // A degenerate page (every box zero-height) must not make every gap a break.
  return value > 0 ? value : 1;
}

/** The words worth checking, in reading order. */
export const flagged = (result: OcrResult): OcrWord[] =>
  result.words.filter((word) => word.confidence < LOW_CONFIDENCE);

export interface OcrStats {
  words: number;
  lines: number;
  characters: number;
  low: number;
  confidence: number;
}

export function stats(result: OcrResult): OcrStats {
  return {
    words: result.words.length,
    lines: result.lines.length,
    characters: result.words.reduce((sum, word) => sum + word.text.length, 0),
    low: flagged(result).length,
    confidence: result.confidence,
  };
}

/**
 * How to describe a page's confidence in words.
 *
 * A bare percentage invites the reader to treat 82% as "mostly fine", when what
 * it actually means is that roughly one word in six needs checking. The bands
 * say what to *do* instead.
 */
export function verdict(confidence: number, low: number, words: number): string {
  if (words === 0) return "No text found. Try the Tune tab — the picture may need straightening, cropping or more contrast.";
  const share = Math.round((low / words) * 100);
  if (confidence >= 90 && share <= 2) return "Clean read — spot-check the numbers and move on.";
  if (confidence >= 80) return `Good read, but ${low} word${low === 1 ? "" : "s"} (${share}%) are worth checking — they are marked below.`;
  if (confidence >= 65) return `Rough read: ${share}% of words are uncertain. Tune usually fixes this — upscaling a small or low-contrast picture is the single biggest improvement.`;
  return "Poor read. The picture is probably too small, too dark, skewed, or the text is over a busy background. Try Tune before trusting any of this.";
}
