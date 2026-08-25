import { describe, expect, it } from "vitest";
import { changeCase, measure, transformLines } from "./transform";
import { decode, encode } from "./encode";
import { formatJson, locate, minifyJson, parseJson, sortJsonKeys } from "./json";
import { findJsonFault } from "./locate";
import { collapseUnchanged, diffLines } from "./diff";
import { replaceWith, runRegex, SUBJECT_LIMIT } from "./regex";

/**
 * Text Kit.
 *
 * Every one of these is a pure function over a string, which is exactly the kind
 * of code that looks obviously correct and quietly isn't: case conversion across
 * word boundaries, base64 of non-Latin text, a JSON error's line number, a diff's
 * add/remove attribution. Each has a test for the case that actually breaks.
 */

describe("changeCase", () => {
  it("does the plain cases", () => {
    expect(changeCase("hello world", "upper")).toBe("HELLO WORLD");
    expect(changeCase("HELLO", "lower")).toBe("hello");
    expect(changeCase("hello world", "title")).toBe("Hello World");
  });

  it("capitalises sentences, not every word", () => {
    expect(changeCase("hello there. how are you? fine!", "sentence")).toBe(
      "Hello there. How are you? Fine!",
    );
  });

  it("finds word boundaries inside identifiers", () => {
    // The case that catches naive implementations: an acronym run.
    expect(changeCase("parseHTMLDocument", "snake")).toBe("parse_html_document");
    expect(changeCase("parseHTMLDocument", "kebab")).toBe("parse-html-document");
    expect(changeCase("some mixed_text-here", "camel")).toBe("someMixedTextHere");
    expect(changeCase("some mixed_text-here", "pascal")).toBe("SomeMixedTextHere");
  });

  it("leaves punctuation and non-Latin text alone", () => {
    expect(changeCase("it's a test", "title")).toBe("It's A Test");
    expect(changeCase("മലയാളം", "upper")).toBe("മലയാളം");
  });
});

describe("transformLines", () => {
  const text = "banana\nApple\napple\ncherry\n\n  padded  ";

  it("sorts case-insensitively and naturally", () => {
    expect(transformLines("file10\nfile2\nfile1", "sortNatural").split("\n")).toEqual([
      "file1",
      "file2",
      "file10",
    ]);
    // Plain sort would put "Apple" before "apple" by code point; the collator
    // treats them as equal, so both orders are acceptable — what matters is
    // that "banana" lands after both.
    const sorted = transformLines(text, "sort").split("\n");
    expect(sorted.indexOf("banana")).toBeGreaterThan(sorted.indexOf("apple"));
  });

  it("dedupes exactly, keeping the first", () => {
    expect(transformLines("a\nb\na\nb\nc", "dedupe")).toBe("a\nb\nc");
    // Case differences are different lines — this is not a fuzzy operation.
    expect(transformLines("Apple\napple", "dedupe")).toBe("Apple\napple");
  });

  it("trims, drops blanks, reverses and numbers", () => {
    expect(transformLines("  a  \n b ", "trim")).toBe("a\nb");
    expect(transformLines("a\n\n \nb", "dropBlank")).toBe("a\nb");
    expect(transformLines("a\nb\nc", "reverse")).toBe("c\nb\na");
    expect(transformLines("a\nb", "number")).toBe("1. a\n2. b");
  });

  it("keeps the document's own line endings", () => {
    expect(transformLines("b\r\na", "sort")).toBe("a\r\nb");
  });
});

describe("measure", () => {
  it("counts the way a person would", () => {
    const stats = measure("Hello world\n\nSecond paragraph here");
    expect(stats.words).toBe(5);
    expect(stats.lines).toBe(3);
    expect(stats.paragraphs).toBe(2);
    expect(stats.charactersNoSpaces).toBe(stats.characters - 5);
  });

  it("counts an emoji as one character but its real bytes", () => {
    const stats = measure("🎉");
    expect(stats.characters).toBe(1);
    expect(stats.bytes).toBe(4);
  });

  it("reports nothing for nothing", () => {
    const stats = measure("");
    expect([stats.characters, stats.words, stats.lines, stats.paragraphs]).toEqual([0, 0, 0, 0]);
  });
});

describe("encode / decode", () => {
  it("round-trips text that isn't Latin-1", () => {
    // `btoa` alone throws on this; the UTF-8 path is the whole point.
    const text = "മലയാളം · café · 🎉";
    for (const codec of ["base64", "base64url", "url", "urlComponent", "html", "jsonString"] as const) {
      const encoded = encode(text, codec);
      expect(encoded.ok).toBe(true);
      if (!encoded.ok) continue;
      const decoded = decode(encoded.text, codec);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(decoded.text).toBe(text);
    }
  });

  it("produces URL-safe base64 without padding", () => {
    const encoded = encode("??>>", "base64url");
    expect(encoded.ok && /^[A-Za-z0-9_-]+$/.test(encoded.text)).toBe(true);
  });

  it("escapes HTML in the right order", () => {
    const encoded = encode("<a href=\"x\">&</a>", "html");
    expect(encoded.ok && encoded.text).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
    // Decoding must not turn "&amp;lt;" into "<".
    const decoded = decode("&amp;lt;", "html");
    expect(decoded.ok && decoded.text).toBe("&lt;");
  });

  it("explains bad input instead of throwing", () => {
    expect(decode("not base64!!", "base64")).toMatchObject({ ok: false });
    expect(decode("%E0%A4", "url")).toMatchObject({ ok: false });
    expect(decode("{}", "jsonString")).toMatchObject({ ok: false });
  });
});

describe("json", () => {
  it("locates an error by line and column", () => {
    const text = '{\n  "a": 1,\n  "b": oops\n}';
    const parsed = parseJson(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      // The point of the exercise: line 3, not "position 20".
      expect(parsed.error.line).toBe(3);
      expect(parsed.error.excerpt).toContain('"b"');
    }
  });

  it("maps an offset to a position", () => {
    expect(locate("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
    expect(locate("abc", 0)).toEqual({ line: 1, column: 1 });
  });

  it("formats, minifies and sorts keys at every depth", () => {
    const text = '{"b":1,"a":{"d":2,"c":[3,1]}}';
    expect(formatJson(text)).toMatchObject({ ok: true });
    expect(minifyJson('{ "a" : 1 }')).toMatchObject({ ok: true, text: '{"a":1}' });

    const sorted = sortJsonKeys(text, 2);
    expect(sorted.ok).toBe(true);
    if (sorted.ok) {
      expect(Object.keys(JSON.parse(sorted.text))).toEqual(["a", "b"]);
      // Array order is data, so it is left exactly as it was.
      expect(JSON.parse(sorted.text).a.c).toEqual([3, 1]);
    }
  });
});

describe("diff", () => {
  it("attributes added and removed lines correctly", () => {
    const result = diffLines("a\nb\nc", "a\nx\nc");
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.rows.map((r) => r.kind)).toEqual(["same", "removed", "added", "same"]);
    // Line numbers stay meaningful on both sides.
    expect(result.rows.find((r) => r.kind === "removed")?.left).toBe(2);
    expect(result.rows.find((r) => r.kind === "added")?.right).toBe(2);
  });

  it("handles insertions at the ends", () => {
    expect(diffLines("b", "a\nb").added).toBe(1);
    expect(diffLines("a\nb", "a").removed).toBe(1);
    expect(diffLines("", "a").added).toBe(1);
    expect(diffLines("same", "same")).toMatchObject({ added: 0, removed: 0 });
  });

  it("degrades rather than hanging on very large inputs", () => {
    const big = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join("\n");
    const result = diffLines(big, `${big}\nextra`);
    expect(result.truncated).toBe(true);
    expect(result.added).toBeGreaterThan(0);
  });

  it("collapses unchanged runs but keeps context", () => {
    const rows = diffLines("a\nb\nc\nd\ne\nf\ng", "a\nb\nc\nX\ne\nf\ng").rows;
    const collapsed = collapseUnchanged(rows, 1);
    expect(collapsed.length).toBeLessThan(rows.length);
    expect(collapsed.some((r) => r.kind === "added")).toBe(true);
  });
});

describe("regex", () => {
  it("returns matches with groups", () => {
    const run = runRegex("(\\w+)@(\\w+)", "g", "a@b and c@d");
    expect(run.ok).toBe(true);
    if (run.ok) {
      expect(run.matches).toHaveLength(2);
      expect(run.matches[0].groups).toEqual(["a", "b"]);
      expect(run.matches[0].index).toBe(0);
    }
  });

  it("returns named groups when the pattern has them", () => {
    const run = runRegex("(?<year>\\d{4})", "g", "in 2026");
    expect(run.ok && run.matches[0].named?.year).toBe("2026");
  });

  it("stops at the first match without the g flag", () => {
    const run = runRegex("a", "", "aaa");
    expect(run.ok && run.matches).toHaveLength(1);
  });

  it("reports a bad pattern as a message", () => {
    const run = runRegex("(unclosed", "", "x");
    expect(run.ok).toBe(false);
    if (!run.ok) expect(run.error.length).toBeGreaterThan(0);
  });

  it("cannot be hung by a zero-length match", () => {
    // `//g` on a non-empty string loops forever without the guard.
    const run = runRegex("x*", "g", "abc");
    expect(run.ok).toBe(true);
  });

  it("caps the subject it will run against", () => {
    const run = runRegex("a", "g", "a".repeat(SUBJECT_LIMIT + 500));
    expect(run.ok && run.capped).toBe(true);
  });

  it("previews a replacement with group references", () => {
    expect(replaceWith("(\\w+) (\\w+)", "", "hello world", "$2 $1")).toEqual({
      ok: true,
      text: "world hello",
    });
    expect(replaceWith("(", "", "x", "y")).toMatchObject({ ok: false });
  });
});

describe("findJsonFault", () => {
  /**
   * The locator is what makes a JSON error useful, and it must not depend on the
   * engine's message wording — so it is tested on the mistakes people actually
   * make, by position and by explanation.
   */
  const fault = (text: string) => findJsonFault(text);

  it("says nothing about valid documents", () => {
    for (const text of [
      "{}",
      "[]",
      '{"a":[1,2,{"b":null}],"c":true}',
      '  {"a": -1.5e10}  ',
      '"just a string"',
      "0",
    ]) {
      expect(fault(text)).toBeNull();
    }
  });

  it("finds a trailing comma and names it", () => {
    const found = fault('{\n  "a": 1,\n}');
    expect(found?.message).toMatch(/trailing comma/i);
    expect(locate('{\n  "a": 1,\n}', found!.index).line).toBe(3);
    expect(fault("[1, 2, ]")?.message).toMatch(/trailing comma/i);
  });

  it("finds an unquoted value on the right line", () => {
    const text = '{\n  "a": 1,\n  "b": oops\n}';
    const found = fault(text);
    expect(found).not.toBeNull();
    expect(locate(text, found!.index).line).toBe(3);
    expect(found!.message).toMatch(/quotes/i);
  });

  it("finds an unclosed string and an unescaped line break", () => {
    expect(fault('{"a": "unclosed}')?.message).toMatch(/never closed/i);
    expect(fault('{"a": "two\nlines"}')?.message).toMatch(/line break/i);
  });

  it("rejects the numbers JSON doesn't allow", () => {
    expect(fault("01")?.message).toMatch(/leading zero/i);
    expect(fault("1.")?.message).toMatch(/decimal point/i);
    expect(fault("1e")?.message).toMatch(/exponent/i);
  });

  it("catches a missing comma, a missing colon and trailing junk", () => {
    expect(fault('{"a": 1 "b": 2}')?.message).toMatch(/comma/i);
    expect(fault('{"a" 1}')?.message).toMatch(/colon|“:”/i);
    expect(fault('{"a":1} extra')?.message).toMatch(/extra content/i);
  });

  it("reports the end of a truncated document rather than position zero", () => {
    const text = '{"a": [1, 2';
    const found = fault(text);
    expect(found).not.toBeNull();
    // The whole point: the fault is at the end, not at the start.
    expect(found!.index).toBeGreaterThan(5);
  });
});
