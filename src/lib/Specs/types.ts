/**
 * Spec Analyser's data model: what "a product" is once it has been read off an
 * encyclopedia article and turned into something comparable.
 *
 * The shapes here are deliberately honest about provenance. Every value the app
 * shows is either quoted from the source article ({@link SpecField.value}) or
 * derived from it by code in this folder ({@link Measure}, {@link ScoreAxis}) —
 * there is no third category of fact that the app made up. That distinction is
 * carried in the types so the UI can render the two differently, which is the
 * only reason a spec-derived score is defensible at all.
 */

/**
 * The kind of thing a product is. Decided from the source article's infobox
 * template (see `categories.ts`), because that is the one signal the article
 * itself is explicit about — a phone article uses `Infobox mobile phone`, a car
 * uses `Infobox automobile`, and neither is a guess.
 *
 * `other` is a real answer, not a failure: plenty of products have an article
 * and no template this app knows, and showing their specs unscored is better
 * than forcing them into the wrong bands.
 */
export type ProductCategory =
  | "phone"
  | "computer"
  | "console"
  | "camera"
  | "audio"
  | "wearable"
  | "component"
  | "appliance"
  | "car"
  | "motorcycle"
  | "aircraft"
  | "other";

/** One specification, as the article states it. */
export interface SpecField {
  /** Normalised infobox key — the id the rest of the app refers to it by. */
  key: string;
  /** Human label for the row, e.g. `rear_camera` → "Rear camera". */
  label: string;
  /**
   * The cleaned value. Multi-value specs (a phone sold in three sizes, a car
   * with four engines) keep every variant, joined with " · ", because dropping
   * all but the first is how a comparison quietly becomes wrong.
   */
  value: string;
}

/** A titled run of related specs — one card on the sheet. */
export interface SpecGroup {
  id: string;
  title: string;
  fields: SpecField[];
}

/** Another product this one's article explicitly points at. */
export interface RelatedProduct {
  /** Source-article title — the id a lookup is keyed by. */
  title: string;
  /** How the article frames it: the one it replaced, replaces, or sits beside. */
  relation: "predecessor" | "successor" | "related" | "sibling";
  /** One-line description, when the source has one. */
  description?: string;
  /** Small square image, when the source has one. */
  image?: string;
}

/** A number with a unit, pulled out of the spec text for scoring/comparison. */
export interface Measure {
  id: MeasureId;
  /** Normalised to the measure's canonical unit (see `measure.ts`). */
  value: number;
  unit: string;
  /** How it reads on the sheet, e.g. "5000 mAh" — shown instead of the number. */
  reading: string;
  /** The spec field it was read out of, so a reader can check the app's work. */
  from: string;
}

/**
 * The quantities this app knows how to read. Kept as a closed union so a scoring
 * band can only ever be written against a measure that something extracts.
 */
export type MeasureId =
  | "battery"
  | "batteryLife"
  | "ram"
  | "storage"
  | "screen"
  | "refresh"
  | "brightness"
  | "camera"
  | "mass"
  | "charge"
  | "cores"
  | "clock"
  | "sensor"
  | "power"
  | "range"
  | "topSpeed"
  | "acceleration"
  | "displacement"
  | "fuel"
  | "seats"
  | "year";

/** Who made it, when it arrived, what it is — the head of the sheet. */
export interface ProductIdentity {
  /** Source-article title. Stable, and the id every lookup is keyed by. */
  title: string;
  /** Display name — the article's own title, tidied. */
  name: string;
  /** One line, e.g. "2023 smartphone by Apple". */
  description: string;
  category: ProductCategory;
  /** Human name for the category, e.g. "Smartphone". */
  categoryLabel: string;
  /** Square-ish thumbnail, or null when the article has no free image. */
  image: string | null;
}

/** Everything the app knows about one product. */
export interface ProductRecord extends ProductIdentity {
  /** The article's opening paragraph — context the spec rows can't carry. */
  summary: string;
  maker: string | null;
  released: string | null;
  groups: SpecGroup[];
  measures: Measure[];
  relatives: RelatedProduct[];
  /** Every usable picture on the source article, largest first. */
  images: ProductImage[];
  /** Where this came from, so every claim on the sheet is checkable. */
  sourceUrl: string;
  /** Wikidata entity id, when the article has one. */
  entityId: string | null;
  /** When this record was read. Rendered as "as of …" on the sheet. */
  readAt: string;
}

/**
 * One picture of the product, from the source article's own media.
 *
 * `thumb` and `full` are separate because they serve different jobs: a gallery
 * of eight 4000-pixel photographs would be tens of megabytes on a phone, and a
 * 220-pixel thumbnail is useless once someone taps to look properly.
 */
export interface ProductImage {
  /** File title — stable, and the gallery's key. */
  title: string;
  /** Scaled for the gallery strip. */
  thumb: string;
  /** Full resolution, for opening in a new tab. */
  full: string;
  width: number;
  height: number;
  /** The file's own page, which carries its author and licence. */
  creditUrl: string;
}

/** A candidate from a search — enough to choose from, not a full sheet. */
export interface ProductHit {
  title: string;
  name: string;
  description: string;
  image: string | null;
}

/** One dimension a product is scored on. */
export interface ScoreAxis {
  id: MeasureId;
  label: string;
  /** What the sheet said, e.g. "5000 mAh" — null when it didn't say. */
  reading: string | null;
  /** 0–100, or null when the sheet doesn't state the measure. */
  score: number | null;
  /** Share of the overall score this axis carries, within its category. */
  weight: number;
  /** Plain-language reading of the band it landed in. */
  verdict: string;
  /** Which spec row the number came from. */
  from: string | null;
}

/**
 * A product's spec score.
 *
 * `covered` / `total` is not decoration — it is the score's own confidence, and
 * the UI leads with it. An article that states two of a phone's seven measures
 * can still produce an `overall`, and that number deserves to be read very
 * differently from one backed by all seven.
 */
export interface ProductScore {
  /** Weighted mean of the axes that had data. Null when none did. */
  overall: number | null;
  /** Plain-language band for `overall`, e.g. "Strong". */
  band: string;
  axes: ScoreAxis[];
  covered: number;
  total: number;
}

/** A rating the user typed themselves, kept on this device only. */
export interface OwnRating {
  /** Source-article title of the product rated. */
  title: string;
  /** Display name, stored alongside so the list reads without a lookup. */
  name: string;
  /** 1–5. */
  stars: number;
  note: string;
  /** ISO timestamp of the last edit. */
  at: string;
}
