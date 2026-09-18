/**
 * The eighty things this app can recognise, and nothing else.
 *
 * This list is the most important honest thing in the app. A camera pointed at
 * the world *looks* like it can see anything, so the first question after the
 * novelty wears off is always "why didn't it find my keys?" — and the answer is
 * never "bad lighting". It is that `keys` is not one of the eighty categories
 * the model was trained on, and no amount of better aiming will make it one.
 *
 * So the vocabulary ships as data rather than living inside the model: the app
 * can show it, search it, and say plainly what it will never find. The grouping
 * is ours — COCO itself is a flat list of eighty strings in an arbitrary order,
 * which is unreadable as a reference — but every name is verbatim from the
 * model, because a renamed label would be a label the detector never returns.
 *
 * Pure data. No imports, no runtime cost beyond the strings.
 */

/** One named family of labels, as the vocabulary is shown to a reader. */
export interface LabelGroup {
  /** What this family is called on screen. Ours, not the model's. */
  name: string;
  /** Model labels, exactly as `detect()` returns them. */
  labels: readonly string[];
}

/**
 * The COCO vocabulary, grouped for reading.
 *
 * Ordered roughly by how often a phone camera actually meets them: people and
 * vehicles first, the long tail of kitchen drawers and sports equipment last.
 */
export const LABEL_GROUPS: readonly LabelGroup[] = [
  { name: "People", labels: ["person"] },
  {
    name: "Vehicles",
    labels: ["bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat"],
  },
  {
    name: "On the street",
    labels: ["traffic light", "fire hydrant", "stop sign", "parking meter", "bench"],
  },
  {
    name: "Animals",
    labels: ["bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"],
  },
  {
    name: "Carried and worn",
    labels: ["backpack", "umbrella", "handbag", "tie", "suitcase"],
  },
  {
    name: "Screens and devices",
    labels: ["tv", "laptop", "mouse", "remote", "keyboard", "cell phone"],
  },
  {
    name: "Furniture",
    labels: ["chair", "couch", "potted plant", "bed", "dining table", "toilet"],
  },
  {
    name: "Kitchen things",
    labels: ["bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl"],
  },
  {
    name: "Appliances",
    labels: ["microwave", "oven", "toaster", "sink", "refrigerator"],
  },
  {
    name: "Food",
    labels: [
      "banana",
      "apple",
      "sandwich",
      "orange",
      "broccoli",
      "carrot",
      "hot dog",
      "pizza",
      "donut",
      "cake",
    ],
  },
  {
    name: "Sport",
    labels: [
      "frisbee",
      "skis",
      "snowboard",
      "sports ball",
      "kite",
      "baseball bat",
      "baseball glove",
      "skateboard",
      "surfboard",
      "tennis racket",
    ],
  },
  {
    name: "Odds and ends",
    labels: ["book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"],
  },
] as const;

/** Every label the detector can return, flattened. Exactly eighty. */
export const ALL_LABELS: readonly string[] = LABEL_GROUPS.flatMap((g) => g.labels);

/** Whether a name is one of the eighty — used to answer "will it find my X?". */
export const isKnownLabel = (name: string): boolean =>
  ALL_LABELS.includes(name.trim().toLowerCase());

/**
 * Filter the vocabulary by a typed query, keeping the grouping.
 *
 * Matches on the group name too, so "food" returns the food family rather than
 * nothing — the reader searching the list is usually asking a category question
 * ("does it do animals?"), not a label question.
 */
export function searchLabels(query: string): LabelGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...LABEL_GROUPS];
  return LABEL_GROUPS.flatMap((group) => {
    if (group.name.toLowerCase().includes(q)) return [group];
    const labels = group.labels.filter((l) => l.includes(q));
    return labels.length ? [{ name: group.name, labels }] : [];
  });
}

/**
 * An English plural for a label, for the counts line.
 *
 * Deliberately a small table plus `+s` rather than a pluralisation library: the
 * whole input domain is eighty known strings, and the only irregulars in it are
 * the five below. Anything a library would add here is dead weight (rule #1's
 * other half — a dependency has to earn its bytes).
 */
const IRREGULAR: Record<string, string> = {
  person: "people",
  mouse: "mice",
  sheep: "sheep",
  skis: "skis",
  scissors: "scissors",
  broccoli: "broccoli",
};

/** `2 people`, `1 laptop`, `3 cups` — the phrase, count included. */
export function countPhrase(label: string, count: number): string {
  if (count === 1) return `1 ${label}`;
  const plural = IRREGULAR[label] ?? (/(s|x|z|ch|sh)$/.test(label) ? `${label}es` : `${label}s`);
  return `${count} ${plural}`;
}
