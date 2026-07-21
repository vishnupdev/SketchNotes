"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { fileToBytes, fmtSize, friendly, isPdf } from "@/lib/PdfEditor/helpers";
import {
  Dropzone,
  ResultList,
  StatusLine,
  ToolFrame,
  btnAccent,
  btnGhost,
  useToolState,
} from "@/components/PdfEditor/ui";

interface MergeItem {
  name: string;
  size: number;
  bytes: Uint8Array;
  pages: number;
}

export function MergeTool() {
  const [items, setItems] = useState<MergeItem[]>([]);
  const { status, setStatus, results, clearResults, deliver } = useToolState();

  const add = async (files: File[]) => {
    setStatus("Reading " + files.length + " file" + (files.length > 1 ? "s" : "") + "…", "busy");
    try {
      const next: MergeItem[] = [];
      for (const f of files) {
        const bytes = await fileToBytes(f);
        const doc = await PDFDocument.load(bytes);
        next.push({ name: f.name, size: f.size, bytes, pages: doc.getPageCount() });
      }
      setItems((cur) => [...cur, ...next]);
      setStatus("", "");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  const move = (i: number, dir: -1 | 1) =>
    setItems((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const copy = [...cur];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const remove = (i: number) => setItems((cur) => cur.filter((_, k) => k !== i));

  const run = async () => {
    if (items.length < 2) return setStatus("Add at least two PDFs to merge.", "err");
    clearResults();
    setStatus("Merging…", "busy");
    try {
      const out = await PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        setStatus("Merging " + (i + 1) + " / " + items.length + "…", "busy");
        const src = await PDFDocument.load(items[i].bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      deliver(bytes, "merged.pdf");
      setStatus(
        "Done — " + items.length + " files → " + out.getPageCount() + " pages (" + fmtSize(bytes.length) + ").",
        "ok",
      );
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame code="MRG" title="Merge PDFs" desc="Add two or more PDFs, arrange the order, and press merge.">
      <Dropzone
        accept="application/pdf,.pdf"
        multiple
        filter={isPdf}
        icon="⊞"
        title="Drop PDFs here"
        hint="or tap to browse — add as many as you like"
        onFiles={add}
      />

      <div className="mt-3.5 flex flex-col gap-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[10px] border-[1.5px] border-border bg-panel px-[11px] py-2"
          >
            <span className="w-5 text-right font-mono text-[11px] text-accent">{i + 1}</span>
            <div className="min-w-0">
              <div className="break-all text-[13.5px] font-semibold">{it.name}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-ink-soft">
                {it.pages} page{it.pages !== 1 ? "s" : ""} · {fmtSize(it.size)}
              </div>
            </div>
            <div className="flex gap-1.5">
              <IconBtn label="Move up" onClick={() => move(i, -1)}>↑</IconBtn>
              <IconBtn label="Move down" onClick={() => move(i, 1)}>↓</IconBtn>
              <IconBtn label="Remove" danger onClick={() => remove(i)}>✕</IconBtn>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          {items.length > 1 ? "Merge " + items.length + " PDFs" : "Merge PDFs"}
        </button>
        <button
          className={btnGhost}
          onClick={() => {
            setItems([]);
            clearResults();
            setStatus("", "");
          }}
        >
          Clear list
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}

function IconBtn({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        "grid size-7 place-items-center rounded-[7px] border-[1.5px] border-border bg-paper text-[12px] " +
        (danger ? "hover:border-danger hover:text-danger" : "hover:border-accent hover:text-accent")
      }
    >
      {children}
    </button>
  );
}
