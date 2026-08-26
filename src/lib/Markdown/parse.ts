/**
 * Markdown, parsed to a block/inline tree.
 *
 * Hand-written rather than `marked` + a sanitiser, for one reason that outweighs
 * the convenience: the output is a **tree of typed nodes, never an HTML string**.
 * The renderer turns nodes into React elements, so there is no
 * `dangerouslySetInnerHTML` anywhere in the app and no sanitiser to get wrong —
 * pasted markdown containing a `<script>` tag is text, structurally, and cannot
 * become anything else.
 *
 * It is CommonMark-*shaped*, not CommonMark-complete. Setext headings, reference
 * links, HTML blocks and loose/tight list subtleties are out. Everything people
 * actually type — headings, emphasis, code, links, images, lists, quotes, tables,
 * task lists, fences — is in.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "strike"; children: Inline[] }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; children: Inline[] }
  | { kind: "image"; src: string; alt: string }
  | { kind: "break" };

export interface ListItem {
  children: Inline[];
  /** null when the item is not a task; otherwise its checked state. */
  task: boolean | null;
  /** Nested list, if the item has one. */
  sublist?: Block & { kind: "list" };
}

export type Block =
  | { kind: "heading"; level: number; children: Inline[]; slug: string; text: string }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "code"; language: string; text: string }
  | { kind: "quote"; blocks: Block[] }
  | { kind: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { kind: "rule" }
  | { kind: "table"; head: Inline[][]; rows: Inline[][][]; align: ("left" | "center" | "right" | null)[] };

/* ------------------------------- inline -------------------------------- */

/** Only these schemes may appear in a rendered link. */
const SAFE_SCHEME = /^(?:https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;

/**
 * Whether a link target is safe to render as a link.
 *
 * `javascript:` URLs in markdown are the classic injection route for this kind of
 * renderer — the tree keeps HTML out, but an `<a href>` is a legitimate node and
 * would happily carry a script URL. Anything not on the allowlist is rendered as
 * plain text instead of being silently stripped, so the reader can still see what
 * the document said.
 */
export const safeHref = (href: string): boolean => SAFE_SCHEME.test(href.trim());

const INLINE_CODE = /^`+/;

/**
 * Parse inline markup.
 *
 * A single left-to-right scan. Code spans are matched first and their contents
 * never re-scanned, which is what makes `` `**not bold**` `` come out right.
 */
export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  let i = 0;

  const flush = () => {
    if (text) {
      out.push({ kind: "text", text });
      text = "";
    }
  };

  while (i < source.length) {
    const rest = source.slice(i);
    const ch = source[i];

    // Escaped punctuation: a backslash makes the next character literal.
    if (ch === "\\" && i + 1 < source.length && /[\\`*_[\]()#+\-.!~>|]/.test(source[i + 1])) {
      text += source[i + 1];
      i += 2;
      continue;
    }

    // Code span. The opening run length must be matched by the closing one, so
    // ``a ` b`` works.
    const fence = INLINE_CODE.exec(rest);
    if (fence) {
      const ticks = fence[0];
      const close = source.indexOf(ticks, i + ticks.length);
      if (close !== -1) {
        flush();
        out.push({ kind: "code", text: source.slice(i + ticks.length, close).trim() });
        i = close + ticks.length;
        continue;
      }
    }

    // Image, checked before the link because it is a link with a `!` in front.
    if (ch === "!" && source[i + 1] === "[") {
      const parsed = matchBracketPair(source, i + 1);
      if (parsed) {
        flush();
        out.push({ kind: "image", src: parsed.href, alt: parsed.label });
        i = parsed.end;
        continue;
      }
    }

    if (ch === "[") {
      const parsed = matchBracketPair(source, i);
      if (parsed) {
        flush();
        if (safeHref(parsed.href)) {
          out.push({ kind: "link", href: parsed.href.trim(), children: parseInline(parsed.label) });
        } else {
          // Unsafe scheme: show the document's own text rather than a live link.
          out.push({ kind: "text", text: `${parsed.label} (${parsed.href})` });
        }
        i = parsed.end;
        continue;
      }
    }

    // Bare URL, so pasted links are clickable without being wrapped.
    if (ch === "h" && /^https?:\/\/\S+/.test(rest)) {
      const url = /^https?:\/\/[^\s<>)\]]+/.exec(rest)![0];
      flush();
      out.push({ kind: "link", href: url, children: [{ kind: "text", text: url }] });
      i += url.length;
      continue;
    }

    // Strong, emphasis, strikethrough. Longest marker first, so `***` is not
    // read as `**` followed by a stray `*`.
    const emphasis = matchEmphasis(source, i);
    if (emphasis) {
      flush();
      out.push(emphasis.node);
      i = emphasis.end;
      continue;
    }

    // Hard break: two trailing spaces before a newline.
    if (ch === "\n") {
      if (text.endsWith("  ")) {
        text = text.trimEnd();
        flush();
        out.push({ kind: "break" });
      } else {
        text += " ";
      }
      i++;
      continue;
    }

    text += ch;
    i++;
  }

  flush();
  return out;
}

/** Markers that open emphasis, longest first — the order they must be tried in. */
const EMPHASIS: readonly (readonly [string, "strong" | "em" | "strike" | "strong-em"])[] = [
  ["***", "strong-em"],
  ["**", "strong"],
  ["__", "strong"],
  ["~~", "strike"],
  ["*", "em"],
  ["_", "em"],
];

/**
 * Match an emphasis run starting at `start`.
 *
 * Returns null when no marker opens here, or when the one that does is never
 * closed — an unmatched `*` is a literal asterisk, not the start of something.
 */
function matchEmphasis(source: string, start: number): { node: Inline; end: number } | null {
  for (const [marker, kind] of EMPHASIS) {
    if (!source.startsWith(marker, start)) continue;

    const close = source.indexOf(marker, start + marker.length);
    if (close === -1) continue;

    const inner = source.slice(start + marker.length, close);
    if (!inner) continue; // `**` with nothing between is literal

    const children = parseInline(inner);
    const node: Inline =
      kind === "strong-em"
        ? { kind: "strong", children: [{ kind: "em", children }] }
        : { kind, children };
    return { node, end: close + marker.length };
  }
  return null;
}

/** Match `[label](href)` starting at `start`, honouring nested brackets. */
function matchBracketPair(
  source: string,
  start: number,
): { label: string; href: string; end: number } | null {
  if (source[start] !== "[") return null;

  let depth = 0;
  let close = -1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "\\") {
      i++;
      continue;
    }
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1 || source[close + 1] !== "(") return null;

  // Parenthesised targets can themselves contain balanced parentheses.
  let paren = 0;
  let hrefEnd = -1;
  for (let i = close + 1; i < source.length; i++) {
    if (source[i] === "(") paren++;
    else if (source[i] === ")") {
      paren--;
      if (paren === 0) {
        hrefEnd = i;
        break;
      }
    }
  }
  if (hrefEnd === -1) return null;

  return {
    label: source.slice(start + 1, close),
    // A markdown title after the URL ("url \"title\"") is dropped, not rendered.
    href: source.slice(close + 2, hrefEnd).split(/\s+/)[0],
    end: hrefEnd + 1,
  };
}

/* -------------------------------- blocks ------------------------------- */

/** A URL-safe anchor for a heading, matching what the TOC links to. */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 64) || "section"
  );
}

/** Flatten inline nodes back to plain text — for the TOC and the word count. */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.kind) {
        case "text":
        case "code":
          return n.text;
        case "image":
          return n.alt;
        case "break":
          return " ";
        default:
          return inlineText(n.children);
      }
    })
    .join("");
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const RULE = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const UL_ITEM = /^(\s*)[-*+]\s+(.*)$/;
const OL_ITEM = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

/** Split a table row on unescaped pipes. */
const tableCells = (line: string): string[] =>
  line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

/**
 * Parse a document into blocks.
 *
 * Line-oriented: each iteration decides what block starts at the current line and
 * consumes as many lines as that block owns. Lists recurse on indentation, which
 * is what gives nested bullets without a second pass.
 */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code. Consumed to the closing fence or the end of the document, so
    // an unterminated fence renders as code rather than eating the parser.
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1];
      const language = fence[2] || "plain";
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith(marker)) {
        body.push(lines[i]);
        i++;
      }
      i++; // step past the closing fence
      blocks.push({ kind: "code", language, text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const text = heading[2].replace(/\s+#+\s*$/, "");
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        children: parseInline(text),
        slug: slugify(text),
        text,
      });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    // Blockquote: strip one level of "> " and parse the remainder recursively,
    // which is what makes a list or a fence inside a quote work.
    if (/^\s{0,3}>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && (/^\s{0,3}>/.test(lines[i]) || (quoted.length > 0 && lines[i].trim()))) {
        quoted.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", blocks: parseMarkdown(quoted.join("\n")) });
      continue;
    }

    // Table: a header row followed by a separator row of dashes.
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const head = tableCells(line).map(parseInline);
      const align = tableCells(lines[i + 1]).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : null;
      });
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(tableCells(lines[i]).map(parseInline));
        i++;
      }
      blocks.push({ kind: "table", head, rows, align });
      continue;
    }

    if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
      const [list, consumed] = parseList(lines, i);
      blocks.push(list);
      i = consumed;
      continue;
    }

    // Paragraph: everything up to a blank line or the start of another block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !FENCE.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !/^\s{0,3}>/.test(lines[i]) &&
      !UL_ITEM.test(lines[i]) &&
      !OL_ITEM.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) blocks.push({ kind: "paragraph", children: parseInline(para.join("\n")) });
    else i++; // nothing consumed: step on rather than spin
  }

  return blocks;
}

/** Parse a run of list items starting at `start`. Returns the list and the next index. */
function parseList(lines: string[], start: number): [Block & { kind: "list" }, number] {
  const first = UL_ITEM.exec(lines[start]) ?? OL_ITEM.exec(lines[start]);
  const baseIndent = (first?.[1] ?? "").length;
  const ordered = OL_ITEM.test(lines[start]);
  const startNumber = ordered ? Number(OL_ITEM.exec(lines[start])![2]) : 1;

  const items: ListItem[] = [];
  let i = start;

  while (i < lines.length) {
    const ul = UL_ITEM.exec(lines[i]);
    const ol = OL_ITEM.exec(lines[i]);
    if (!ul && !ol) break;

    const indent = (ul?.[1] ?? ol![1]).length;
    if (indent < baseIndent) break;

    // A deeper indent belongs to the previous item as a nested list.
    if (indent > baseIndent) {
      const [sublist, consumed] = parseList(lines, i);
      if (items.length > 0) items[items.length - 1].sublist = sublist;
      i = consumed;
      continue;
    }

    // Same list only if the marker type matches; otherwise a new list starts.
    if ((ordered && !ol) || (!ordered && !ul)) break;

    const content = ul?.[2] ?? ol![3];
    const task = TASK.exec(content);
    items.push({
      children: parseInline(task ? task[2] : content),
      task: task ? task[1].toLowerCase() === "x" : null,
    });
    i++;
  }

  return [{ kind: "list", ordered, start: startNumber, items }, i];
}

/* ------------------------------ document ------------------------------- */

export interface TocEntry {
  level: number;
  text: string;
  slug: string;
}

/** Headings, for the table of contents. */
export function tableOfContents(blocks: Block[]): TocEntry[] {
  return blocks
    .filter((b): b is Block & { kind: "heading" } => b.kind === "heading")
    .map((b) => ({ level: b.level, text: b.text, slug: b.slug }));
}

export interface DocStats {
  words: number;
  characters: number;
  /** Reading time in minutes, at 220 words a minute, minimum 1. */
  minutes: number;
  headings: number;
  codeBlocks: number;
  links: number;
}

/** Count what a writer wants to know: words, and how long that is to read. */
export function documentStats(blocks: Block[]): DocStats {
  let words = 0;
  let characters = 0;
  let headings = 0;
  let codeBlocks = 0;
  let links = 0;

  const walkInline = (nodes: Inline[]) => {
    for (const n of nodes) {
      if (n.kind === "link") links++;
      if ("children" in n) walkInline(n.children);
    }
  };

  const walk = (list: Block[]) => {
    for (const b of list) {
      switch (b.kind) {
        case "heading": {
          headings++;
          const t = inlineText(b.children);
          words += countWords(t);
          characters += t.length;
          walkInline(b.children);
          break;
        }
        case "paragraph": {
          const t = inlineText(b.children);
          words += countWords(t);
          characters += t.length;
          walkInline(b.children);
          break;
        }
        case "code":
          // Code is not prose: counted as blocks, never as words, so a document
          // full of examples does not report a fictional reading time.
          codeBlocks++;
          break;
        case "quote":
          walk(b.blocks);
          break;
        case "list":
          for (const item of b.items) {
            const t = inlineText(item.children);
            words += countWords(t);
            characters += t.length;
            walkInline(item.children);
            if (item.sublist) walk([item.sublist]);
          }
          break;
        case "table":
          for (const row of [b.head, ...b.rows]) {
            for (const cell of row) {
              const t = inlineText(cell);
              words += countWords(t);
              characters += t.length;
              walkInline(cell);
            }
          }
          break;
        case "rule":
          break;
      }
    }
  };

  walk(blocks);

  return {
    words,
    characters,
    minutes: Math.max(1, Math.round(words / 220)),
    headings,
    codeBlocks,
    links,
  };
}

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** Whether the document contains a Mermaid fence, so the renderer knows to load it. */
export const hasMermaid = (blocks: Block[]): boolean =>
  blocks.some(
    (b) =>
      (b.kind === "code" && b.language.toLowerCase() === "mermaid") ||
      (b.kind === "quote" && hasMermaid(b.blocks)),
  );
