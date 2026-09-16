/**
 * The kinds of product this app lists, and what each one's sheet is made of.
 *
 * ## Why there are two provenances, and why the split falls where it does
 *
 * Every category here was probed against the live encyclopedia API — the same
 * source Spec Analyser reads — before this file was written, because "list the
 * latest products" is only answerable where something maintains an enumeration
 * of them. The answers fell into three groups, and the grouping is measurement
 * rather than taste:
 *
 *  - **A by-year list of its own.** `Mobile phones introduced in 2026` held 42
 *    articles and the 2025 one 69; `Cameras introduced in 2025` held 13;
 *    `Tablet computers introduced in 2025` held 6. Membership in one of these
 *    *is* a release date, which is the only recency signal worth trusting.
 *  - **No list of its own, but covered by the general computing one.**
 *    Laptops, graphics, processors and consoles: `Laptops introduced in 2025`,
 *    `Graphics processing units introduced in 2025` and
 *    `Video game consoles introduced in 2025` are all **empty**, while
 *    `Computer-related introductions in 2025` held 20 (the Switch 2, the
 *    GeForce RTX 50 series, RDNA 4) and the 2026 one 10 (the Steam Machine,
 *    the Steam Frame, a MacBook). Those four share it, and say so on screen —
 *    see {@link FeedSource.scope}.
 *  - **Nothing at all.** Televisions, monitors, smartwatches and headphones.
 *    `Category:Computer monitors` holds **12** pages, most of them companies
 *    and mounting standards; `Category:Television sets` holds 25, mostly
 *    picture-tube history; `Smartwatches introduced in 2025` and
 *    `Headphones introduced in 2025` are both empty. `Samsung televisions`,
 *    `LG televisions`, `Sony televisions` and `Dell monitors` **do not exist
 *    at all**, and a search for "Samsung Neo QLED television" returns the
 *    Samsung Electronics company article. The encyclopedia documents display
 *    *technology*; it does not document display *models*.
 *
 * A "latest products" app that quietly dropped TVs and monitors because its
 * one source had no data for them would be answering an easier question than
 * the one asked. So the catalogue is curated — read off each maker's own
 * published specification page, with that page linked from every sheet — and
 * the live feed runs *alongside* it for the categories that have one, so the
 * app keeps finding releases published after the snapshot was taken.
 *
 * {@link Category.feed} is what encodes that: a category with one has a live
 * half, and a category without one says so on screen rather than looking empty.
 */

import type { CategoryId } from "./types";

/**
 * How a category's newest arrivals are found live, when they can be.
 *
 * **Only ever a by-year category.** An earlier draft fell back to a standing
 * category ("Graphics cards", 142 members) for the kinds with no yearly list,
 * ordering it by the year each item's own description states. That was wrong in
 * a way worth recording, because it looked right: most of those descriptions
 * name no year at all ("GeForce RTX 50 series — Series of GPUs by Nvidia"), so
 * they sorted to the bottom and the section headed *Newly listed* led with a
 * graphics card from 2003, then one from 1995. A recency feed whose ordering
 * depends on a signal two thirds of its rows do not carry is not a recency
 * feed. A by-year category needs no such inference: membership *is* the date.
 */
export interface FeedSource {
  /**
   * An encyclopedia category enumerating this kind by year of introduction,
   * with `%Y` standing in for the year. Every name here was verified against
   * the live API and its member count recorded beside it.
   */
  yearly: string;
  /**
   * What that category actually covers, when it is broader than this tab.
   *
   * Four kinds here have no by-year list of their own and share the general
   * computing one, so a Laptops tab can show a games console. Saying so is the
   * price of using the broader list at all — an unexplained console under
   * "laptops" reads as a bug, and the same row with this line beside it reads
   * as what it is.
   */
  scope?: string;
}

export interface Category {
  id: CategoryId;
  /** Chip label. Short — these sit in a scrolling row on a phone. */
  name: string;
  /** Plural noun for prose, e.g. "12 graphics cards". */
  plural: string;
  /** One line under the chips: what this list is, and what it is not. */
  note: string;
  /**
   * How the live half finds new arrivals, or null where the source has no
   * usable enumeration — televisions, monitors, smartwatches and headphones,
   * as measured above.
   */
  feed: FeedSource | null;
  /**
   * Why there is no live half, in words a reader can weigh — required whenever
   * {@link Category.feed} is null.
   *
   * Written per category rather than as one generic line, because the reasons
   * genuinely differ: the display categories exist and are full of the wrong
   * thing, while the smartwatch and headphone by-year categories are simply
   * empty. "No data available" would flatten both into something a reader
   * cannot judge — and an empty panel with no explanation at all reads as a
   * bug, which is the worst of the three.
   */
  feedGap?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "phone",
    name: "Phones",
    plural: "phones",
    note: "Flagships and the mid-range models worth knowing about, newest first.",
    // 42 members for 2026, 69 for 2025 — the best-maintained list of the lot.
    feed: { yearly: "Mobile phones introduced in %Y" }, // 42 for 2026, 69 for 2025
  },
  {
    id: "laptop",
    name: "Laptops",
    plural: "laptops",
    note: "Current models. Where a maker ships one chassis in several chip tiers, the sheet gives the range rather than one configuration.",
    feed: {
      yearly: "Computer-related introductions in %Y", // 10 for 2026, 20 for 2025
      scope:
        "The encyclopedia files no by-year list for this kind, so these are its general computing introductions for the year — hardware of every sort, not only laptops.",
    },
  },
  {
    id: "tv",
    name: "TVs",
    plural: "televisions",
    note: "This year's flagship panels from each maker. Sizes listed are the ones the series ships in — the figures below are for the size the maker specifies them at.",
    // Nothing to read live, and it is not close: see the file header.
    feed: null,
    feedGap:
      "The open encyclopedia this half reads documents television *technology* in depth and television *models* not at all. Its “Television sets” category is 25 pages of picture-tube history, no maker has a television category of its own, and a search for a current line returns the manufacturer’s corporate article. The curated sheets above are the whole of what this app can honestly say about TVs — which is why they exist.",
  },
  {
    id: "monitor",
    name: "Monitors",
    plural: "monitors",
    note: "Desktop displays — productivity panels, and the OLEDs that now lead the gaming end.",
    // Category:Computer monitors is 12 pages, mostly companies and VESA.
    feed: null,
    feedGap:
      "The same gap as televisions. “Computer monitors” holds twelve pages upstream — mostly companies and mounting standards — and no maker has a monitor category, so there is no list of new models to read. The curated sheets above are this app’s answer for monitors.",
  },
  {
    id: "gpu",
    name: "Graphics",
    plural: "graphics cards",
    note: "Desktop graphics cards at their reference specification. Partner cards clock higher and cost more.",
    feed: {
      yearly: "Computer-related introductions in %Y", // 10 for 2026, 20 for 2025
      scope:
        "The encyclopedia files no by-year list for this kind, so these are its general computing introductions for the year — hardware of every sort, not only graphics cards.",
    },
  },
  {
    id: "cpu",
    name: "Processors",
    plural: "processors",
    note: "Desktop, laptop and phone silicon. Clock speeds are the maker's boost figures, which depend on cooling.",
    feed: {
      yearly: "Computer-related introductions in %Y", // 10 for 2026, 20 for 2025
      scope:
        "The encyclopedia files no by-year list for this kind, so these are its general computing introductions for the year — hardware of every sort, not only processors.",
    },
  },
  {
    id: "tablet",
    name: "Tablets",
    plural: "tablets",
    note: "Tablets and detachables.",
    feed: { yearly: "Tablet computers introduced in %Y" }, // 1 for 2026, 6 for 2025
  },
  {
    id: "console",
    name: "Consoles",
    plural: "consoles",
    note: "Current-generation games consoles, home and handheld.",
    feed: {
      yearly: "Computer-related introductions in %Y", // 10 for 2026, 20 for 2025
      scope:
        "The encyclopedia files no by-year list for this kind, so these are its general computing introductions for the year — hardware of every sort, not only consoles.",
    },
  },
  {
    id: "watch",
    name: "Watches",
    plural: "smartwatches",
    note: "Smartwatches and the fitness watches that compete with them.",
    feed: null,
    feedGap:
      "Unlike the displays, the category here simply does not exist: “Smartwatches introduced in 2025” is empty, so there is no by-year list to read. The general computing list is not a fair substitute — it would fill this panel with laptops — so watches are covered by the curated sheets above.",
  },
  {
    id: "audio",
    name: "Audio",
    plural: "headphones and earbuds",
    note: "Headphones and earbuds. Battery figures are the maker's, measured with noise cancelling on unless the sheet says otherwise.",
    feed: null,
    feedGap:
      "As with watches, the by-year category is empty upstream — “Headphones introduced in 2025” has no members — so there is nothing current to list. The curated sheets above are this app’s answer for audio.",
  },
  {
    id: "camera",
    name: "Cameras",
    plural: "cameras",
    note: "Mirrorless bodies. Prices are body-only unless stated.",
    feed: { yearly: "Cameras introduced in %Y" }, // 1 for 2026, 13 for 2025
  },
];

/** A category by id, falling back to the first rather than to nothing. */
export const categoryById = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

/** Human label for a category id — used wherever a sheet names its own kind. */
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  phone: "Phone",
  laptop: "Laptop",
  tv: "Television",
  monitor: "Monitor",
  gpu: "Graphics card",
  cpu: "Processor",
  tablet: "Tablet",
  console: "Games console",
  watch: "Smartwatch",
  audio: "Headphones",
  camera: "Camera",
};

/**
 * The years the live feed offers, newest first.
 *
 * Derived from the clock rather than written down, because a hard-coded list of
 * years is a recency feature with an expiry date baked into it — exactly the
 * failure this app is built to avoid. Next year is included from the moment the
 * year turns: the encyclopedia's "introduced in" categories are populated with
 * announced-but-unshipped products well before the year starts, which is
 * precisely what someone browsing "the latest" wants to see.
 */
export function feedYears(now = new Date()): number[] {
  const year = now.getUTCFullYear();
  return [year + 1, year, year - 1, year - 2];
}
