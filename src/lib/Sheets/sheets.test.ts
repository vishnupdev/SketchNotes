import { describe, expect, it } from "vitest";
import {
  escapeField,
  inferType,
  parseDate,
  parseNumber,
  parseRows,
  parseSheet,
  sniffDelimiter,
  toCsv,
  toJson,
  toMarkdown,
} from "./csv";
import { formatNumber, summarize } from "./stats";
import { applyView, compareCells, EMPTY_VIEW, nextSort, opsFor } from "./view";
import { buildSeries, fraction, MAX_BARS, niceScale, tickLabel } from "./chart";

/**
 * Sheets.
 *
 * Every failure this suite guards against produces a *plausible* table rather
 * than an error: a quoted comma that splits a column, a BOM welded onto the
 * first heading, a date column typed from `03/04/2024`, a bar chart whose
 * baseline isn't zero. All of them look like data and none of them throw.
 */

describe("parseRows", () => {
  it("keeps a delimiter that is inside quotes", () => {
    expect(parseRows('a,"b,c",d', ",")).toEqual([["a", "b,c", "d"]]);
  });

  it("keeps a newline that is inside quotes", () => {
    expect(parseRows('name,note\n"Ada","line one\nline two"\n', ",")).toEqual([
      ["name", "note"],
      ["Ada", "line one\nline two"],
    ]);
  });

  it("unescapes a doubled quote", () => {
    expect(parseRows('a,"she said ""hi""",b', ",")).toEqual([["a", 'she said "hi"', "b"]]);
  });

  it("handles CRLF without inventing blank rows", () => {
    expect(parseRows("a,b\r\nc,d\r\n", ",")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a last row that has no terminator", () => {
    expect(parseRows("a,b\nc,d", ",")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("strips the BOM Excel writes", () => {
    // Left in, it becomes part of the first column's name and every lookup of
    // that column misses.
    expect(parseRows("﻿id,name\n1,Ada", ",")[0][0]).toBe("id");
  });

  it("keeps empty fields, including trailing ones", () => {
    expect(parseRows("a,,c,", ",")).toEqual([["a", "", "c", ""]]);
  });

  it("reads an empty document as no rows at all", () => {
    expect(parseRows("", ",")).toEqual([]);
  });
});

describe("sniffDelimiter", () => {
  it("finds the delimiter from the header line", () => {
    expect(sniffDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(sniffDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(sniffDelimiter("a\tb\tc")).toBe("\t");
    expect(sniffDelimiter("a|b|c")).toBe("|");
  });

  it("is not fooled by a delimiter inside a quoted heading", () => {
    // Three semicolons in the data, one real comma in the header.
    expect(sniffDelimiter('id,"a;b;c;d"\n1,2')).toBe(",");
  });

  it("calls a single-column file comma-separated", () => {
    expect(sniffDelimiter("name\nAda\nGrace")).toBe(",");
  });
});

describe("parseNumber", () => {
  it("reads the shapes exports actually contain", () => {
    expect(parseNumber("42")).toBe(42);
    expect(parseNumber(" -3.5 ")).toBe(-3.5);
    expect(parseNumber("1,234,567")).toBe(1_234_567);
    expect(parseNumber("$1,200.50")).toBe(1200.5);
    expect(parseNumber("₹99")).toBe(99);
    expect(parseNumber("23%")).toBe(23);
    expect(parseNumber("(450)")).toBe(-450);
    expect(parseNumber("1.2e3")).toBe(1200);
  });

  it("refuses anything that is not a number", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("n/a")).toBeNull();
    expect(parseNumber("12 apples")).toBeNull();
    expect(parseNumber("1.2.3")).toBeNull();
    expect(parseNumber("-")).toBeNull();
  });
});

describe("parseDate", () => {
  it("accepts the unambiguous shapes", () => {
    expect(parseDate("2024-03-12")).toBe(Date.parse("2024-03-12"));
    expect(parseDate("2024-03-12T09:30:00Z")).toBe(Date.parse("2024-03-12T09:30:00Z"));
    expect(parseDate("12 Mar 2024")).not.toBeNull();
  });

  it("refuses the ambiguous ones rather than guessing a locale", () => {
    // 03/04/2024 is two different days depending on where you live, and a
    // column wrongly typed as dates sorts and charts wrongly.
    expect(parseDate("03/04/2024")).toBeNull();
    expect(parseDate("2024")).toBeNull();
    expect(parseDate("last Tuesday")).toBeNull();
  });
});

describe("inferType", () => {
  it("types a column only when every value fits", () => {
    expect(inferType(["1", "2", "3"])).toBe("number");
    expect(inferType(["1", "2", "n/a"])).toBe("text");
    expect(inferType(["2024-01-01", "2024-06-30"])).toBe("date");
    expect(inferType(["yes", "no", "yes"])).toBe("boolean");
    expect(inferType(["Ada", "Grace"])).toBe("text");
  });

  it("ignores blanks when deciding", () => {
    expect(inferType(["1", "", "3"])).toBe("number");
  });

  it("does not call a column of 1s boolean", () => {
    expect(inferType(["1", "1", "1"])).toBe("number");
  });

  it("calls an empty column text", () => {
    expect(inferType(["", "", ""])).toBe("text");
  });
});

describe("parseSheet", () => {
  const csv = "name,qty,when\nAda,3,2024-01-05\nGrace,10,2024-02-11\nAlan,,2024-03-01";

  it("names and types the columns", () => {
    const sheet = parseSheet(csv);
    expect(sheet.columns.map((c) => c.name)).toEqual(["name", "qty", "when"]);
    expect(sheet.columns.map((c) => c.type)).toEqual(["text", "number", "date"]);
    expect(sheet.columns[1].blanks).toBe(1);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.warnings).toEqual([]);
  });

  it("names an unnamed heading positionally and numbers duplicates", () => {
    const sheet = parseSheet("id,,id\n1,2,3");
    expect(sheet.columns.map((c) => c.name)).toEqual(["id", "Column 2", "id (2)"]);
    expect(sheet.warnings.join(" ")).toMatch(/same heading/);
  });

  it("pads a short row and reports it", () => {
    const sheet = parseSheet("a,b,c\n1,2");
    expect(sheet.rows[0]).toEqual(["1", "2", ""]);
    expect(sheet.warnings.join(" ")).toMatch(/fewer fields/);
  });

  it("widens rather than dropping a row with extra fields", () => {
    const sheet = parseSheet("a,b\n1,2,3");
    expect(sheet.columns).toHaveLength(3);
    expect(sheet.rows[0]).toEqual(["1", "2", "3"]);
    expect(sheet.warnings.join(" ")).toMatch(/more fields/);
  });

  it("drops blank lines without dropping rows of empty fields", () => {
    expect(parseSheet("a,b\n1,2\n\n3,4\n").rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("says so when there was nothing to read", () => {
    const sheet = parseSheet("");
    expect(sheet.rows).toEqual([]);
    expect(sheet.warnings.join(" ")).toMatch(/nothing to read/);
  });
});

describe("writing back out", () => {
  it("quotes only the fields that need it, and round-trips", () => {
    expect(escapeField("plain", ",")).toBe("plain");
    expect(escapeField("a,b", ",")).toBe('"a,b"');
    expect(escapeField('say "hi"', ",")).toBe('"say ""hi"""');
    expect(escapeField("two\nlines", ",")).toBe('"two\nlines"');
    // Leading or trailing space is meaningful and survives only if quoted.
    expect(escapeField(" padded ", ",")).toBe('" padded "');

    const columns = ["name", "note"];
    const rows = [["Ada", 'a, and "b"'], ["Grace", "two\nlines"]];
    const sheet = parseSheet(toCsv(columns, rows));
    expect(sheet.rows).toEqual(rows);
  });

  it("writes a Markdown table with its pipes escaped", () => {
    const md = toMarkdown(["a", "b"], [["x|y", "z"]]);
    expect(md.split("\n")[1]).toBe("| --- | --- |");
    expect(md).toContain("x\\|y");
  });

  it("writes JSON with each cell as its column's type", () => {
    const sheet = parseSheet("name,qty\nAda,3");
    expect(JSON.parse(toJson(sheet.columns, sheet.rows))).toEqual([{ name: "Ada", qty: 3 }]);
  });
});

describe("summarize", () => {
  // A second column keeps the gap in row five a *record with a blank cell*,
  // rather than a blank line the parser is right to drop entirely.
  const sheet = parseSheet("v,k\n1,a\n2,a\n3,a\n4,a\n,a\n100,a");

  it("describes a numeric column and skips its blanks", () => {
    const summary = summarize(sheet.columns[0], sheet.rows, 0);
    expect(summary.kind).toBe("number");
    if (summary.kind !== "number") return;
    expect(summary.count).toBe(5);
    expect(summary.blanks).toBe(1);
    expect(summary.sum).toBe(110);
    expect(summary.mean).toBe(22);
    // The mean and median disagreeing is the signal the panel exists to show.
    expect(summary.median).toBe(3);
    expect(summary.min).toBe(1);
    expect(summary.max).toBe(100);
    expect(summary.p25).toBe(2);
    expect(summary.p75).toBe(4);
  });

  it("describes a text column by what is in it", () => {
    const text = parseSheet("k,z\na,1\nb,1\na,1\n,1\nlonger,1");
    const summary = summarize(text.columns[0], text.rows, 0);
    expect(summary.kind).toBe("category");
    if (summary.kind !== "category") return;
    expect(summary.distinct).toBe(3);
    expect(summary.blanks).toBe(1);
    expect(summary.top[0]).toEqual({ value: "a", count: 2, share: 0.5 });
    expect(summary.longest).toBe("longer");
  });

  it("describes a date column by its span", () => {
    const dates = parseSheet("d\n2024-01-01\n2024-01-01\n2024-03-01");
    const summary = summarize(dates.columns[0], dates.rows, 0);
    expect(summary.kind).toBe("date");
    if (summary.kind !== "date") return;
    expect(summary.days).toBe(2);
    expect(summary.earliest).toBeLessThan(summary.latest);
  });

  it("survives a column with nothing in it", () => {
    const empty = parseSheet("v\n\n");
    expect(() => summarize(empty.columns[0], empty.rows, 0)).not.toThrow();
  });

  it("formats numbers without exponents", () => {
    expect(formatNumber(1234.5)).not.toMatch(/e/i);
    expect(formatNumber(0.12345)).toMatch(/^0\.123/);
    expect(formatNumber(Infinity)).toBe("—");
  });
});

describe("compareCells", () => {
  it("compares numbers as numbers, not as strings", () => {
    expect(compareCells("10", "9", "number")).toBeGreaterThan(0);
    expect(compareCells("2", "10", "number")).toBeLessThan(0);
    expect(compareCells("Ada", "ada", "text")).toBe(0);
  });

  it("orders text naturally, so item 2 precedes item 10", () => {
    expect(compareCells("item 2", "item 10", "text")).toBeLessThan(0);
  });

  it("sorts blanks last in both directions", () => {
    expect(compareCells("", "5", "number")).toBeGreaterThan(0);
    expect(compareCells("5", "", "number")).toBeLessThan(0);
  });
});

describe("applyView", () => {
  const sheet = parseSheet("name,qty\nAda,3\nGrace,10\nAlan,7\nada lovelace,1");

  const indices = (view: Parameters<typeof applyView>[2]) =>
    applyView(sheet.columns, sheet.rows, view);

  it("returns every row for an empty view, in file order", () => {
    expect(indices(EMPTY_VIEW)).toEqual([0, 1, 2, 3]);
  });

  it("searches across every column, case-insensitively", () => {
    expect(indices({ ...EMPTY_VIEW, query: "ada" })).toEqual([0, 3]);
    expect(indices({ ...EMPTY_VIEW, query: "10" })).toEqual([1]);
  });

  it("sorts a numeric column numerically", () => {
    expect(indices({ ...EMPTY_VIEW, sort: { column: 1, direction: "asc" } })).toEqual([3, 0, 2, 1]);
    expect(indices({ ...EMPTY_VIEW, sort: { column: 1, direction: "desc" } })).toEqual([1, 2, 0, 3]);
  });

  it("filters with the operator for the column's type", () => {
    expect(indices({ ...EMPTY_VIEW, filter: { column: 1, op: "gt", value: "5" } })).toEqual([1, 2]);
    expect(indices({ ...EMPTY_VIEW, filter: { column: 1, op: "lte", value: "3" } })).toEqual([0, 3]);
    expect(indices({ ...EMPTY_VIEW, filter: { column: 0, op: "starts", value: "a" } })).toEqual([0, 2, 3]);
    expect(indices({ ...EMPTY_VIEW, filter: { column: 0, op: "equals", value: "ADA" } })).toEqual([0]);
  });

  it("ignores a filter with nothing typed in it yet", () => {
    expect(indices({ ...EMPTY_VIEW, filter: { column: 1, op: "gt", value: "" } })).toHaveLength(4);
  });

  it("applies the filter before the sort, and both with the search", () => {
    expect(
      indices({
        query: "a",
        filter: { column: 1, op: "gte", value: "3" },
        sort: { column: 1, direction: "desc" },
      }),
    ).toEqual([1, 2, 0]);
  });

  it("offers only the operators a column's type can answer", () => {
    expect(opsFor("number")).toContain("gt");
    expect(opsFor("text")).not.toContain("gt");
    expect(opsFor("text")).toContain("contains");
  });

  it("cycles a header click through ascending, descending and off", () => {
    const first = nextSort(null, 2);
    expect(first).toEqual({ column: 2, direction: "asc" });
    const second = nextSort(first, 2);
    expect(second).toEqual({ column: 2, direction: "desc" });
    expect(nextSort(second, 2)).toBeNull();
    // A different column starts over rather than inheriting the direction.
    expect(nextSort(second, 1)).toEqual({ column: 1, direction: "asc" });
  });
});

describe("buildSeries", () => {
  const sheet = parseSheet(
    "team,points\nred,10\nblue,4\nred,5\ngreen,7\nblue,1\n,9",
  );

  it("groups by the label column and combines the values", () => {
    const series = buildSeries(sheet.columns, sheet.rows, 0, 1, "sum", "bar");
    expect(series.points).toEqual([
      { label: "red", value: 15, rows: 2, sort: 0 },
      { label: "blue", value: 5, rows: 2, sort: 1 },
      { label: "green", value: 7, rows: 1, sort: 3 },
    ].sort((a, b) => b.value - a.value));
  });

  it("skips rows with no label rather than grouping them as blank", () => {
    const series = buildSeries(sheet.columns, sheet.rows, 0, 1, "count", "bar");
    expect(series.points.reduce((total, point) => total + point.value, 0)).toBe(5);
  });

  it("averages, counts and takes extremes", () => {
    const of = (aggregation: Parameters<typeof buildSeries>[4]) =>
      Object.fromEntries(
        buildSeries(sheet.columns, sheet.rows, 0, 1, aggregation, "bar").points.map((p) => [
          p.label,
          p.value,
        ]),
      );
    expect(of("mean").red).toBe(7.5);
    expect(of("count").red).toBe(2);
    expect(of("min").red).toBe(5);
    expect(of("max").red).toBe(10);
  });

  it("orders a bar chart biggest-first and a time axis chronologically", () => {
    const bars = buildSeries(sheet.columns, sheet.rows, 0, 1, "sum", "bar");
    expect(bars.points.map((p) => p.label)).toEqual(["red", "green", "blue"]);

    const dated = parseSheet("d,v\n2024-03-01,1\n2024-01-01,2\n2024-02-01,3");
    const line = buildSeries(dated.columns, dated.rows, 0, 1, "sum", "line");
    expect(line.timeAxis).toBe(true);
    expect(line.points.map((p) => p.label)).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);
  });

  it("folds the tail past the bar cap instead of dropping it", () => {
    const rows = Array.from({ length: 50 }, (_, i) => `cat${i},${50 - i}`).join("\n");
    const many = parseSheet(`k,v\n${rows}`);
    const series = buildSeries(many.columns, many.rows, 0, 1, "sum", "bar");

    expect(series.points).toHaveLength(MAX_BARS);
    expect(series.folded).toBe(50 - (MAX_BARS - 1));
    const last = series.points[series.points.length - 1];
    expect(last.label).toMatch(/^Other/);
    // Nothing lost: the folded bar carries the sum of everything it swallowed.
    const total = series.points.reduce((sum, point) => sum + point.value, 0);
    expect(total).toBe((50 * 51) / 2 - 0);
  });

  it("returns nothing for a column that isn't there", () => {
    expect(buildSeries(sheet.columns, sheet.rows, 9, 1, "sum", "bar").points).toEqual([]);
  });
});

describe("niceScale", () => {
  it("includes zero for bars, because bar length is the value", () => {
    const scale = niceScale([90, 94, 98], true);
    expect(scale.min).toBe(0);
    expect(scale.max).toBeGreaterThanOrEqual(98);
  });

  it("lets a line chart float its baseline", () => {
    expect(niceScale([90, 94, 98], false).min).toBeGreaterThan(0);
  });

  it("puts round numbers on the axis", () => {
    expect(niceScale([0, 97], true).ticks).toEqual([0, 25, 50, 75, 100]);
    expect(niceScale([0, 8], true).ticks).toEqual([0, 2, 4, 6, 8]);
  });

  it("does not accumulate float error along the ticks", () => {
    for (const tick of niceScale([0, 0.7], true).ticks) {
      expect(String(tick)).not.toMatch(/\d{6,}/);
    }
  });

  it("gives a flat series somewhere to sit", () => {
    expect(niceScale([5, 5, 5], true).max).toBeGreaterThan(5);
    expect(niceScale([0, 0], true)).toEqual({ min: 0, max: 1, ticks: [0, 0.5, 1] });
    expect(niceScale([], true).ticks.length).toBeGreaterThan(0);
  });

  it("spans negatives and positives", () => {
    const scale = niceScale([-40, 60], true);
    expect(scale.min).toBeLessThanOrEqual(-40);
    expect(scale.max).toBeGreaterThanOrEqual(60);
    expect(scale.ticks).toContain(0);
  });

  it("places a value proportionally on its scale", () => {
    const scale = niceScale([0, 100], true);
    expect(fraction(0, scale)).toBe(0);
    expect(fraction(50, scale)).toBeCloseTo(0.5, 6);
    expect(fraction(100, scale)).toBe(1);
  });

  it("labels ticks compactly", () => {
    expect(tickLabel(1500)).toBe("1500");
    expect(tickLabel(25_000)).toBe("25k");
    expect(tickLabel(3_400_000)).toBe("3.4M");
    expect(tickLabel(2e9)).toBe("2B");
  });
});
