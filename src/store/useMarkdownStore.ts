"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";

const DOC_KEY = "sknotes:markdown:doc";
const PREFS_KEY = "sknotes:markdown:prefs";

/** Enough for a long document, short of the point where re-parsing is felt. */
export const MAX_DOC = 200_000;

/** Which pane is on screen. "split" is desktop-only — see `MarkdownApp`. */
export type MarkdownPane = "write" | "split" | "read";

export const PANES: MarkdownPane[] = ["write", "split", "read"];

const STARTER = `# Markdown Studio

Write on the left, read on the right. Everything is parsed **on this device** —
no upload, no account, works offline.

## What it handles

- **Bold**, _italic_, ~~struck~~, \`inline code\`
- [Links](https://example.com) and images
- Tables, quotes, rules, and nested lists
  - like this one
- [x] Task lists
- [ ] with checkboxes

> Quotes can contain their own blocks, including code.

\`\`\`ts
const greet = (name: string): string => \`Hello, \${name}\`;
\`\`\`

## Diagrams

\`\`\`mermaid
graph LR
  A[Write] --> B[Preview]
  B --> C[Export]
\`\`\`

| Export | Good for |
| :--- | :--- |
| Markdown | Version control, another editor |
| HTML | Emailing, printing, archiving |

Delete all of this and start writing.
`;

interface StoredPrefs {
  pane?: string;
  /** Whether the table of contents is showing. */
  toc?: boolean;
}

interface MarkdownState {
  /** The document. One document, deliberately — see the app's comment. */
  doc: string;
  pane: MarkdownPane;
  toc: boolean;
  ready: boolean;

  setDoc: (doc: string) => void;
  setPane: (pane: MarkdownPane) => void;
  toggleToc: () => void;
  hydrate: () => Promise<void>;
}

const isPane = (v: unknown): v is MarkdownPane => PANES.includes(v as MarkdownPane);

/**
 * Markdown Studio's state.
 *
 * The document is persisted on every keystroke, with no debounce. That is a
 * deliberate call: `lib/storage.ts` writes to IndexedDB off the main thread, a
 * 200 KB string is nothing to it, and the alternative — losing the last few
 * seconds of typing to a closed tab — is the failure people actually remember.
 */
export const useMarkdownStore = create<MarkdownState>((set, get) => ({
  doc: STARTER,
  pane: "split",
  toc: false,
  ready: false,

  setDoc: (doc) => {
    const capped = doc.length > MAX_DOC ? doc.slice(0, MAX_DOC) : doc;
    set({ doc: capped });
    void sSet(DOC_KEY, capped);
  },

  setPane: (pane) => {
    set({ pane });
    void persistPrefs(get());
  },

  toggleToc: () => {
    set({ toc: !get().toc });
    void persistPrefs(get());
  },

  hydrate: async () => {
    const [doc, rawPrefs] = await Promise.all([sGet(DOC_KEY), sGet(PREFS_KEY)]);

    let prefs: StoredPrefs = {};
    try {
      if (rawPrefs) prefs = JSON.parse(rawPrefs) as StoredPrefs;
    } catch {
      /* defaults */
    }

    set({
      // A saved empty document is a real state — someone cleared it — so only a
      // *missing* key falls back to the starter text.
      doc: doc === null || doc === undefined ? STARTER : doc.slice(0, MAX_DOC),
      pane: isPane(prefs.pane) ? prefs.pane : "split",
      toc: prefs.toc === true,
      ready: true,
    });
  },
}));

const persistPrefs = (s: MarkdownState): Promise<void> =>
  sSet(PREFS_KEY, JSON.stringify({ pane: s.pane, toc: s.toc } satisfies StoredPrefs));
