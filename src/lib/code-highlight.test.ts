import { describe, expect, it } from "vitest";
import { guessLanguage, LANGUAGES, tokenize, type Token } from "./code-highlight";

/**
 * The syntax highlighter.
 *
 * Worth testing for one reason that has nothing to do with colour: the token
 * stream *is* what gets rendered, so every character of the input has to come out
 * the other side exactly once. A scanner that drops the last line of a file, or
 * repeats a character while merging two tokens, corrupts the code someone came
 * here to copy — and it would look like a highlighting quirk rather than the data
 * loss it is.
 *
 * Hence the three properties below, checked against every language rather than
 * the one a sample was written in: a highlighter is asked to make sense of the
 * wrong language constantly (a `js` fence in Markdown, a JSON body in the Api
 * app), and it must be lossless even when it has no idea what it is looking at.
 */

const SAMPLES: Record<string, string> = {
  typescript: 'const s = "a\\"b" + `t ${x}`; // note\n/* block */ let n = 0x1f + 1_000;',
  python: "def f(x):  # inline\n    return 'it\\'s' + \"q\"\n",
  sql: "-- c\nSELECT a FROM t WHERE x = 'y' AND z BETWEEN 1 AND 2;",
  shell: '#!/bin/sh\nfor f in *.txt; do echo "$f"; done',
  json: '{"a": 1, "b": [true, null], "c": "esc\\""}',
  css: ":root { --x: #fff; /* c */ }\n@media (min-width: 40rem) { .a { color: red } }",
  html: '<!-- c --><div class="a" id=\'b\'>text</div>',
  go: 'package main\n\nfunc main() {\n\tfmt.Println(`raw\nstring`)\n}',
  rust: 'fn main() {\n    let mut v: Vec<u8> = vec![1];\n    println!("{}", v.len());\n}',
  unterminated: 'const a = "open\nconst b = 0;\n/* and a comment that never closes',
  trailingEscape: 'x = "a\\',
  awkward: "{}[]()<>;,.:?=+-*/%!&|^~ \t\n\n 🎉 café ÀÉÎ 1a2f .5 0b_ #",
  empty: "",
};

const ALL_IDS = [...LANGUAGES.map((l) => l.id), "unknown-language"];

const text = (tokens: Token[]) => tokens.map((t) => t.text).join("");

describe("tokenize", () => {
  it("never loses or duplicates a character", () => {
    for (const id of ALL_IDS) {
      for (const [name, code] of Object.entries(SAMPLES)) {
        expect(text(tokenize(code, id)), `${id} / ${name}`).toBe(code);
      }
    }
  });

  it("emits maximal, non-empty tokens", () => {
    for (const id of ALL_IDS) {
      for (const [name, code] of Object.entries(SAMPLES)) {
        const tokens = tokenize(code, id);
        for (let i = 0; i < tokens.length; i++) {
          // Empty input passes straight through as one empty token; anything
          // else that is empty is a token the renderer would build for nothing.
          if (code !== "") expect(tokens[i].text, `${id} / ${name} / empty token`).not.toBe("");
          if (i > 0) {
            // Two neighbours of one kind would mean a merge was missed, which is
            // a span per character in the DOM for the rest of that stretch.
            expect(tokens[i].kind, `${id} / ${name} / unmerged run`).not.toBe(tokens[i - 1].kind);
          }
        }
      }
    }
  });

  it("passes text through untouched for languages with no rules", () => {
    for (const id of ["plain", "markdown", "nonsense"]) {
      expect(tokenize("const a = 1; // x", id)).toEqual([{ text: "const a = 1; // x", kind: "plain" }]);
    }
  });

  it("keeps an escaped quote inside the string", () => {
    const tokens = tokenize('a = "x\\"y" + 1', "typescript");
    expect(tokens.find((t) => t.kind === "string")?.text).toBe('"x\\"y"');
  });

  it("stops an unterminated quote at the line end, but not a backtick", () => {
    const quoted = tokenize("a = 'open\nb = 1", "typescript");
    expect(quoted.find((t) => t.kind === "string")?.text).toBe("'open");

    const template = tokenize("a = `open\nb = 1", "typescript");
    expect(template.find((t) => t.kind === "string")?.text).toBe("`open\nb = 1");
  });

  it("runs an unclosed block comment to the end of the file", () => {
    const tokens = tokenize("a = 1;\n/* never closed\nmore", "typescript");
    expect(tokens.at(-1)).toEqual({ text: "/* never closed\nmore", kind: "comment" });
  });

  it("matches keywords case-insensitively, which is what SQL needs", () => {
    const kinds = (code: string, lang: string) =>
      tokenize(code, lang)
        .filter((t) => t.kind === "keyword")
        .map((t) => t.text);

    expect(kinds("SELECT a FROM t", "sql")).toEqual(["SELECT", "FROM"]);
    expect(kinds("select a from t", "sql")).toEqual(["select", "from"]);
    /*
     * The lowercased probe is not gated by language, so `CONST` colours as a
     * keyword in JavaScript too. Part of the "deliberately approximate" bargain
     * the module documents: shouted keywords are a real style in SQL, and a
     * shouted `CONST` in JavaScript is a typo that highlighting cannot fix.
     */
    expect(kinds("CONST a = 1; const b = 2", "javascript")).toEqual(["CONST", "const"]);
  });

  it("reads numbers including hex, binary and decimals", () => {
    const numbers = tokenize("0xFF + 0b1010 + 1_000 + 1.5 + 9e9", "typescript")
      .filter((t) => t.kind === "number")
      .map((t) => t.text);
    expect(numbers).toEqual(["0xFF", "0b1010", "1_000", "1.5", "9e9"]);
  });
});

describe("guessLanguage", () => {
  it("recognises what people paste", () => {
    expect(guessLanguage('{"a": 1}')).toBe("json");
    expect(guessLanguage("#!/bin/bash\necho hi")).toBe("shell");
    expect(guessLanguage("def f(x):\n    return x")).toBe("python");
    expect(guessLanguage("package main\n")).toBe("go");
    expect(guessLanguage("fn main() {}")).toBe("rust");
    expect(guessLanguage("SELECT a FROM t")).toBe("sql");
    expect(guessLanguage("<html><body></body></html>")).toBe("html");
    expect(guessLanguage("const a = 1")).toBe("javascript");
    expect(guessLanguage("just some prose")).toBe("plain");
  });
});
