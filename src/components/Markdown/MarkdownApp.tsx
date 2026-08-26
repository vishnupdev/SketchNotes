"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { MAX_DOC, useMarkdownStore, type MarkdownPane } from "@/store/useMarkdownStore";
import { useTheme } from "@/hooks/useTheme";
import { documentStats, parseMarkdown, tableOfContents } from "@/lib/Markdown/parse";
import { documentTitle, fileSlug, toStandaloneHtml } from "@/lib/Markdown/export";
import { copyText, downloadText } from "@/lib/export-text";
import { MarkdownView } from "@/components/Markdown/molecules/MarkdownView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import {
  AppsIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  ListChecksIcon,
  MarkdownIcon,
  PenIcon,
  WidthIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const PANE_TABS: { id: MarkdownPane; label: string; icon: React.ReactNode }[] = [
  { id: "write", label: "Write", icon: <PenIcon size={15} /> },
  { id: "split", label: "Split", icon: <WidthIcon size={15} /> },
  { id: "read", label: "Read", icon: <EyeIcon size={15} /> },
];

/**
 * Markdown Studio — write markdown, see it rendered, take it away.
 *
 * **One document, not a library.** Sketchnotes already holds many notes and
 * Snippets already holds many fragments; a third collection to manage would be the
 * wrong answer. This is the scratchpad you write the README, the design doc or the
 * meeting notes in, and then export. It persists, so it is never lost, but its job
 * ends at the export.
 *
 * The split view is desktop-only, and that is not a limitation — two 180px columns
 * on a phone are useless to both writing and reading, so narrow screens get the
 * tabs and the full width (rule #3).
 *
 * Nothing is uploaded, and the rendering never goes through HTML: see
 * `lib/Markdown/parse.ts` for why that matters.
 */
export function MarkdownApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const doc = useMarkdownStore((s) => s.doc);
  const setDoc = useMarkdownStore((s) => s.setDoc);
  const pane = useMarkdownStore((s) => s.pane);
  const setPane = useMarkdownStore((s) => s.setPane);
  const showToc = useMarkdownStore((s) => s.toc);
  const toggleToc = useMarkdownStore((s) => s.toggleToc);
  const hydrate = useMarkdownStore((s) => s.hydrate);
  const { dark } = useTheme();

  const [copied, setCopied] = useState(false);

  // Adopt the saved document once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // One parse per edit, shared by the preview, the contents and the counts —
  // parsing three times for three consumers would be the obvious mistake here.
  const blocks = useMemo(() => parseMarkdown(doc), [doc]);
  const stats = useMemo(() => documentStats(blocks), [blocks]);
  const toc = useMemo(() => tableOfContents(blocks), [blocks]);
  const title = useMemo(() => documentTitle(blocks), [blocks]);

  const copyMarkdown = async () => {
    if (!(await copyText(doc))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const slug = fileSlug(title);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[14px] pt-[22px]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<MarkdownIcon size={24} />}
            name="Markdown"
            tagline="write it, read it, take it away"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>

        <div className="mx-auto mt-3 flex max-w-[1200px] flex-wrap items-center gap-2">
          {/* The split option is hidden below 900px rather than disabled: an
              option that exists but never works is worse than one that doesn't. */}
          <div
            role="tablist"
            aria-label="Editor layout"
            className="inline-flex gap-1 rounded-xl border border-border bg-panel p-1"
          >
            {PANE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={pane === tab.id}
                onClick={() => setPane(tab.id)}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                  tab.id === "split" && "hidden min-[900px]:inline-flex",
                  pane === tab.id ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleToc}
            aria-pressed={showToc}
            disabled={toc.length === 0}
            title="Table of contents"
            className={cx(
              "tint inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40",
              showToc
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:border-accent hover:text-accent",
            )}
          >
            <ListChecksIcon size={14} />
            Contents
          </button>

          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
              {stats.words.toLocaleString()} words · {stats.minutes} min read
            </span>
            <button
              type="button"
              onClick={() => void copyMarkdown()}
              className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => downloadText(doc, `${slug}.md`, "text/markdown")}
              className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
            >
              <DownloadIcon size={14} />
              .md
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(toStandaloneHtml(blocks, title), `${slug}.html`, "text/html")
              }
              title="A standalone HTML file — styles inlined, no external requests"
              className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
            >
              <DownloadIcon size={14} />
              .html
            </button>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-4">
        {showToc && toc.length > 0 && (
          <nav
            aria-label="Table of contents"
            className="mb-3 rounded-[14px] border border-border bg-panel p-3"
          >
            <ul className="flex flex-col gap-0.5">
              {toc.map((entry, i) => (
                <li key={`${entry.slug}-${i}`} style={{ paddingLeft: `${(entry.level - 1) * 14}px` }}>
                  <a
                    href={`#${entry.slug}`}
                    className={cx(
                      "block truncate py-0.5 text-[12.5px] hover:text-accent",
                      entry.level === 1 ? "font-bold" : "text-ink-soft",
                    )}
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div
          className={cx(
            "grid gap-3",
            pane === "split" ? "min-[900px]:grid-cols-2" : "grid-cols-1",
          )}
        >
          {pane !== "read" && (
            <div className="flex min-w-0 flex-col">
              <label
                htmlFor="markdown-doc"
                className="mb-1 font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
              >
                Markdown
              </label>
              <textarea
                id="markdown-doc"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                spellCheck
                placeholder="# Start writing"
                className="min-h-[60vh] w-full flex-1 resize-y rounded-[12px] border-[1.5px] border-border bg-paper px-3 py-2.5 font-mono text-[13px] leading-[1.65] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
                {doc.length.toLocaleString()} / {MAX_DOC.toLocaleString()} characters ·{" "}
                {stats.headings} headings · {stats.codeBlocks} code blocks · {stats.links} links
              </p>
            </div>
          )}

          {pane !== "write" && (
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
                Preview
              </span>
              <div className="min-h-[60vh] flex-1 overflow-x-auto rounded-[12px] border border-border bg-panel px-4 py-3">
                <MarkdownView blocks={blocks} dark={dark} />
              </div>
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
