"use client";

import type { Block, Inline } from "@/lib/Markdown/parse";
import { CodeBlock } from "@/components/SketchNotes/molecules/CodeBlock";
import { MermaidFigure } from "@/components/Markdown/molecules/MermaidFigure";

/**
 * Render a parsed markdown tree as React elements.
 *
 * Every node becomes a real element — there is no `dangerouslySetInnerHTML` in
 * this file, which is the whole reason the parser produces a tree instead of an
 * HTML string. A document pasted from anywhere is inert by construction.
 *
 * Styling is applied per element rather than through a prose plugin, so every
 * colour and size comes from the workspace's theme tokens (rule #6) and the
 * preview matches the rest of the app in any theme.
 */

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.kind) {
          case "text":
            return node.text;
          case "strong":
            return (
              <strong key={i} className="font-bold">
                <InlineNodes nodes={node.children} />
              </strong>
            );
          case "em":
            return (
              <em key={i} className="italic">
                <InlineNodes nodes={node.children} />
              </em>
            );
          case "strike":
            return (
              <s key={i} className="text-ink-soft line-through">
                <InlineNodes nodes={node.children} />
              </s>
            );
          case "code":
            return (
              <code
                key={i}
                className="rounded-[5px] border border-border bg-panel px-1 py-0.5 font-mono text-[.88em]"
              >
                {node.text}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={node.href}
                // Every link in a rendered document is untrusted, so both are
                // unconditional: noopener denies it access to this window, and
                // noreferrer keeps the workspace's URL out of the request.
                target={node.href.startsWith("#") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                <InlineNodes nodes={node.children} />
              </a>
            );
          case "image":
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={node.src}
                alt={node.alt}
                loading="lazy"
                decoding="async"
                className="my-2 h-auto max-w-full rounded-[10px] border border-border"
              />
            );
          case "break":
            return <br key={i} />;
        }
      })}
    </>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-5 mb-2 text-[26px] font-extrabold leading-tight tracking-tight",
  2: "mt-5 mb-2 text-[21px] font-bold leading-tight",
  3: "mt-4 mb-1.5 text-[17px] font-bold",
  4: "mt-3 mb-1 text-[15px] font-bold",
  5: "mt-3 mb-1 text-[13.5px] font-bold uppercase tracking-[.06em]",
  6: "mt-3 mb-1 font-mono text-[12px] uppercase tracking-[.1em] text-ink-soft",
};

function Blocks({ blocks, dark }: { blocks: Block[]; dark: boolean }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading": {
            const Tag = `h${Math.min(6, block.level + 1)}` as "h2";
            // Shifted down one level: the page already has an <h1> (rule #7's
            // heading order), so a document's `#` becomes an h2.
            return (
              <Tag key={i} id={block.slug} className={HEADING_CLASS[block.level]}>
                <InlineNodes nodes={block.children} />
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={i} className="my-2 text-[14.5px] leading-[1.7]">
                <InlineNodes nodes={block.children} />
              </p>
            );

          case "code":
            return block.language.toLowerCase() === "mermaid" ? (
              <MermaidFigure key={i} source={block.text} dark={dark} />
            ) : (
              <div key={i} className="my-3">
                <CodeBlock code={block.text} language={block.language} />
              </div>
            );

          case "quote":
            return (
              <blockquote
                key={i}
                className="my-3 border-l-[3px] border-accent bg-panel py-1 pl-3.5 pr-2 text-ink-soft"
              >
                <Blocks blocks={block.blocks} dark={dark} />
              </blockquote>
            );

          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={i}
                start={block.ordered ? block.start : undefined}
                className={
                  block.ordered
                    ? "my-2 ml-5 flex list-decimal flex-col gap-1"
                    : "my-2 ml-5 flex list-disc flex-col gap-1"
                }
              >
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    // A task item carries its own checkbox, so the bullet would
                    // be a second marker for the same thing.
                    className={item.task === null ? "text-[14.5px] leading-[1.6]" : "list-none text-[14.5px] leading-[1.6]"}
                  >
                    {item.task !== null && (
                      <input
                        type="checkbox"
                        checked={item.task}
                        readOnly
                        // Read-only: this is a rendering of the document, and the
                        // document is the source of truth. Ticking it here would
                        // show a change that the markdown does not contain.
                        aria-label={item.task ? "Done" : "Not done"}
                        className="mr-2 -ml-5 align-middle accent-[var(--accent)]"
                      />
                    )}
                    <InlineNodes nodes={item.children} />
                    {item.sublist && <Blocks blocks={[item.sublist]} dark={dark} />}
                  </li>
                ))}
              </Tag>
            );
          }

          case "rule":
            return <hr key={i} className="my-5 border-t border-border" />;

          case "table":
            return (
              /* Scrolls inside its own container — a wide table must never widen
                 the page (rule #3). */
              <div key={i} className="my-3 overflow-x-auto rounded-[10px] border border-border">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-panel">
                      {block.head.map((cell, j) => (
                        <th
                          key={j}
                          scope="col"
                          className="border-b border-border px-3 py-2 font-bold"
                          style={{ textAlign: block.align[j] ?? "left" }}
                        >
                          <InlineNodes nodes={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className="border-b border-border px-3 py-2 last:border-b-0"
                            style={{ textAlign: block.align[k] ?? "left" }}
                          >
                            <InlineNodes nodes={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

export function MarkdownView({ blocks, dark }: { blocks: Block[]; dark: boolean }) {
  if (blocks.length === 0) {
    return (
      <p className="py-8 text-center text-[13.5px] text-ink-soft">
        Nothing to preview yet — start typing on the left.
      </p>
    );
  }
  return (
    <div className="min-w-0">
      <Blocks blocks={blocks} dark={dark} />
    </div>
  );
}
