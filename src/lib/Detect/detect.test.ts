import { describe, expect, it } from "vitest";
import {
  countByLabel,
  fitSource,
  frameRate,
  iou,
  mirrorBox,
  projectBox,
  recordSeen,
  reconcile,
  summarise,
  type Box,
  type Detection,
  type TrackedDetection,
} from "./detections";
import { ALL_LABELS, countPhrase, isKnownLabel, LABEL_GROUPS, searchLabels } from "./labels";

/* ------------------------------- fixtures -------------------------------- */

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

const found = (label: string, score: number, b: Box): Detection => ({ label, score, box: b });

const tracked = (
  label: string,
  score: number,
  b: Box,
  id: string,
  missedFrames = 0,
): TrackedDetection => ({ label, score, box: b, id, missedFrames });

/* -------------------------------- geometry ------------------------------- */

describe("fitSource", () => {
  it("letterboxes a wide source into a square view", () => {
    // 1600×900 into 400×400: scaled to 400×225, with 87.5px bars above/below.
    const fit = fitSource({ width: 1600, height: 900 }, { width: 400, height: 400 });
    expect(fit.scale).toBeCloseTo(0.25);
    expect(fit.offsetX).toBeCloseTo(0);
    expect(fit.offsetY).toBeCloseTo(87.5);
  });

  it("pillarboxes a tall source", () => {
    const fit = fitSource({ width: 720, height: 1280 }, { width: 400, height: 400 });
    expect(fit.scale).toBeCloseTo(400 / 1280);
    expect(fit.offsetY).toBeCloseTo(0);
    expect(fit.offsetX).toBeGreaterThan(0);
  });

  it("uses one scale for both axes, so nothing is stretched", () => {
    const fit = fitSource({ width: 1280, height: 720 }, { width: 300, height: 700 });
    const projected = projectBox(box(0, 0, 1280, 720), fit);
    expect(projected.w / 1280).toBeCloseTo(projected.h / 720);
  });

  it("yields a zero scale rather than Infinity for a source with no frame yet", () => {
    // A <video> that has not produced a frame reports 0×0. Drawing one tick too
    // early has to produce nothing, not NaN coordinates.
    const fit = fitSource({ width: 0, height: 0 }, { width: 400, height: 300 });
    expect(fit.scale).toBe(0);
    expect(Number.isFinite(fit.offsetX)).toBe(true);
  });
});

describe("projectBox", () => {
  it("places a box at the source edge exactly at the view edge", () => {
    // The bug this guards: boxes that look right in the middle and drift the
    // nearer the edge they get, because the offset was left out.
    const source = { width: 1600, height: 900 };
    const view = { width: 400, height: 400 };
    const fit = fitSource(source, view);

    const topLeft = projectBox(box(0, 0, 10, 10), fit);
    expect(topLeft.x).toBeCloseTo(0);
    expect(topLeft.y).toBeCloseTo(87.5);

    const bottomRight = projectBox(box(1590, 890, 10, 10), fit);
    expect(bottomRight.x + bottomRight.w).toBeCloseTo(400);
    expect(bottomRight.y + bottomRight.h).toBeCloseTo(312.5);
  });
});

describe("mirrorBox", () => {
  it("reflects a box about the source's vertical centre", () => {
    expect(mirrorBox(box(10, 20, 30, 40), 100)).toEqual(box(60, 20, 30, 40));
  });

  it("is its own inverse", () => {
    const original = box(12, 8, 44, 30);
    expect(mirrorBox(mirrorBox(original, 640), 640)).toEqual(original);
  });
});

describe("iou", () => {
  it("is 1 for identical boxes and 0 for disjoint ones", () => {
    expect(iou(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1);
    expect(iou(box(0, 0, 10, 10), box(50, 50, 10, 10))).toBe(0);
  });

  it("is 0 for boxes that only touch along an edge", () => {
    expect(iou(box(0, 0, 10, 10), box(10, 0, 10, 10))).toBe(0);
  });

  it("measures partial overlap", () => {
    // Half of each box overlaps: intersection 50, union 150.
    expect(iou(box(0, 0, 10, 10), box(5, 0, 10, 10))).toBeCloseTo(50 / 150);
  });
});

/* ------------------------------ reconciling ------------------------------ */

describe("reconcile", () => {
  it("keeps the id of a thing that stayed put, so the list does not reorder", () => {
    const previous = [tracked("cup", 0.8, box(0, 0, 10, 10), "cup-1")];
    const next = reconcile(previous, [found("cup", 0.82, box(1, 1, 10, 10))]);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("cup-1");
    expect(next[0].missedFrames).toBe(0);
    expect(next[0].score).toBeCloseTo(0.82);
  });

  it("holds a thing the model lost for a frame, then drops it", () => {
    // The flicker fix: a cup sitting still drops out for a frame or two as its
    // score crosses the threshold, and an overlay that believes every frame
    // strobes.
    let state = [tracked("cup", 0.8, box(0, 0, 10, 10), "cup-1")];
    for (const expected of [1, 2, 3]) {
      state = reconcile(state, [], { keepForFrames: 3 });
      expect(state).toHaveLength(1);
      expect(state[0].missedFrames).toBe(expected);
    }
    expect(reconcile(state, [], { keepForFrames: 3 })).toHaveLength(0);
  });

  it("does not let a new label inherit the box of one that left", () => {
    const previous = [tracked("person", 0.9, box(0, 0, 40, 80), "person-1")];
    const next = reconcile(previous, [found("chair", 0.7, box(0, 0, 40, 80))]);
    const chair = next.find((d) => d.label === "chair");
    expect(chair?.id).not.toBe("person-1");
    // The person is held over the gap rather than replaced outright.
    expect(next.find((d) => d.label === "person")?.missedFrames).toBe(1);
  });

  it("keeps two same-label things apart instead of swapping their ids", () => {
    const previous = [
      tracked("cup", 0.9, box(0, 0, 10, 10), "left"),
      tracked("cup", 0.8, box(100, 0, 10, 10), "right"),
    ];
    const next = reconcile(previous, [
      found("cup", 0.85, box(101, 1, 10, 10)),
      found("cup", 0.88, box(1, 0, 10, 10)),
    ]);
    const byId = new Map(next.map((d) => [d.id, d.box.x]));
    expect(byId.get("left")).toBeLessThan(50);
    expect(byId.get("right")).toBeGreaterThan(50);
  });

  it("gives each unmatched detection its own id", () => {
    const next = reconcile([], [found("cup", 0.9, box(0, 0, 10, 10)), found("cup", 0.8, box(50, 0, 10, 10))]);
    expect(new Set(next.map((d) => d.id)).size).toBe(2);
  });

  it("puts things being seen now ahead of things being held", () => {
    const previous = [tracked("cup", 0.99, box(0, 0, 10, 10), "cup-1")];
    const next = reconcile(previous, [found("book", 0.6, box(80, 80, 10, 10))]);
    expect(next[0].label).toBe("book");
    expect(next[1].missedFrames).toBe(1);
  });
});

/* ------------------------------- summarising ----------------------------- */

describe("summarise", () => {
  it("says nothing was found when nothing was", () => {
    expect(summarise([])).toBe("Nothing recognised");
  });

  it("counts and pluralises", () => {
    const text = summarise([
      found("person", 0.9, box(0, 0, 1, 1)),
      found("person", 0.8, box(2, 0, 1, 1)),
      found("laptop", 0.7, box(4, 0, 1, 1)),
    ]);
    expect(text).toBe("2 people and 1 laptop");
  });

  it("joins three or more with commas and a final and", () => {
    const text = summarise([
      found("cup", 0.9, box(0, 0, 1, 1)),
      found("cup", 0.9, box(2, 0, 1, 1)),
      found("cup", 0.9, box(4, 0, 1, 1)),
      found("book", 0.8, box(6, 0, 1, 1)),
      found("book", 0.8, box(8, 0, 1, 1)),
      found("chair", 0.7, box(10, 0, 1, 1)),
    ]);
    expect(text).toBe("3 cups, 2 books and 1 chair");
  });

  it("is stable between frames that found the same things", () => {
    // Announced through an aria-live region; a sentence that reorders itself
    // while nothing has changed is worse than no announcement at all.
    const a = [found("book", 0.4, box(0, 0, 1, 1)), found("cup", 0.9, box(2, 0, 1, 1))];
    const b = [found("cup", 0.7, box(2, 0, 1, 1)), found("book", 0.99, box(0, 0, 1, 1))];
    expect(summarise(a)).toBe(summarise(b));
  });
});

describe("countByLabel", () => {
  it("groups by label", () => {
    const counts = countByLabel([
      found("dog", 0.9, box(0, 0, 1, 1)),
      found("dog", 0.8, box(2, 0, 1, 1)),
      found("cat", 0.7, box(4, 0, 1, 1)),
    ]);
    expect(counts.get("dog")).toBe(2);
    expect(counts.get("cat")).toBe(1);
  });
});

/* --------------------------------- tally --------------------------------- */

describe("recordSeen", () => {
  it("records the peak in one frame, never a running total", () => {
    // Ten frames a second means a cup left on a desk would otherwise tally into
    // the hundreds. The peak is the figure that answers "how many were there?".
    let tally = recordSeen([], [found("cup", 0.9, box(0, 0, 1, 1))], 1_000);
    tally = recordSeen(
      tally,
      [found("cup", 0.7, box(0, 0, 1, 1)), found("cup", 0.6, box(4, 0, 1, 1))],
      2_000,
    );
    tally = recordSeen(tally, [found("cup", 0.5, box(0, 0, 1, 1))], 3_000);
    expect(tally).toHaveLength(1);
    expect(tally[0].most).toBe(2);
  });

  it("keeps the best confidence ever reached", () => {
    let tally = recordSeen([], [found("dog", 0.61, box(0, 0, 1, 1))], 1_000);
    tally = recordSeen(tally, [found("dog", 0.94, box(0, 0, 1, 1))], 2_000);
    tally = recordSeen(tally, [found("dog", 0.52, box(0, 0, 1, 1))], 3_000);
    expect(tally[0].best).toBeCloseTo(0.94);
  });

  it("leaves the tally alone on an empty frame", () => {
    const tally = recordSeen([], [found("dog", 0.9, box(0, 0, 1, 1))], 1_000);
    expect(recordSeen(tally, [], 2_000)).toEqual(tally);
  });

  it("orders by most recently seen", () => {
    let tally = recordSeen([], [found("dog", 0.9, box(0, 0, 1, 1))], 1_000);
    tally = recordSeen(tally, [found("cat", 0.9, box(0, 0, 1, 1))], 2_000);
    expect(tally.map((e) => e.label)).toEqual(["cat", "dog"]);
  });
});

describe("frameRate", () => {
  it("is null until there are two timestamps", () => {
    expect(frameRate([])).toBeNull();
    expect(frameRate([1_000])).toBeNull();
  });

  it("averages over the window", () => {
    expect(frameRate([0, 100, 200, 300, 400])).toBeCloseTo(10);
  });

  it("is null for a window with no elapsed time", () => {
    expect(frameRate([500, 500])).toBeNull();
  });
});

/* ------------------------------- vocabulary ------------------------------ */

describe("the vocabulary", () => {
  it("is the eighty COCO classes, with no duplicates", () => {
    expect(ALL_LABELS).toHaveLength(80);
    expect(new Set(ALL_LABELS).size).toBe(80);
  });

  it("knows what it can and cannot recognise", () => {
    expect(isKnownLabel("person")).toBe(true);
    expect(isKnownLabel("  Cell Phone ")).toBe(true);
    // The question the app exists to answer honestly.
    expect(isKnownLabel("keys")).toBe(false);
    expect(isKnownLabel("face")).toBe(false);
  });

  it("gives every group a name and at least one label", () => {
    for (const group of LABEL_GROUPS) {
      expect(group.name.length).toBeGreaterThan(0);
      expect(group.labels.length).toBeGreaterThan(0);
    }
  });
});

describe("searchLabels", () => {
  it("returns everything for an empty query", () => {
    expect(searchLabels("  ").flatMap((g) => g.labels)).toHaveLength(80);
  });

  it("matches a label", () => {
    expect(searchLabels("phone").flatMap((g) => g.labels)).toEqual(["cell phone"]);
  });

  it("matches a group name, so a category question gets the category", () => {
    const animals = searchLabels("animals");
    expect(animals).toHaveLength(1);
    expect(animals[0].labels).toContain("giraffe");
  });

  it("returns nothing for something the model was never trained on", () => {
    expect(searchLabels("keys")).toEqual([]);
  });
});

describe("countPhrase", () => {
  it("leaves a single thing singular", () => {
    expect(countPhrase("person", 1)).toBe("1 person");
  });

  it("handles the irregulars in the vocabulary", () => {
    expect(countPhrase("person", 3)).toBe("3 people");
    expect(countPhrase("mouse", 2)).toBe("2 mice");
    expect(countPhrase("sheep", 4)).toBe("4 sheep");
    expect(countPhrase("scissors", 2)).toBe("2 scissors");
  });

  it("adds -es after a sibilant", () => {
    expect(countPhrase("bus", 2)).toBe("2 buses");
    expect(countPhrase("couch", 2)).toBe("2 couches");
    expect(countPhrase("sandwich", 3)).toBe("3 sandwiches");
  });

  it("adds a plain -s otherwise", () => {
    expect(countPhrase("laptop", 2)).toBe("2 laptops");
    expect(countPhrase("traffic light", 5)).toBe("5 traffic lights");
  });
});
