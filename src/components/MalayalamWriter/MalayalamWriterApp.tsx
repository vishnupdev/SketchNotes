"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useMalayalamStore } from "@/store/useMalayalamStore";
import { MethodTabs, type InputMethod } from "@/components/MalayalamWriter/molecules/MethodTabs";
import { ManglishInput } from "@/components/MalayalamWriter/molecules/ManglishInput";
import { MalayalamKeyboard } from "@/components/MalayalamWriter/molecules/MalayalamKeyboard";
import { HandwritingPad } from "@/components/MalayalamWriter/molecules/HandwritingPad";
import { cx } from "@/lib/utils";
import { AppsIcon, CopyIcon, DownloadIcon, MalayalamIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Malayalam Writer — compose Malayalam text three ways: phonetic "Manglish"
 * transliteration, an on-screen keyboard, and handwriting (freehand ink or
 * online recognition-to-text). All three feed one document that is persisted
 * to localStorage. Typing/keyboard/transliteration work fully offline; only
 * handwriting recognition uses the network. Rendered natively; theme comes
 * from the shared <body>. Mobile-first single column that widens on desktop.
 */
export function MalayalamWriterApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const text = useMalayalamStore((s) => s.text);
  const setText = useMalayalamStore((s) => s.setText);
  const clear = useMalayalamStore((s) => s.clear);
  const hydrate = useMalayalamStore((s) => s.hydrate);

  const [method, setMethod] = useState<InputMethod>("manglish");
  const [copied, setCopied] = useState(false);
  const docRef = useRef<HTMLTextAreaElement>(null);
  // Caret position to restore after a programmatic insert re-renders the textarea.
  const caretRef = useRef<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Apply the pending caret once the new value has been committed to the DOM.
  useLayoutEffect(() => {
    if (caretRef.current === null) return;
    const ta = docRef.current;
    if (ta) {
      const pos = caretRef.current;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }
    caretRef.current = null;
  });

  /** Insert `str` at the caret (or replace the selection); keep the caret after it. */
  const insert = useCallback(
    (str: string) => {
      const ta = docRef.current;
      const start = ta?.selectionStart ?? text.length;
      const end = ta?.selectionEnd ?? start;
      caretRef.current = start + str.length;
      setText(text.slice(0, start) + str + text.slice(end));
    },
    [text, setText],
  );

  /** Delete the selection, or one character before the caret. */
  const backspace = useCallback(() => {
    const ta = docRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? start;
    if (start !== end) {
      caretRef.current = start;
      setText(text.slice(0, start) + text.slice(end));
    } else if (start > 0) {
      caretRef.current = start - 1;
      setText(text.slice(0, start - 1) + text.slice(start));
    }
  }, [text, setText]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "malayalam.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-on-accent shadow-[0_0_0_4px_var(--accent-soft)]">
              <MalayalamIcon size={26} />
            </span>
            <div>
              <div className="text-[27px] font-extrabold leading-none tracking-tight">Malayalam Writer</div>
              <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                type, tap or handwrite in Malayalam
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">by Vishnu P</div>
            </div>
          </div>

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
      </header>

      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 pb-[80px] pt-[22px]">
        <div className="flex flex-col gap-5">
          {/* The shared document every input method writes into. */}
          <section aria-label="Document" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="ml-doc" className="text-[12.5px] font-semibold text-ink-soft">
                Your Malayalam text
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copy}
                  disabled={!hasText}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:text-text disabled:opacity-40"
                >
                  <CopyIcon size={14} /> {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!hasText}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:text-text disabled:opacity-40"
                >
                  <DownloadIcon size={14} /> Save
                </button>
                <button
                  type="button"
                  onClick={clear}
                  disabled={!hasText}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:text-text disabled:opacity-40"
                >
                  <TrashSmallIcon size={14} /> Clear
                </button>
              </div>
            </div>
            <textarea
              id="ml-doc"
              ref={docRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              lang="ml"
              rows={6}
              placeholder="നിങ്ങളുടെ എഴുത്ത് ഇവിടെ വരും…"
              className="w-full resize-y rounded-2xl border border-border bg-paper px-4 py-3.5 text-[18px] leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent"
            />
            <div className="text-right text-[11px] text-ink-soft">{[...text].length} characters</div>
          </section>

          <MethodTabs method={method} onMethod={setMethod} />

          <section
            aria-label="Input method"
            className={cx("rounded-2xl border border-border bg-panel/40 p-4")}
          >
            {method === "manglish" && <ManglishInput onInsert={insert} />}
            {method === "keyboard" && <MalayalamKeyboard onInsert={insert} onBackspace={backspace} />}
            {method === "handwriting" && <HandwritingPad onInsert={insert} />}
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
