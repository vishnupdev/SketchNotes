import { describe, expect, it } from "vitest";
import {
  flagged,
  fromPage,
  LOW_CONFIDENCE,
  reflow,
  stats,
  verdict,
  weightedConfidence,
  type OcrResult,
  type RawPage,
  type RawWord,
} from "./blocks";
import {
  applyTune,
  binarise,
  contrast,
  DEFAULT_TUNE,
  invert,
  MAX_PIXELS,
  otsuThreshold,
  scalePlan,
  suggestScale,
  toGrey,
  type Bitmap,
} from "./preprocess";
import { asLines, asParagraphs, asReview, asTsv, exportName, render } from "./export";

/* ------------------------------- fixtures -------------------------------- */

const word = (text: string, confidence = 95, y = 0, x = 0): RawWord => ({
  text,
  confidence,
  bbox: { x0: x, y0: y, x1: x + text.length * 10, y1: y + 20 },
});

/** A page built from lines of `[text, y]`, all in one paragraph per group. */
function page(groups: { y: number; text: string; confidence?: number }[][]): RawPage {
  return {
    text: groups.flat().map((line) => line.text).join("\n"),
    confidence: 95,
    blocks: [
      {
        paragraphs: groups.map((lines) => ({
          lines: lines.map((line) => {
            const words = line.text
              .split(" ")
              .map((text, index) => word(text, line.confidence ?? 95, line.y, index * 60));
            return {
              text: line.text,
              confidence: line.confidence ?? 95,
              bbox: { x0: 0, y0: line.y, x1: 600, y1: line.y + 20 },
              words,
            };
          }),
        })),
      },
    ],
  };
}

const bitmap = (values: number[][], alpha = 255): Bitmap => {
  const height = values.length;
  const width = values[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  values.flat().forEach((value, index) => {
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = alpha;
  });
  return { data, width, height };
};

const greyAt = (b: Bitmap, index: number): number => b.data[index * 4];

/* -------------------------------- blocks --------------------------------- */

describe("fromPage", () => {
  it("flattens the engine's tree into lines and words", () => {
    const result = fromPage(page([[{ y: 0, text: "hello world" }, { y: 30, text: "again" }]]), 600, 200);
    expect(result.lines).toHaveLength(2);
    expect(result.words.map((w) => w.text)).toEqual(["hello", "world", "again"]);
    expect(result.width).toBe(600);
    expect(result.height).toBe(200);
  });

  it("records which line each word belongs to", () => {
    const result = fromPage(page([[{ y: 0, text: "a b" }, { y: 30, text: "c" }]]), 600, 200);
    expect(result.words.map((w) => w.line)).toEqual([0, 0, 1]);
  });

  it("marks the first line of each paragraph", () => {
    const result = fromPage(
      page([[{ y: 0, text: "one" }, { y: 30, text: "two" }], [{ y: 60, text: "three" }]]),
      600,
      200,
    );
    expect(result.lines.map((l) => l.startsParagraph)).toEqual([true, false, true]);
  });

  it("drops the empty words the engine emits for unresolved gaps", () => {
    const raw: RawPage = {
      text: "real",
      confidence: 90,
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: "real",
                  confidence: 90,
                  bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
                  words: [word("real"), word("  ", 3), word("", 0)],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = fromPage(raw, 100, 20);
    expect(result.words).toHaveLength(1);
    expect(result.lines[0].text).toBe("real");
  });

  it("drops a line that had nothing but empty words", () => {
    const raw: RawPage = {
      text: "",
      confidence: 0,
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                { text: " ", confidence: 0, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 }, words: [word(" ", 0)] },
              ],
            },
          ],
        },
      ],
    };
    expect(fromPage(raw, 10, 10).lines).toHaveLength(0);
  });

  it("survives a page the engine returned no blocks for", () => {
    const result = fromPage({ blocks: null, text: "", confidence: 0 }, 10, 10);
    expect(result.lines).toEqual([]);
    expect(result.confidence).toBe(0);
  });
});

describe("weightedConfidence", () => {
  it("weights by word length, so stray fragments cannot dominate", () => {
    const words = [
      { text: "recognition", confidence: 99, box: { x: 0, y: 0, w: 1, h: 1 }, line: 0 },
      { text: "|", confidence: 3, box: { x: 0, y: 0, w: 1, h: 1 }, line: 0 },
    ];
    // A flat mean would report 51% for a line that is plainly a clean read.
    expect(weightedConfidence(words)).toBeGreaterThan(90);
  });

  it("is zero for nothing recognised", () => {
    expect(weightedConfidence([])).toBe(0);
  });
});

describe("reflow", () => {
  it("rejoins lines that the page merely wrapped", () => {
    const result = fromPage(
      page([[{ y: 0, text: "the quick brown" }, { y: 24, text: "fox jumps over" }]]),
      600,
      200,
    );
    expect(reflow(result)).toBe("the quick brown fox jumps over");
  });

  it("breaks a paragraph on a large vertical gap", () => {
    const result = fromPage(page([[{ y: 0, text: "first para" }, { y: 200, text: "second para" }]]), 600, 400);
    expect(reflow(result)).toBe("first para\n\nsecond para");
  });

  it("breaks where the engine said a paragraph starts", () => {
    const result = fromPage(page([[{ y: 0, text: "one" }], [{ y: 24, text: "two" }]]), 600, 200);
    expect(reflow(result)).toBe("one\n\ntwo");
  });

  it("heals a word hyphenated across a line break", () => {
    const result = fromPage(
      page([[{ y: 0, text: "a well-" }, { y: 24, text: "known result" }]]),
      600,
      200,
    );
    expect(reflow(result)).toBe("a wellknown result");
  });

  it("leaves a hyphen alone before a capital, where it is probably real", () => {
    const result = fromPage(
      page([[{ y: 0, text: "see section 4-" }, { y: 24, text: "B for details" }]]),
      600,
      200,
    );
    expect(reflow(result)).toBe("see section 4- B for details");
  });

  it("can be told not to dehyphenate", () => {
    const result = fromPage(page([[{ y: 0, text: "well-" }, { y: 24, text: "known" }]]), 600, 200);
    expect(reflow(result, { dehyphenate: false })).toBe("well- known");
  });

  it("uses the median line height, so one huge heading cannot swallow the breaks", () => {
    const raw = page([
      [
        { y: 0, text: "HEADING" },
        { y: 30, text: "body one" },
        { y: 54, text: "body two" },
        { y: 200, text: "next para" },
      ],
    ]);
    // Give the heading a tall box; a mean-based gap test would then treat the
    // 146px break before "next para" as ordinary leading.
    raw.blocks![0].paragraphs[0].lines[0].bbox = { x0: 0, y0: 0, x1: 600, y1: 120 };
    const result = fromPage(raw, 600, 400);
    expect(reflow(result)).toContain("\n\nnext para");
  });

  it("is empty for nothing recognised", () => {
    expect(reflow({ lines: [], words: [], confidence: 0, width: 0, height: 0 })).toBe("");
  });

  it("does not divide by zero on degenerate zero-height boxes", () => {
    const raw = page([[{ y: 0, text: "a" }, { y: 0, text: "b" }]]);
    for (const line of raw.blocks![0].paragraphs[0].lines) line.bbox = { x0: 0, y0: 0, x1: 1, y1: 0 };
    expect(() => reflow(fromPage(raw, 1, 1))).not.toThrow();
  });
});

describe("flagged, stats and verdict", () => {
  const mixed: OcrResult = fromPage(
    page([[{ y: 0, text: "sure enough", confidence: 96 }, { y: 24, text: "dubious", confidence: 41 }]]),
    600,
    200,
  );

  it("flags only the words below the threshold", () => {
    expect(flagged(mixed).map((w) => w.text)).toEqual(["dubious"]);
    expect(LOW_CONFIDENCE).toBeGreaterThan(41);
  });

  it("counts what there is to check", () => {
    const s = stats(mixed);
    expect(s.words).toBe(3);
    expect(s.lines).toBe(2);
    expect(s.low).toBe(1);
    expect(s.characters).toBe("sureenoughdubious".length);
  });

  it("says what to do rather than only how confident it is", () => {
    expect(verdict(0, 0, 0)).toContain("No text found");
    expect(verdict(95, 0, 100)).toContain("Clean read");
    expect(verdict(84, 8, 100)).toContain("worth checking");
    expect(verdict(70, 25, 100)).toContain("Tune");
    expect(verdict(40, 60, 100)).toContain("Poor read");
  });
});

/* ------------------------------ preprocess ------------------------------- */

describe("toGrey", () => {
  it("weights the channels by perceived brightness", () => {
    const red: Bitmap = { data: new Uint8ClampedArray([255, 0, 0, 255]), width: 1, height: 1 };
    // A flat average would give 85 — indistinguishable from mid-grey, which
    // then binarises red ink on white to solid black.
    expect(greyAt(toGrey(red), 0)).toBe(76);
  });

  it("leaves a neutral pixel where it was", () => {
    expect(greyAt(toGrey(bitmap([[128]])), 0)).toBe(128);
  });
});

describe("otsuThreshold", () => {
  it("separates two clear groups when binarised at the level it returns", () => {
    const dark = new Array(50).fill(20);
    const light = new Array(50).fill(220);
    const source = bitmap([[...dark, ...light]]);
    // The level itself is the top of the ink group (`binarise` cuts at `<=`),
    // so the property worth asserting is the separation, not a range.
    const out = binarise(source, otsuThreshold(source));
    expect(greyAt(out, 0)).toBe(0);
    expect(greyAt(out, 49)).toBe(0);
    expect(greyAt(out, 50)).toBe(255);
    expect(greyAt(out, 99)).toBe(255);
  });

  it("adapts to a shadowed page a fixed 128 would ruin", () => {
    // Ink at 90, paper at 140 — a fixed mid-grey cut turns all of it to ink.
    const threshold = otsuThreshold(bitmap([[...new Array(20).fill(90), ...new Array(80).fill(140)]]));
    expect(threshold).toBeGreaterThanOrEqual(90);
    expect(threshold).toBeLessThan(140);
  });

  it("has a defined answer for a uniform or empty image", () => {
    expect(otsuThreshold(bitmap([[128]]))).toBeTypeOf("number");
    expect(otsuThreshold({ data: new Uint8ClampedArray(), width: 0, height: 0 })).toBe(128);
  });
});

describe("binarise, invert and contrast", () => {
  it("makes every pixel ink or paper, counting the threshold itself as ink", () => {
    const out = binarise(bitmap([[10, 128, 200]]), 128);
    expect([greyAt(out, 0), greyAt(out, 1), greyAt(out, 2)]).toEqual([0, 0, 255]);
  });

  it("inverts without touching alpha", () => {
    const out = invert(bitmap([[30]], 128));
    expect(greyAt(out, 0)).toBe(225);
    expect(out.data[3]).toBe(128);
  });

  it("pushes pixels away from mid-grey and clamps at the ends", () => {
    const out = contrast(bitmap([[100, 128, 200]]), 2);
    expect(greyAt(out, 0)).toBe(72);
    expect(greyAt(out, 1)).toBe(128);
    expect(greyAt(out, 2)).toBe(255);
  });
});

describe("scalePlan", () => {
  it("honours a scale that fits the pixel budget", () => {
    const plan = scalePlan(800, 600, 2);
    expect(plan).toMatchObject({ scale: 2, width: 1600, height: 1200, clamped: false });
  });

  it("clamps a request that would blow the wasm heap, and says so", () => {
    const plan = scalePlan(4000, 3000, 3);
    expect(plan.clamped).toBe(true);
    expect(plan.width * plan.height).toBeLessThanOrEqual(MAX_PIXELS);
    expect(plan.scale).toBeLessThan(3);
  });

  it("never produces a zero dimension", () => {
    const plan = scalePlan(3, 3, 0.01);
    expect(plan.width).toBeGreaterThanOrEqual(1);
    expect(plan.height).toBeGreaterThanOrEqual(1);
  });
});

describe("suggestScale", () => {
  it("boosts small pictures hardest and leaves large ones alone", () => {
    expect(suggestScale(320, 200)).toBe(3);
    expect(suggestScale(800, 600)).toBe(2);
    expect(suggestScale(1200, 900)).toBe(1.5);
    expect(suggestScale(3000, 2000)).toBe(1);
  });
});

describe("applyTune", () => {
  it("does nothing visible to a clean black-and-white page by default", () => {
    const out = applyTune(bitmap([[0, 255, 0, 255]]), DEFAULT_TUNE);
    expect([0, 1, 2, 3].map((i) => greyAt(out, i))).toEqual([0, 255, 0, 255]);
  });

  it("inverts before thresholding, so light-on-dark reads as ink on paper", () => {
    // A dark screenshot: text at 220 on a background of 30.
    const out = applyTune(bitmap([[30, 30, 220, 30]]), { ...DEFAULT_TUNE, invert: true });
    // After inverting, the text is the dark group — so it becomes the ink.
    expect(greyAt(out, 2)).toBe(0);
    expect(greyAt(out, 0)).toBe(255);
  });

  it("can be turned off entirely", () => {
    const source = bitmap([[10, 200]]);
    const out = applyTune(source, { ...DEFAULT_TUNE, grey: false, threshold: "off" });
    expect([greyAt(out, 0), greyAt(out, 1)]).toEqual([10, 200]);
  });

  it("honours a hand-set threshold over Otsu", () => {
    const out = applyTune(bitmap([[100, 150]]), { ...DEFAULT_TUNE, threshold: 200 });
    expect([greyAt(out, 0), greyAt(out, 1)]).toEqual([0, 0]);
  });
});

/* -------------------------------- export --------------------------------- */

describe("export shapes", () => {
  const result = fromPage(
    page([
      [
        { y: 0, text: "Total due" },
        { y: 24, text: "1250", confidence: 44 },
      ],
    ]),
    600,
    200,
  );

  it("rejoins prose for pasting", () => {
    expect(asParagraphs(result)).toBe("Total due 1250");
  });

  it("preserves the layout when the layout is the information", () => {
    expect(asLines(result)).toBe("Total due\n1250");
  });

  it("marks uncertain words inline, where their context is", () => {
    const review = asReview(result);
    expect(review).toContain("»1250«");
    expect(review).toContain("1 uncertain word");
    expect(review).not.toContain("»Total«");
  });

  it("says so plainly when there is nothing to check", () => {
    const clean = fromPage(page([[{ y: 0, text: "all good" }]]), 600, 200);
    expect(asReview(clean)).toContain("No uncertain words");
  });

  it("exports a row per word, tab-separated because the text has commas", () => {
    const rows = asTsv(result).split("\n");
    expect(rows[0].split("\t")).toEqual(["line", "word", "confidence", "x", "y", "width", "height"]);
    expect(rows).toHaveLength(4);
    expect(rows[3]).toContain("1250\t44.0");
  });

  it("renders every shape through one entry point", () => {
    for (const shape of ["paragraphs", "lines", "review", "tsv"] as const) {
      expect(render(result, shape).length).toBeGreaterThan(0);
    }
  });
});

describe("exportName", () => {
  it("swaps the extension and marks the shape", () => {
    expect(exportName("receipt.jpg", "paragraphs")).toBe("receipt.txt");
    expect(exportName("receipt.jpg", "lines")).toBe("receipt-lines.txt");
    expect(exportName("receipt.jpg", "tsv")).toBe("receipt-tsv.tsv");
  });

  it("copes with a name that has no extension, or none at all", () => {
    expect(exportName("scan", "paragraphs")).toBe("scan.txt");
    expect(exportName("", "paragraphs")).toBe("text.txt");
  });
});
