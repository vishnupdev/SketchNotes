import { describe, expect, it } from "vitest";
import {
  documentStats,
  hasMermaid,
  inlineText,
  parseInline,
  parseMarkdown,
  safeHref,
  slugify,
  tableOfContents,
  type Block,
} from "./parse";

/**
 * Markdown.
 *
 * A hand-written parser needs tests more than a library does, and these target
 * the cases that break such parsers: markup inside code spans, an unterminated
 * fence, nested lists, and — the one that actually matters for safety — a
 * `javascript:` link, which must never become a live anchor.
 */

const kinds = (blocks: Block[]) => blocks.map((b) => b.kind);

describe("parseInline", () => {
  it("parses emphasis and strong", () => {
    expect(parseInline("**bold**")).toEqual([
      { kind: "strong", children: [{ kind: "text", text: "bold" }] },
    ]);
    expect(parseInline("_it_")).toEqual([
      { kind: "em", children: [{ kind: "text", text: "it" }] },
    ]);
    expect(parseInline("~~gone~~")).toEqual([
      { kind: "strike", children: [{ kind: "text", text: "gone" }] },
    ]);
  });

  it("does not read markup inside a code span", () => {
    const nodes = parseInline("`**not bold**`");
    expect(nodes).toEqual([{ kind: "code", text: "**not bold**" }]);
  });

  it("matches a code span by its opening run length", () => {
    expect(parseInline("``a ` b``")).toEqual([{ kind: "code", text: "a ` b" }]);
  });

  it("parses links, and images as images", () => {
    expect(parseInline("[docs](https://example.com)")).toEqual([
      {
        kind: "link",
        href: "https://example.com",
        children: [{ kind: "text", text: "docs" }],
      },
    ]);
    expect(parseInline("![alt](/pic.png)")).toEqual([
      { kind: "image", src: "/pic.png", alt: "alt" },
    ]);
  });

  it("links a bare URL", () => {
    const nodes = parseInline("see https://example.com/x now");
    expect(nodes.some((n) => n.kind === "link")).toBe(true);
  });

  it("honours a backslash escape", () => {
    expect(parseInline("\\*literal\\*")).toEqual([{ kind: "text", text: "*literal*" }]);
  });

  it("handles balanced parentheses in a URL", () => {
    const nodes = parseInline("[w](https://e.com/a_(b))");
    expect(nodes[0]).toMatchObject({ kind: "link", href: "https://e.com/a_(b)" });
  });
});

describe("safeHref", () => {
  it("allows the ordinary schemes", () => {
    for (const href of ["https://a.com", "http://a.com", "mailto:a@b.c", "tel:+1", "#top", "/p", "./p"]) {
      expect(safeHref(href), href).toBe(true);
    }
  });

  it("refuses script URLs", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x"]) {
      expect(safeHref(href), href).toBe(false);
    }
  });

  it("renders an unsafe link as text, not as an anchor", () => {
    const nodes = parseInline("[click](javascript:alert(1))");
    expect(nodes.every((n) => n.kind !== "link")).toBe(true);
    expect(inlineText(nodes)).toContain("click");
  });
});

describe("parseMarkdown", () => {
  it("parses headings with a slug", () => {
    const blocks = parseMarkdown("## Hello There");
    expect(blocks[0]).toMatchObject({ kind: "heading", level: 2, slug: "hello-there" });
  });

  it("parses a fenced code block with its language, untouched", () => {
    const blocks = parseMarkdown("```ts\nconst a = **1**;\n```");
    expect(blocks[0]).toEqual({ kind: "code", language: "ts", text: "const a = **1**;" });
  });

  it("treats an unterminated fence as code rather than losing the rest", () => {
    const blocks = parseMarkdown("```js\nlet a = 1;\nlet b = 2;");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: "code", text: "let a = 1;\nlet b = 2;" });
  });

  it("parses lists, and nests by indentation", () => {
    const blocks = parseMarkdown("- one\n- two\n  - two a\n- three");
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    if (list.kind !== "list") throw new Error("expected a list");
    expect(list.items).toHaveLength(3);
    expect(list.items[1].sublist?.items[0].children).toEqual([{ kind: "text", text: "two a" }]);
  });

  it("keeps an ordered list's starting number", () => {
    const blocks = parseMarkdown("3. three\n4. four");
    expect(blocks[0]).toMatchObject({ kind: "list", ordered: true, start: 3 });
  });

  it("reads task list checkboxes", () => {
    const blocks = parseMarkdown("- [x] done\n- [ ] todo");
    const list = blocks[0];
    if (list.kind !== "list") throw new Error("expected a list");
    expect(list.items.map((i) => i.task)).toEqual([true, false]);
  });

  it("parses a blockquote, including blocks inside it", () => {
    const blocks = parseMarkdown("> quoted\n> - a\n> - b");
    expect(blocks[0].kind).toBe("quote");
    if (blocks[0].kind !== "quote") return;
    expect(kinds(blocks[0].blocks)).toContain("list");
  });

  it("parses a table with alignment", () => {
    const blocks = parseMarkdown("| a | b |\n| :- | -: |\n| 1 | 2 |");
    const table = blocks[0];
    if (table.kind !== "table") throw new Error("expected a table");
    expect(table.align).toEqual(["left", "right"]);
    expect(table.rows).toHaveLength(1);
    expect(table.head).toHaveLength(2);
  });

  it("parses a horizontal rule", () => {
    expect(kinds(parseMarkdown("a\n\n---\n\nb"))).toEqual(["paragraph", "rule", "paragraph"]);
  });

  it("separates paragraphs on a blank line", () => {
    expect(kinds(parseMarkdown("one\n\ntwo"))).toEqual(["paragraph", "paragraph"]);
  });

  it("terminates on an empty document", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n\n   \n")).toEqual([]);
  });
});

describe("slugify", () => {
  it("makes an anchor, and never an empty one", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("!!!")).toBe("section");
  });
});

describe("tableOfContents", () => {
  it("lists headings in order with their levels", () => {
    const toc = tableOfContents(parseMarkdown("# A\n\ntext\n\n## B\n\n### C"));
    expect(toc).toEqual([
      { level: 1, text: "A", slug: "a" },
      { level: 2, text: "B", slug: "b" },
      { level: 3, text: "C", slug: "c" },
    ]);
  });
});

describe("documentStats", () => {
  it("counts words in prose and not in code", () => {
    const stats = documentStats(parseMarkdown("one two three\n\n```\nfour five six seven\n```"));
    expect(stats.words).toBe(3);
    expect(stats.codeBlocks).toBe(1);
  });

  it("counts headings and links", () => {
    const stats = documentStats(parseMarkdown("# Title\n\n[a](https://a.com) and [b](https://b.com)"));
    expect(stats.headings).toBe(1);
    expect(stats.links).toBe(2);
  });

  it("never reports a reading time below a minute", () => {
    expect(documentStats(parseMarkdown("hi")).minutes).toBe(1);
  });
});

describe("hasMermaid", () => {
  it("finds a mermaid fence, including inside a quote", () => {
    expect(hasMermaid(parseMarkdown("```mermaid\ngraph TD;\n```"))).toBe(true);
    expect(hasMermaid(parseMarkdown("> ```mermaid\n> graph TD;\n> ```"))).toBe(true);
    expect(hasMermaid(parseMarkdown("```js\nlet a = 1;\n```"))).toBe(false);
  });
});
