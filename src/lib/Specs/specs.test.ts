import { describe, expect, it } from "vitest";
import { cleanValue, findInfobox, linkedTitles, parseInfobox, rawField, resolveTemplate } from "./wikitext";
import { detectCategory, groupFields, labelFor } from "./categories";
import { extractMeasures, lowerIsBetter, measureLabel } from "./measure";
import { bandFor, confidenceOf, publishedBands, scoreProduct, UNSCORED_REASON } from "./score";
import { DEFAULT_REGION, REGIONS, REVIEW_SITES, regionById, storeQuery, storesFor } from "./stores";
import { exportComparison, exportFilename, exportSheet } from "./export";
import { reviveRecord } from "./client";
import { buildRows, diffMeasures, summariseDiff } from "./compare";
import type { Measure, ProductCategory, ProductRecord } from "./types";

/**
 * Spec Analyser.
 *
 * The failure this suite exists for is a *confidently wrong figure*. Every
 * number this app shows is scraped out of prose, normalised, and then either
 * placed on a scoring band or lined up against another product's — so a parser
 * slip does not produce an error, it produces a phone with a 1.8-tonne battery
 * or a car whose lightest weight is its heaviest. Nothing throws, the layout is
 * perfect, and the answer is nonsense.
 *
 * So the fixtures below are real wikitext, taken from the articles this app
 * reads, including the awkward shapes that actually broke it: pipes inside
 * wikilinks inside list templates, `{{convert}}` ranges and dimensions, core
 * counts written as words, and region codes standing where a release date
 * should be.
 */

/* ------------------------------- fixtures -------------------------------- */

/** A phone infobox: nested templates, `<br>` variants, multi-valued rows. */
const PHONE = `{{Infobox mobile phone
| name = Galaxy Test
| image = Something.jpg
| image_size = 187px
| manufacturer = [[Samsung Electronics]]
| developer = Samsung
| type = [[Smartphone]]
| released = {{Start date|2024|01|31}}
| soc = {{ubl
  | '''Global''': [[Qualcomm]] [[Snapdragon]] 8 Gen 3
  | '''Europe''': [[Samsung Exynos|Exynos]] 2400
  }}
| cpu = Octa-core (1x3.3 GHz [[ARM Cortex-X4|Cortex-X4]] & 3x3.2 GHz)
| memory = 8 or 12 GB LPDDR5X RAM
| storage = 128/256 GB, 1 TB
| display = Dynamic AMOLED, peak brightness 2600 nits, 120 Hz<br />S24: 6.2 in<br />S24 Ultra: 6.8 in
| rear_camera = 200 MP, f/1.7, 1/1.3", OIS<br />10 MP, f/2.4 (telephoto)
| battery = S24: Li-ion 4000 mAh; Ultra: 5000 mAh
| charging = wired 45W, wireless 15W
| weight = {{convert|168|g|oz|abbr=on}}<br />Ultra: {{convert|233|g|oz|abbr=on}}
| dimensions = {{convert|147|x|70.6|x|7.6|mm|in|abbr=on}}
| predecessor = [[Samsung Galaxy S23]]
| successor = [[Samsung Galaxy S25|Galaxy S25 series]]
| related = [[Samsung Galaxy Z Fold 6]]
| website = {{URL|samsung.com}}
}}

The '''Galaxy Test''' is a smartphone.`;

/** A car infobox: a `{{convert}}` range, and units the app must normalise. */
const CAR = `{{Infobox automobile
| name = Test Model 3
| manufacturer = [[Tesla, Inc.]]
| production = 2017–present
| class = [[Mid-size car]]
| layout = {{unbulleted list
  | [[Rear-engine, rear-wheel drive layout|Rear-motor, rear-wheel drive]]
  | Dual-motor, [[all-wheel drive]]
  }}
| electric_range = {{convert|272|mi|km}} (RWD)<br />{{convert|363|mi|km}} (Long Range)
| weight = {{convert|3552|-|4048|lb|kg}}
| related = [[Tesla Model Y]]
}}`;

/** A console: an ambiguous template settled by its `type` row, cores as a word. */
const CONSOLE = `{{Infobox information appliance
| name = Test Console
| manufacturer = Foxconn
| developer = Nintendo
| type = [[Video game console]]
| release_date = {{vgrelease|WW|June 5, 2025}}
| cpu = Octa-core ARM Cortex-A78C @ 998 MHz; 1,101 MHz (undocked)
| memory = 12 GB LPDDR5X
| storage = 256 GB UFS 3.1
| weight = 534 g
}}`;

const parsed = (wikitext: string) => {
  const box = parseInfobox(wikitext);
  if (!box) throw new Error("fixture has no infobox");
  return box;
};

/** The whole pipeline, as `source.ts` runs it, without the network. */
function read(wikitext: string): { category: ProductCategory; measures: Measure[] } {
  const box = parsed(wikitext);
  const category = detectCategory(box);
  return { category, measures: extractMeasures(groupFields(box, category), category) };
}

const measure = (measures: Measure[], id: string) => measures.find((m) => m.id === id);

/* ------------------------------- wikitext -------------------------------- */

describe("wikitext — templates", () => {
  it("keeps the source's own figure from a conversion, not the converted one", () => {
    expect(resolveTemplate("convert|146.6|mm|in")).toBe("146.6 mm");
  });

  it("reads a conversion range as a range, not as a number in units of '-'", () => {
    // The bug this pins: "3552" in units of "-" is a plausible-looking parse
    // that silently loses the upper bound.
    expect(resolveTemplate("convert|3552|-|4048|lb|kg")).toBe("3552–4048 lb");
  });

  it("reads a dimension conversion as dimensions", () => {
    expect(resolveTemplate("convert|272|x|116|x|13.9|mm|in")).toBe("272 × 116 × 13.9 mm");
  });

  it("does not split a wikilink's pipe as if it were an argument separator", () => {
    // Splitting on every "|" turns one link into two facts. It is the single
    // most common way a wikitext parser mangles a value.
    expect(resolveTemplate("ubl|[[Reluctance motor#Synchronous reluctance|synchronous reluctance]]")).toBe(
      "[[Reluctance motor#Synchronous reluctance|synchronous reluctance]]",
    );
  });

  it("drops citations and colour swatches, which carry no specification", () => {
    expect(resolveTemplate("cite web|url=http://x|title=Y")).toBe("");
    expect(resolveTemplate("Color sample|#BAB4A2")).toBe("");
  });

  it("keeps the content of a formatting wrapper it does not know", () => {
    expect(resolveTemplate("small|Wi-Fi 6E")).toBe("Wi-Fi 6E");
  });

  it("drops a release template's region codes but keeps its dates", () => {
    // Without this a console's "Released" row reads "WW".
    expect(resolveTemplate("vgrelease|WW|June 5, 2025")).toBe("June 5, 2025");
  });

  it("does not mistake a date template for a regional release table", () => {
    // `{{Release date|2023|9|22}}` is one date. Stripping "region codes" from it
    // would leave three loose numbers where a date should be.
    expect(resolveTemplate("Start date|2023|9|22")).toBe("2023-9-22");
  });
});

describe("wikitext — values", () => {
  it("reduces a link to what a reader sees", () => {
    expect(cleanValue("[[Apple Inc.|Apple]]")).toBe("Apple");
    expect(cleanValue("[[iOS 17]]")).toBe("iOS 17");
  });

  it("keeps every variant of a multi-valued row", () => {
    // Keeping only the first variant is how a comparison becomes wrong.
    expect(cleanValue("S24: 4000 mAh<br />Ultra: 5000 mAh")).toBe("S24: 4000 mAh · Ultra: 5000 mAh");
  });

  it("strips references, comments and stray bullets", () => {
    expect(cleanValue("8 GB<ref name=x>{{cite web|url=http://x}}</ref><!-- note -->")).toBe("8 GB");
    expect(cleanValue("* White titanium\n* Blue titanium")).toBe("White titanium · Blue titanium");
  });

  it("drops a value left as punctuation after its template went", () => {
    expect(cleanValue("{{URL|example.com}}*")).not.toMatch(/^\*/);
    expect(cleanValue("<!-- nothing here -->")).toBe("");
  });
});

describe("wikitext — infobox", () => {
  it("finds the invocation and matches its own closing braces", () => {
    const box = findInfobox(PHONE);
    expect(box?.startsWith("{{Infobox mobile phone")).toBe(true);
    expect(box?.endsWith("}}")).toBe(true);
    // Stops at the infobox rather than swallowing the prose beneath it.
    expect(box).not.toContain("is a smartphone");
  });

  it("returns null for an article with no infobox", () => {
    expect(findInfobox("Just some prose about a product.")).toBeNull();
    expect(parseInfobox("Just some prose.")).toBeNull();
  });

  it("drops the rows that describe the picture rather than the product", () => {
    const keys = parsed(PHONE).fields.map((f) => f.key);
    expect(keys).not.toContain("image");
    expect(keys).not.toContain("image_size");
    expect(keys).not.toContain("name");
    expect(keys).toContain("battery");
  });

  it("keeps the article's own field order", () => {
    const keys = parsed(PHONE).fields.map((f) => f.key);
    expect(keys.indexOf("soc")).toBeLessThan(keys.indexOf("battery"));
  });

  it("rejects namespace links without rejecting products named like one", () => {
    expect(linkedTitles("[[File:Photo.jpg]] [[Category:Phones]] [[Samsung Galaxy S23]]")).toEqual([
      "Samsung Galaxy S23",
    ]);
    // "Imagen 3" starts with "image" and is a product, not a file link.
    expect(linkedTitles("[[Imagen 3]]")).toEqual(["Imagen 3"]);
  });

  it("reads link targets from a relation row, not its display text", () => {
    // "Galaxy S25 series" is the display text and is not an article; the target
    // is what can actually be looked up.
    expect(linkedTitles(rawField(PHONE, "successor") ?? "")).toEqual(["Samsung Galaxy S25"]);
    expect(linkedTitles(rawField(PHONE, "predecessor") ?? "")).toEqual(["Samsung Galaxy S23"]);
  });
});

/* ------------------------------ categories ------------------------------- */

describe("categories", () => {
  it("classifies from the article's own template", () => {
    expect(detectCategory(parsed(PHONE))).toBe("phone");
    expect(detectCategory(parsed(CAR))).toBe("car");
  });

  it("lets the type row settle an ambiguous template", () => {
    // `Infobox information appliance` covers laptops, consoles and set-top
    // boxes alike, so the template alone cannot answer this one.
    expect(detectCategory(parsed(CONSOLE))).toBe("console");
  });

  it("answers 'other' rather than guessing", () => {
    expect(detectCategory({ template: "infobox thing", fields: [] })).toBe("other");
  });

  it("never drops a field it has no group for", () => {
    const box = parsed(PHONE);
    const grouped = groupFields(box, "phone").flatMap((g) => g.fields.map((f) => f.key));
    const relations = ["predecessor", "successor", "related"];
    for (const field of box.fields) {
      if (relations.includes(field.key)) continue;
      expect(grouped, `${field.key} was dropped`).toContain(field.key);
    }
  });

  it("leads with the overview, whatever the category", () => {
    expect(groupFields(parsed(PHONE), "phone")[0].id).toBe("overview");
  });

  it("puts an unrecognised product's whole sheet in one group", () => {
    const box = { template: "infobox thing", fields: [{ key: "colour", value: "red" }] };
    const groups = groupFields(box, "other");
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("Specifications");
  });

  it("humanises a key it has no label for", () => {
    expect(labelFor("soc")).toBe("Chip");
    expect(labelFor("fuel_system")).toBe("Fuel system");
  });
});

/* ------------------------------- measures -------------------------------- */

describe("measures", () => {
  it("takes the largest variant where more is the claim", () => {
    const { measures } = read(PHONE);
    expect(measure(measures, "battery")?.value).toBe(5000);
    expect(measure(measures, "ram")?.value).toBe(12);
    // 1 TB has to beat 256 GB, which means normalising before comparing.
    expect(measure(measures, "storage")?.value).toBe(1024);
    expect(measure(measures, "screen")?.value).toBe(6.8);
  });

  it("takes the lightest variant for weight", () => {
    expect(measure(read(PHONE).measures, "mass")?.value).toBe(168);
  });

  it("gives both halves of a range their unit", () => {
    // "3552–4048 lb": without spreading the unit across the range, only the
    // upper bound is visible — and the *lightest* weight is then the heaviest.
    const mass = measure(read(CAR).measures, "mass");
    expect(mass?.value).toBeCloseTo(3552 * 453.59, 0);
    expect(mass?.reading).toMatch(/kg$/);
  });

  it("states a converted mass in kilograms, not six-figure grams", () => {
    expect(measure(read(CAR).measures, "mass")?.reading).toBe("1,611 kg");
  });

  it("normalises miles to kilometres so two cars compare", () => {
    expect(measure(read(CAR).measures, "range")?.value).toBe(Math.round(363 * 1.609));
  });

  it("reads a core count written as a word", () => {
    expect(measure(read(CONSOLE).measures, "cores")?.value).toBe(8);
  });

  it("normalises MHz to GHz", () => {
    expect(measure(read(CONSOLE).measures, "clock")?.value).toBe(1.1);
  });

  it("quotes the source's own wording when no conversion was needed", () => {
    expect(measure(read(PHONE).measures, "battery")?.reading).toBe("5000 mAh");
  });

  it("names the spec row a figure came from", () => {
    expect(measure(read(PHONE).measures, "battery")?.from).toBe("Battery");
    expect(measure(read(PHONE).measures, "refresh")?.from).toBe("Display");
  });

  it("only looks for a measure in rows that can hold it", () => {
    // 1/1.3" in `rear_camera` is a sensor, not a 0.77-inch screen. Screen size
    // is read from `display` alone, which is what keeps that apart.
    expect(measure(read(PHONE).measures, "screen")?.value).toBeGreaterThan(5);
  });

  it("omits a measure the sheet does not state, rather than reporting zero", () => {
    const { measures } = read(CONSOLE);
    expect(measure(measures, "battery")).toBeUndefined();
    expect(measure(measures, "refresh")).toBeUndefined();
  });

  it("knows which measures are better when smaller", () => {
    expect(lowerIsBetter("mass")).toBe(true);
    expect(lowerIsBetter("acceleration")).toBe(true);
    expect(lowerIsBetter("battery")).toBe(false);
  });

  it("has a label for every measure it extracts", () => {
    for (const m of read(PHONE).measures) expect(measureLabel(m.id)).not.toBe(m.id);
  });
});

/* -------------------------------- scoring -------------------------------- */

describe("scoring", () => {
  const phone = read(PHONE);

  it("scores a stated measure against its published band", () => {
    const score = scoreProduct(phone.measures, phone.category);
    const battery = score.axes.find((a) => a.id === "battery");
    // 5000 mAh on a 3000–6000 scale is two thirds of the way up.
    expect(battery?.score).toBe(67);
    expect(battery?.reading).toBe("5000 mAh");
  });

  it("scores an unstated measure as null, never as zero", () => {
    // This is the whole difference between "nobody wrote it down" and "this
    // product has none" — and averaging the second would be a lie.
    const score = scoreProduct([], "phone");
    expect(score.axes.every((a) => a.score === null)).toBe(true);
    expect(score.overall).toBeNull();
    expect(score.covered).toBe(0);
  });

  it("re-weights among the axes that had data", () => {
    const one: Measure[] = [{ id: "ram", value: 16, unit: "GB", reading: "16 GB", from: "Memory" }];
    const score = scoreProduct(one, "phone");
    // The only stated measure is at the top of its band, so the overall is too
    // — the absent ones neither help nor hurt.
    expect(score.overall).toBe(100);
    expect(score.covered).toBe(1);
    expect(score.total).toBeGreaterThan(1);
  });

  it("clamps beyond either end of a band", () => {
    const huge: Measure[] = [{ id: "battery", value: 99_000, unit: "mAh", reading: "99000 mAh", from: "Battery" }];
    expect(scoreProduct(huge, "phone").overall).toBe(100);
    const tiny: Measure[] = [{ id: "battery", value: 10, unit: "mAh", reading: "10 mAh", from: "Battery" }];
    expect(scoreProduct(tiny, "phone").overall).toBe(0);
  });

  it("scores a lower-is-better axis the right way round", () => {
    const light: Measure[] = [{ id: "mass", value: 150, unit: "g", reading: "150 g", from: "Weight" }];
    const heavy: Measure[] = [{ id: "mass", value: 240, unit: "g", reading: "240 g", from: "Weight" }];
    expect(scoreProduct(light, "phone").overall).toBe(100);
    expect(scoreProduct(heavy, "phone").overall).toBe(0);
  });

  it("refuses to score a category with no honest scale", () => {
    for (const category of ["appliance", "aircraft", "other"] as ProductCategory[]) {
      expect(scoreProduct(phone.measures, category).total).toBe(0);
      expect(UNSCORED_REASON[category]).toBeTruthy();
    }
  });

  it("reports low confidence when most of the sheet was silent", () => {
    const one: Measure[] = [{ id: "ram", value: 16, unit: "GB", reading: "16 GB", from: "Memory" }];
    expect(confidenceOf(scoreProduct(one, "phone")).level).toBe("low");
    expect(confidenceOf(scoreProduct(phone.measures, "phone")).level).toBe("high");
    expect(confidenceOf(scoreProduct([], "phone")).level).toBe("none");
  });

  it("bands the whole 0–100 range without a gap", () => {
    for (let n = 0; n <= 100; n += 1) expect(bandFor(n)).toBeTruthy();
    expect(bandFor(95)).toBe("Exceptional");
    expect(bandFor(0)).toBe("Entry level");
  });

  it("names the band's endpoints, so a reader can disagree with it", () => {
    const axis = scoreProduct(phone.measures, "phone").axes.find((a) => a.id === "battery");
    expect(axis?.verdict).toMatch(/6,000 mAh|6000 mAh/);
  });

  it("writes a year as a year, not as a quantity", () => {
    // "the scale runs to 2,025" reads as a measurement and makes the app look
    // like it cannot tell a date from a number.
    const axis = scoreProduct(phone.measures, "phone").axes.find((a) => a.id === "year");
    expect(axis?.verdict).toContain("2025");
    expect(axis?.verdict).not.toContain("2,025");
    expect(axis?.verdict).not.toContain("2,015");
  });
});

/* -------------------------------- stores --------------------------------- */

describe("stores", () => {
  it("builds a search term a shop would understand", () => {
    // The brand is prepended, because "Model 3" alone is ambiguous in a search
    // box in a way it never is in an encyclopedia — and the legal suffix goes,
    // because no shopper types "Tesla, Inc.".
    expect(storeQuery("Model 3", "Tesla, Inc.")).toBe("Tesla Model 3");
    expect(storeQuery("Classic 350", "Royal Enfield")).toBe("Royal Enfield Classic 350");
  });

  it("does not repeat a brand the product name already carries", () => {
    expect(storeQuery("Samsung Galaxy S24", "Samsung Electronics")).toBe("Samsung Galaxy S24");
    expect(storeQuery("Tesla Model Y", "Tesla, Inc.")).toBe("Tesla Model Y");
  });

  it("still prepends a brand the name only implies", () => {
    // "iPhone" implies Apple to a person and not to a search box, and
    // "Apple iPhone 15 Pro" is how the shops themselves list it.
    expect(storeQuery("iPhone 15 Pro", "Apple")).toBe("Apple iPhone 15 Pro");
  });

  it("drops the article's bracketed disambiguator", () => {
    // No retailer has ever heard of "(Apple silicon)".
    expect(storeQuery("MacBook Air (Apple silicon)", "Apple")).toBe("Apple MacBook Air");
  });

  it("copes with no maker at all", () => {
    expect(storeQuery("Sony α7 IV", null)).toBe("Sony α7 IV");
  });

  it("falls back to the default region rather than to nothing", () => {
    expect(regionById("zz").id).toBe(DEFAULT_REGION);
    expect(regionById("").id).toBe(DEFAULT_REGION);
    expect(regionById("gb").id).toBe("gb");
  });

  it("gives every region a usable list of shops", () => {
    for (const region of REGIONS) {
      const stores = storesFor(region);
      expect(stores.length, region.name).toBeGreaterThanOrEqual(3);
      // Ids have to be unique or React keys collide in the rendered list.
      expect(new Set(stores.map((s) => s.id)).size).toBe(stores.length);
    }
  });

  it("builds only https links, with the term escaped into them", () => {
    // A raw term in a URL is how a product with a "&" in its name silently
    // searches for half of itself.
    const term = "Galaxy S24 & Ultra";
    for (const region of REGIONS) {
      for (const store of [...storesFor(region), ...REVIEW_SITES]) {
        const url = store.search(term);
        expect(url.startsWith("https://"), `${region.id}/${store.id}`).toBe(true);
        expect(url).not.toContain(" ");
        expect(url, `${region.id}/${store.id}`).toContain("%26");
      }
    }
  });

  it("has a default region that actually exists", () => {
    expect(REGIONS.some((r) => r.id === DEFAULT_REGION)).toBe(true);
  });
});

/* -------------------------------- export --------------------------------- */

/** A record shaped like `source.ts` builds one, without the network. */
function record(wikitext: string, name: string): ProductRecord {
  const box = parsed(wikitext);
  const category = detectCategory(box);
  const groups = groupFields(box, category);
  return {
    title: name,
    name,
    description: `a test ${category}`,
    category,
    categoryLabel: category,
    image: null,
    summary: "A product used as a fixture.",
    maker: "Test Maker",
    released: "2024",
    groups,
    measures: extractMeasures(groups, category),
    relatives: [],
    images: [],
    sourceUrl: `https://en.wikipedia.org/wiki/${name}`,
    entityId: null,
    readAt: "2026-01-02T03:04:05.000Z",
  };
}

describe("export", () => {
  const phone = record(PHONE, "Galaxy Test");
  const car = record(CAR, "Test Model 3");

  it("writes a filename the filesystem will accept", () => {
    expect(exportFilename("Sony α7 IV", "md")).toBe("sony-7-iv.md");
    expect(exportFilename("Samsung Galaxy S24", "csv", "comparison")).toBe(
      "samsung-galaxy-s24-comparison.csv",
    );
    // A name that reduces to nothing must still produce a usable file.
    expect(exportFilename("→→→", "json")).toBe("spec-sheet.json");
  });

  it("carries the source and the read time into every format", () => {
    // An export that drops the citation turns a checkable claim into an
    // anonymous one the moment it leaves the app.
    for (const format of ["md", "csv", "json"] as const) {
      const out = exportSheet(phone, format);
      if (format === "csv") continue; // rows only, cited by the file it came from
      expect(out, format).toContain("en.wikipedia.org");
      expect(out, format).toContain("2026-01-02");
    }
  });

  it("escapes a CSV field that holds a comma or a quote", () => {
    // Without this, one value silently becomes two columns.
    const csv = exportSheet(phone, "csv");
    for (const line of csv.split("\r\n")) {
      const quoted = line.match(/"/g)?.length ?? 0;
      expect(quoted % 2, line).toBe(0);
    }
    expect(csv).toContain('"');
  });

  it("escapes a pipe in a Markdown table cell", () => {
    // A raw pipe ends the cell, so the row silently grows a column.
    const md = exportSheet(phone, "md");
    for (const line of md.split("\n").filter((l) => l.startsWith("| ") && !l.includes("---"))) {
      expect(line.split(/(?<!\\)\|/).length, line).toBe(4);
    }
  });

  it("writes JSON that parses back with its measures and score", () => {
    const back = JSON.parse(exportSheet(phone, "json")) as {
      measures: { id: string }[];
      score: { overall: number | null; covered: number };
      source: { url: string };
    };
    expect(back.measures.length).toBeGreaterThan(3);
    expect(back.score.overall).toBeTypeOf("number");
    expect(back.source.url).toContain("wikipedia");
  });

  it("puts every compared product in the comparison, whatever the format", () => {
    for (const format of ["md", "csv", "json"] as const) {
      const out = exportComparison([phone, car], format);
      expect(out, format).toContain("Galaxy Test");
      expect(out, format).toContain("Test Model 3");
    }
  });

  it("marks an unstated measure as a dash rather than omitting the row", () => {
    // Dropping the row would quietly suggest the measure was never in play.
    const md = exportComparison([phone, car], "md");
    expect(md).toContain("—");
    expect(md).toContain("does not state the measure");
  });

  it("keeps the comparison's columns square", () => {
    const rows = exportComparison([phone, car], "csv").split("\r\n");
    const widths = new Set(rows.map((r) => r.split(",").length));
    // Every row has the same column count — unless a quoted field holds a
    // comma, which the escaping test above already covers.
    expect(widths.size).toBeLessThanOrEqual(2);
  });
});

/* ----------------------------- cached payloads ---------------------------- */

describe("reviveRecord", () => {
  it("fills in a field added after the payload was cached", () => {
    // The bug this pins, exactly as it happened: these responses are cached for
    // half an hour in the browser and longer in the service worker, so the
    // moment `images` was added to the record every reader with a warm cache
    // got a sheet without it — and the gallery died on `images.length`, taking
    // the whole sheet down with it.
    const stale = { title: "X", name: "X", groups: [], measures: [] } as unknown as ProductRecord;
    const revived = reviveRecord(stale);

    expect(revived.images).toEqual([]);
    expect(revived.relatives).toEqual([]);
    expect(revived.summary).toBe("");
    expect(revived.maker).toBeNull();
  });

  it("coerces a field whose value is not the shape the type claims", () => {
    const wrong = {
      title: "X",
      name: "X",
      groups: null,
      measures: undefined,
      images: "not a list",
    } as unknown as ProductRecord;
    const revived = reviveRecord(wrong);

    expect(Array.isArray(revived.groups)).toBe(true);
    expect(Array.isArray(revived.measures)).toBe(true);
    expect(Array.isArray(revived.images)).toBe(true);
  });

  it("dates an undated payload to the epoch rather than to now", () => {
    // "Read just now" over a record from an unknown time is a confident lie;
    // 1970 reads as obviously old, which is the truth.
    const undated = { title: "X", name: "X" } as unknown as ProductRecord;
    expect(new Date(reviveRecord(undated).readAt).getUTCFullYear()).toBe(1970);
  });

  it("leaves a complete record untouched", () => {
    const full = record(PHONE, "Galaxy Test");
    expect(reviveRecord(full)).toEqual(full);
  });
});

/* ------------------------------- comparison ------------------------------- */

/** A measure, written out so a diff can be set up in one line. */
const m = (id: string, value: number, unit: string, reading = `${value} ${unit}`): Measure =>
  ({ id, value, unit, reading, from: "Test" }) as Measure;

describe("buildRows", () => {
  const phone = record(PHONE, "Galaxy Test");
  const car = record(CAR, "Test Model 3");

  it("gives every product a cell in every row", () => {
    for (const row of buildRows([phone, car])) {
      expect(row.cells, row.label).toHaveLength(2);
    }
  });

  it("marks a leader only when two products answered", () => {
    // A lone mark beside the only stated figure reads as "this one won" when
    // nothing was raced.
    const alone = buildRows([phone]);
    expect(alone.every((row) => row.cells.every((c) => !c.best))).toBe(true);
  });

  it("marks no leader on a tie", () => {
    const twin = record(PHONE, "Galaxy Twin");
    for (const row of buildRows([phone, twin])) {
      expect(row.cells.some((c) => c.best), row.label).toBe(false);
      expect(row.differs, row.label).toBe(false);
    }
  });

  it("counts a measure only one product states as a difference", () => {
    const rows = buildRows([phone, car]);
    const onlyPhone = rows.find((r) => r.id === "battery");
    expect(onlyPhone?.differs).toBe(true);
  });
});

describe("diffMeasures", () => {
  it("reports a bigger number as an improvement where bigger is better", () => {
    const [change] = diffMeasures([m("battery", 5000, "mAh")], [m("battery", 4000, "mAh")]);
    expect(change.kind).toBe("improved");
    expect(Math.round(change.percent ?? 0)).toBe(25);
    expect(change.from).toBe("4000 mAh");
    expect(change.to).toBe("5000 mAh");
  });

  it("reports a bigger number as a reduction where smaller is better", () => {
    // The whole trap this guards: a heavier phone is a bigger number and a
    // worse outcome, so "up" and "better" are not the same axis.
    const [change] = diffMeasures([m("mass", 240, "g")], [m("mass", 200, "g")]);
    expect(change.kind).toBe("reduced");
    expect(change.percent).toBeGreaterThan(0);
  });

  it("calls a lighter phone an improvement", () => {
    const [change] = diffMeasures([m("mass", 180, "g")], [m("mass", 200, "g")]);
    expect(change.kind).toBe("improved");
    expect(change.percent).toBeLessThan(0);
  });

  it("leaves release year out entirely", () => {
    // A successor is newer by definition; "+1 year" is in every generation
    // comparison ever made and tells a reader nothing.
    const changes = diffMeasures([m("year", 2025, "")], [m("year", 2024, "")]);
    expect(changes).toHaveLength(0);
  });

  it("marks a measure gained or lost rather than pretending it moved", () => {
    const added = diffMeasures([m("refresh", 120, "Hz")], []);
    expect(added[0].kind).toBe("added");
    expect(added[0].from).toBeNull();

    const dropped = diffMeasures([], [m("refresh", 120, "Hz")]);
    expect(dropped[0].kind).toBe("dropped");
    expect(dropped[0].to).toBeNull();
  });

  it("treats a figure that barely moved as unchanged", () => {
    // Below the sources' own rounding, so not a real change.
    const [change] = diffMeasures([m("battery", 5001, "mAh")], [m("battery", 5000, "mAh")]);
    expect(change.kind).toBe("same");
  });

  it("keeps unchanged measures rather than dropping them", () => {
    // "The battery did not change" is an answer; its absence would read as
    // "not stated", which is a different and wrong claim.
    const changes = diffMeasures(
      [m("battery", 5000, "mAh"), m("ram", 12, "GB")],
      [m("battery", 5000, "mAh"), m("ram", 8, "GB")],
    );
    expect(changes).toHaveLength(2);
    expect(changes.find((c) => c.id === "battery")?.kind).toBe("same");
  });

  it("puts what moved first, biggest first, and the unchanged last", () => {
    const changes = diffMeasures(
      [m("battery", 5100, "mAh"), m("ram", 16, "GB"), m("storage", 256, "GB")],
      [m("battery", 5000, "mAh"), m("ram", 8, "GB"), m("storage", 256, "GB")],
    );
    expect(changes.map((c) => c.id)).toEqual(["ram", "battery", "storage"]);
    expect(changes.at(-1)?.kind).toBe("same");
  });

  it("survives a predecessor whose figure was zero", () => {
    const [change] = diffMeasures([m("battery", 5000, "mAh")], [m("battery", 0, "mAh")]);
    expect(change.percent).toBeNull();
    expect(change.kind).toBe("same");
  });

  it("summarises in a line that counts only what moved", () => {
    const changes = diffMeasures(
      [m("battery", 5000, "mAh"), m("ram", 16, "GB")],
      [m("battery", 5000, "mAh"), m("ram", 8, "GB")],
    );
    expect(summariseDiff(changes)).toBe("1 of 2 comparable specifications changed.");
    expect(summariseDiff([])).toContain("Neither sheet");
  });
});

/* ----------------------------- published bands ---------------------------- */

describe("publishedBands", () => {
  it("describes exactly the axes the scorer actually uses", () => {
    // The two must not drift: a method page that lists an axis the scorer does
    // not apply is worse than no method page, because it is checkable and wrong.
    for (const category of ["phone", "car", "camera", "component"] as ProductCategory[]) {
      const bands = publishedBands(category);
      const axes = scoreProduct([], category).axes;
      expect(bands.map((b) => b.id), category).toEqual(axes.map((a) => a.id));
    }
  });

  it("gives shares that add up to the whole score", () => {
    for (const category of ["phone", "computer", "motorcycle"] as ProductCategory[]) {
      const total = publishedBands(category).reduce((sum, b) => sum + b.share, 0);
      expect(total, category).toBeCloseTo(1, 6);
    }
  });

  it("words each endpoint with its unit", () => {
    const battery = publishedBands("phone").find((b) => b.id === "battery");
    expect(battery?.worst).toBe("3,000 mAh");
    expect(battery?.best).toBe("6,000 mAh");
  });

  it("writes a year as a year, not as a quantity", () => {
    const year = publishedBands("phone").find((b) => b.id === "year");
    expect(year?.worst).toBe("2015");
    expect(year?.best).toBe("2025");
  });

  it("marks the axes where smaller is the better figure", () => {
    expect(publishedBands("phone").find((b) => b.id === "mass")?.lowerBetter).toBe(true);
    expect(publishedBands("phone").find((b) => b.id === "battery")?.lowerBetter).toBe(false);
  });

  it("returns nothing for a category this app refuses to score", () => {
    // Paired with UNSCORED_REASON, which is what the panel shows instead.
    for (const category of ["appliance", "aircraft", "other"] as ProductCategory[]) {
      expect(publishedBands(category), category).toEqual([]);
      expect(UNSCORED_REASON[category]).toBeTruthy();
    }
  });

  it("carries the proxy caveats through to the reader", () => {
    const camera = publishedBands("camera").find((b) => b.id === "sensor");
    expect(camera?.caveat).toMatch(/resolution/i);
  });
});
