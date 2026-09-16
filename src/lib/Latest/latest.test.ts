import { describe, expect, it } from "vitest";
import {
  allProducts,
  brandsWithProducts,
  CATALOG_SIZE,
  productById,
  productsByBrand,
  productsByCategory,
  searchCatalog,
} from "./catalog";
import { CATEGORIES, categoryById, CATEGORY_LABELS, feedYears } from "./categories";
import { brandById, BRANDS } from "./brands";
import { ageLabel, priceLabel, releaseLabel, releaseYear, reviewedLabel, sourceHost } from "./format";
import { CATALOG_REVIEWED } from "./types";
import type { CategoryId } from "./types";

/**
 * Latest Tech.
 *
 * The failures this suite exists for are the ones a hand-maintained catalogue
 * actually suffers, none of which throw:
 *
 *  - **A list that is not newest-first.** The single property the whole app is
 *    named for, and the one that fails invisibly — a list sorted by insertion
 *    order looks exactly like a list sorted by date.
 *  - **A record that quietly lost its provenance.** A product with no source
 *    link, an empty spec sheet, or a release date in a format the formatter
 *    cannot read, renders as a perfectly tidy sheet that cannot be checked.
 *  - **A date that is off by one month or one timezone.** `new Date("2025-09")`
 *    parses as UTC, so everyone west of Greenwich would see August. That is a
 *    whole timezone's worth of wrong dates and no error anywhere.
 *  - **A dangling reference.** A product naming a brand that is not in the
 *    table, or a category with no products behind its chip.
 */

/* ------------------------------ the catalogue ----------------------------- */

describe("catalogue integrity", () => {
  const products = allProducts();

  it("holds every product exactly once, under a unique id", () => {
    const ids = products.map((p) => p.id);
    expect(ids.length).toBe(CATALOG_SIZE);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every product a source to check it against", () => {
    for (const product of products) {
      expect(product.source, `${product.id} has no source`).toMatch(/^https:\/\//);
    }
  });

  it("gives every product a non-empty spec sheet with non-empty rows", () => {
    for (const product of products) {
      expect(product.specs.length, `${product.id} has no spec groups`).toBeGreaterThan(0);

      for (const group of product.specs) {
        expect(group.title.trim(), `${product.id} has an untitled group`).not.toBe("");
        expect(group.items.length, `${product.id}/${group.title} is empty`).toBeGreaterThan(0);

        for (const item of group.items) {
          expect(item.label.trim(), `${product.id}/${group.title} has an unlabelled row`).not.toBe("");
          expect(item.value.trim(), `${product.id}/${item.label} has no value`).not.toBe("");
        }
      }
    }
  });

  it("gives every product at least two highlights and a summary", () => {
    for (const product of products) {
      expect(product.summary.trim(), `${product.id} has no summary`).not.toBe("");
      expect(product.highlights.length, `${product.id} has too few highlights`).toBeGreaterThanOrEqual(2);
    }
  });

  it("dates every product as YYYY-MM, which is what the sort depends on", () => {
    for (const product of products) {
      expect(product.released, `${product.id} has a malformed date`).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
  });

  it("names only brands that exist in the brand table", () => {
    const known = new Set(BRANDS.map((b) => b.id));
    for (const product of products) {
      expect(known.has(product.brandId), `${product.id} names unknown brand ${product.brandId}`).toBe(true);
    }
  });

  it("names only categories the app knows how to draw", () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    for (const product of products) {
      expect(known.has(product.category), `${product.id} has unknown category`).toBe(true);
    }
  });

  it("prices in whole dollars, or states no list price at all", () => {
    for (const product of products) {
      if (product.priceUsd === null) continue;
      expect(Number.isInteger(product.priceUsd), `${product.id} has a fractional price`).toBe(true);
      expect(product.priceUsd).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------- ordering -------------------------------- */

describe("ordering — the property the app is named for", () => {
  it("returns every product newest first", () => {
    const dates = allProducts().map((p) => p.released);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  it("orders each category newest first", () => {
    for (const category of CATEGORIES) {
      const dates = productsByCategory(category.id).map((p) => p.released);
      expect(dates, `${category.id} is out of order`).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
    }
  });

  it("orders each brand's products newest first", () => {
    for (const brand of brandsWithProducts()) {
      const dates = productsByBrand(brand.id).map((p) => p.released);
      expect(dates, `${brand.id} is out of order`).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
    }
  });

  it("breaks ties by name, so adding a product cannot reshuffle unrelated rows", () => {
    const products = allProducts();
    for (let i = 1; i < products.length; i += 1) {
      const before = products[i - 1];
      const after = products[i];
      if (before.released !== after.released) continue;
      expect(before.name.localeCompare(after.name)).toBeLessThanOrEqual(0);
    }
  });
});

/* ------------------------------- categories ------------------------------- */

describe("categories", () => {
  it("labels every category id", () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category.id]).toBeTruthy();
    }
  });

  it("has products behind every category chip", () => {
    for (const category of CATEGORIES) {
      expect(productsByCategory(category.id).length, `${category.id} would render empty`).toBeGreaterThan(0);
    }
  });

  it("covers the kinds the app promises on its own tab bar", () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const promised of ["phone", "laptop", "tv", "monitor", "gpu"] as CategoryId[]) {
      expect(ids.has(promised)).toBe(true);
    }
  });

  it("falls back to a real category rather than undefined", () => {
    expect(categoryById("no-such-kind").id).toBe(CATEGORIES[0].id);
    expect(categoryById("").id).toBe(CATEGORIES[0].id);
  });

  it("gives the kinds nothing enumerates no live feed at all", () => {
    for (const id of ["tv", "monitor", "watch", "audio"] as CategoryId[]) {
      expect(categoryById(id).feed, `${id} should have no feed`).toBeNull();
    }
  });

  it("explains every missing feed, so an empty panel never reads as a bug", () => {
    for (const category of CATEGORIES) {
      if (category.feed !== null) continue;
      expect(category.feedGap?.trim(), `${category.id} has no feedGap`).toBeTruthy();
    }
  });

  it("only ever feeds from a by-year category — the fix for the 1995-graphics-card bug", () => {
    // A standing category ("Graphics cards") was ordered by the year each item's
    // description happened to state. Most state none, so they sank, and a list
    // headed "Newly listed" opened with a card from 2003. Membership in a
    // by-year category is the date, and needs no such inference.
    for (const category of CATEGORIES) {
      if (!category.feed) continue;
      expect(category.feed.yearly, `${category.id} has no yearly source`).toBeTruthy();
      expect(category.feed.yearly, `${category.id} would never substitute the year`).toContain("%Y");
    }
  });

  it("declares a scope wherever the feed is broader than its own tab", () => {
    // Four kinds share the general computing list, so a Laptops tab can show a
    // console. Each must say so, or the row reads as a bug.
    const shared = CATEGORIES.filter((c) => c.feed?.yearly.startsWith("Computer-related"));
    expect(shared.length).toBeGreaterThan(0);
    for (const category of shared) {
      expect(category.feed?.scope?.trim(), `${category.id} borrows a list without saying so`).toBeTruthy();
    }
  });
});

describe("feedYears", () => {
  it("leads with next year, so an announced product is findable before it ships", () => {
    expect(feedYears(new Date("2026-09-16T00:00:00Z"))).toEqual([2027, 2026, 2025, 2024]);
  });

  it("is derived from the clock rather than written down", () => {
    const later = feedYears(new Date("2031-01-02T00:00:00Z"));
    expect(later).toEqual([2032, 2031, 2030, 2029]);
  });
});

/* --------------------------------- brands --------------------------------- */

describe("brands", () => {
  it("lists only brands that have products, so no chip opens onto nothing", () => {
    for (const brand of brandsWithProducts()) {
      expect(brand.count, `${brand.id} claims products it does not have`).toBeGreaterThan(0);
      expect(productsByBrand(brand.id).length).toBe(brand.count);
    }
  });

  it("orders makers by range, widest first", () => {
    const counts = brandsWithProducts().map((b) => b.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("reports each brand's categories without duplicates", () => {
    for (const brand of brandsWithProducts()) {
      expect(new Set(brand.categories).size).toBe(brand.categories.length);
    }
  });

  it("falls back to a usable brand rather than undefined", () => {
    const unknown = brandById("not-a-brand");
    expect(unknown.id).toBe("not-a-brand");
    expect(unknown.name).toBe("Not-a-brand");
  });
});

/* --------------------------------- lookup --------------------------------- */

describe("productById", () => {
  it("finds a product and attaches its brand", () => {
    const first = allProducts()[0];
    const found = productById(first.id);
    expect(found?.id).toBe(first.id);
    expect(found?.brand.name).toBe(brandById(first.brandId).name);
  });

  it("returns null for an id that no longer exists, rather than throwing", () => {
    expect(productById("retired-product")).toBeNull();
    expect(productById("")).toBeNull();
  });
});

describe("searchCatalog", () => {
  it("ignores a query too short to mean anything", () => {
    expect(searchCatalog("")).toEqual([]);
    expect(searchCatalog("a")).toEqual([]);
    expect(searchCatalog("   ")).toEqual([]);
  });

  it("matches a maker's name", () => {
    const hits = searchCatalog("apple");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((p) => p.brandId === "apple" || /apple/i.test(p.name + p.summary))).toBe(true);
  });

  it("matches a product name case-insensitively", () => {
    expect(searchCatalog("IPHONE").length).toBeGreaterThan(0);
    expect(searchCatalog("iphone").length).toBeGreaterThan(0);
  });

  it("returns results in the catalogue's own newest-first order", () => {
    const dates = searchCatalog("a").concat(searchCatalog("apple")).map((p) => p.released);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });

  it("finds nothing for a term no product carries", () => {
    expect(searchCatalog("zzzznotathing")).toEqual([]);
  });
});

/* -------------------------------- formatting ------------------------------ */

describe("releaseLabel", () => {
  it("reads a YYYY-MM as a month and a year", () => {
    expect(releaseLabel("2025-09")).toMatch(/September/);
    expect(releaseLabel("2025-09")).toMatch(/2025/);
  });

  it("does not slip a month backwards west of Greenwich", () => {
    // The bug this guards: new Date("2025-01") is UTC midnight on the 1st, which
    // is 31 December in every timezone behind UTC. Every January release would
    // read as December of the previous year — for a whole hemisphere.
    expect(releaseLabel("2025-01")).toMatch(/January/);
    expect(releaseLabel("2025-01")).toMatch(/2025/);
    expect(releaseLabel("2025-01")).not.toMatch(/December|2024/);
  });

  it("hands back anything it cannot parse rather than inventing a date", () => {
    expect(releaseLabel("soon")).toBe("soon");
    expect(releaseLabel("")).toBe("");
  });
});

describe("releaseYear", () => {
  it("takes just the year", () => {
    expect(releaseYear("2025-09")).toBe("2025");
  });
});

describe("ageLabel", () => {
  const now = new Date(2026, 8, 16); // September 2026, local time

  it("says this month rather than zero months", () => {
    expect(ageLabel("2026-09", now)).toBe("This month");
  });

  it("says last month rather than 1 month ago", () => {
    expect(ageLabel("2026-08", now)).toBe("Last month");
  });

  it("counts months under a year", () => {
    expect(ageLabel("2026-01", now)).toBe("8 months ago");
  });

  it("switches to years once past twelve months, so nobody does the arithmetic", () => {
    expect(ageLabel("2025-09", now)).toBe("1 year ago");
    expect(ageLabel("2024-09", now)).toBe("2 years ago");
    expect(ageLabel("2024-11", now)).toBe("1 yr 10 mo ago");
  });

  it("does not claim an unreleased product is old", () => {
    expect(ageLabel("2027-01", now)).toBe("Not yet released");
  });

  it("says nothing for a date it cannot read", () => {
    expect(ageLabel("soon", now)).toBe("");
  });
});

describe("priceLabel", () => {
  it("always says 'from', because every product has cheaper configurations", () => {
    expect(priceLabel(1199)).toBe("From $1,199");
    expect(priceLabel(249)).toBe("From $249");
  });

  it("treats no list price as a real answer, not a missing one", () => {
    expect(priceLabel(null)).toBe("No list price");
  });
});

describe("sourceHost", () => {
  it("shows where a link actually goes, without the www", () => {
    expect(sourceHost("https://www.apple.com/iphone-17-pro/specs/")).toBe("apple.com");
    expect(sourceHost("https://rog.asus.com/monitors/spec/")).toBe("rog.asus.com");
  });

  it("hands back anything that is not a URL rather than throwing", () => {
    expect(sourceHost("not a url")).toBe("not a url");
  });
});

describe("reviewedLabel", () => {
  it("reads the catalogue's own review date", () => {
    expect(reviewedLabel(CATALOG_REVIEWED)).toMatch(/2026/);
  });

  it("is a date the app can actually parse", () => {
    expect(CATALOG_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(reviewedLabel(CATALOG_REVIEWED)).not.toBe(CATALOG_REVIEWED);
  });
});
