/**
 * Markdown out: a standalone HTML file.
 *
 * This is the one place the app builds an HTML *string*, and it is safe for a
 * reason that does not apply to the preview: the output is written to a file the
 * user downloads, never inserted into this page. Even so every piece of document
 * text goes through `esc`, because the file will be opened in a browser
 * eventually and an unescaped `<script>` in a heading would run there.
 *
 * The file is genuinely standalone — styles inlined, no external requests — so it
 * opens the same offline, on a phone, or attached to an email.
 */

import { esc } from "@/lib/utils";
import { inlineText, safeHref, type Block, type Inline } from "./parse";

function renderInline(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
          return esc(node.text);
        case "strong":
          return `<strong>${renderInline(node.children)}</strong>`;
        case "em":
          return `<em>${renderInline(node.children)}</em>`;
        case "strike":
          return `<s>${renderInline(node.children)}</s>`;
        case "code":
          return `<code>${esc(node.text)}</code>`;
        case "link":
          // The parser already refuses unsafe schemes, but the check is repeated
          // here rather than assumed: this function writes a file that outlives
          // the parser's guarantees.
          return safeHref(node.href)
            ? `<a href="${esc(node.href)}" rel="noopener noreferrer">${renderInline(node.children)}</a>`
            : renderInline(node.children);
        case "image":
          return `<img src="${esc(node.src)}" alt="${esc(node.alt)}" loading="lazy">`;
        case "break":
          return "<br>";
      }
    })
    .join("");
}

function renderBlocks(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `<h${block.level} id="${esc(block.slug)}">${renderInline(block.children)}</h${block.level}>`;
        case "paragraph":
          return `<p>${renderInline(block.children)}</p>`;
        case "code":
          return `<pre><code class="language-${esc(block.language)}">${esc(block.text)}</code></pre>`;
        case "quote":
          return `<blockquote>${renderBlocks(block.blocks)}</blockquote>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : "";
          const items = block.items
            .map((item) => {
              const box =
                item.task === null
                  ? ""
                  : `<input type="checkbox" disabled${item.task ? " checked" : ""}> `;
              const sub = item.sublist ? renderBlocks([item.sublist]) : "";
              return `<li${item.task === null ? "" : ' class="task"'}>${box}${renderInline(item.children)}${sub}</li>`;
            })
            .join("");
          return `<${tag}${start}>${items}</${tag}>`;
        }
        case "rule":
          return "<hr>";
        case "table": {
          const head = block.head
            .map((cell, i) => `<th${alignAttr(block.align[i])}>${renderInline(cell)}</th>`)
            .join("");
          const rows = block.rows
            .map(
              (row) =>
                `<tr>${row.map((cell, i) => `<td${alignAttr(block.align[i])}>${renderInline(cell)}</td>`).join("")}</tr>`,
            )
            .join("");
          return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
        }
      }
    })
    .join("\n");
}

const alignAttr = (align: "left" | "center" | "right" | null): string =>
  align ? ` style="text-align:${align}"` : "";

/**
 * A print-friendly, self-contained stylesheet.
 *
 * Deliberately not the app's theme. An exported document is read somewhere else —
 * printed, emailed, opened next to other documents — and should look like a
 * document rather than like a screenshot of this app. It does respect the reader's
 * dark-mode preference, since it will be opened in a browser.
 */
const STYLES = `
:root { color-scheme: light dark; --fg:#18181b; --bg:#ffffff; --soft:#6b7280; --line:#e4e4e7; --code:#f4f4f5; --link:#1d4ed8; }
@media (prefers-color-scheme: dark) {
  :root { --fg:#e8e8ea; --bg:#17171a; --soft:#9ca3af; --line:#2d2d33; --code:#212126; --link:#7aa5ff; }
}
* { box-sizing: border-box; }
body { margin: 0 auto; padding: 2.5rem 1.25rem 4rem; max-width: 46rem; background: var(--bg); color: var(--fg);
  font: 16px/1.7 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
h1,h2,h3,h4,h5,h6 { line-height: 1.25; margin: 2rem 0 .6rem; }
h1 { font-size: 2rem; letter-spacing: -.02em; } h2 { font-size: 1.5rem; } h3 { font-size: 1.2rem; }
h4,h5,h6 { font-size: 1rem; } h6 { color: var(--soft); text-transform: uppercase; letter-spacing: .08em; font-size: .8rem; }
p, ul, ol, blockquote, pre, table { margin: .85rem 0; }
a { color: var(--link); text-underline-offset: 2px; }
code { background: var(--code); border: 1px solid var(--line); border-radius: 4px; padding: .1em .35em;
  font: .88em/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
pre { background: var(--code); border: 1px solid var(--line); border-radius: 8px; padding: .9rem; overflow-x: auto; }
pre code { background: none; border: 0; padding: 0; font-size: .85rem; }
blockquote { border-left: 3px solid var(--line); color: var(--soft); margin-left: 0; padding: .1rem 0 .1rem 1rem; }
hr { border: 0; border-top: 1px solid var(--line); margin: 2rem 0; }
img { max-width: 100%; height: auto; border-radius: 8px; }
table { border-collapse: collapse; width: 100%; font-size: .92rem; display: block; overflow-x: auto; }
th, td { border-bottom: 1px solid var(--line); padding: .5rem .7rem; text-align: left; }
th { font-weight: 700; }
li.task { list-style: none; margin-left: -1.2rem; }
@media print {
  body { padding: 0; max-width: none; }
  a { color: inherit; text-decoration: underline; }
  pre, blockquote, table { break-inside: avoid; }
}
`.trim();

/** Build the whole file. `title` is taken from the first heading by the caller. */
export function toStandaloneHtml(blocks: Block[], title: string): string {
  const safeTitle = esc(title || "Document");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
${STYLES}
</style>
</head>
<body>
${renderBlocks(blocks)}
</body>
</html>
`;
}

/** The document's title: its first heading, or the first words of its first line. */
export function documentTitle(blocks: Block[]): string {
  const heading = blocks.find((b) => b.kind === "heading");
  if (heading && heading.kind === "heading") return heading.text.slice(0, 80);

  const paragraph = blocks.find((b) => b.kind === "paragraph");
  if (paragraph && paragraph.kind === "paragraph") {
    return inlineText(paragraph.children).trim().split(/\s+/).slice(0, 8).join(" ").slice(0, 80);
  }
  return "";
}

/** A filesystem-safe basename from a title. */
export const fileSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "document";
