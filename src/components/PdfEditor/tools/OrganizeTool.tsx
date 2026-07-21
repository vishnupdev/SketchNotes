"use client";

import { useRef, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { baseName, fmtSize, friendly, isPdf } from "@/lib/PdfEditor/helpers";
import { getPdfjs } from "@/lib/PdfEditor/pdfjs";
import { useSinglePdf, type LoadedPdf } from "@/lib/PdfEditor/useSinglePdf";
import {
  Dropzone,
  FileChip,
  ResultList,
  StatusLine,
  ToolFrame,
  btnAccent,
  btnSm,
  useToolState,
} from "@/components/PdfEditor/ui";
import { cx } from "@/lib/utils";

interface PageItem {
  uid: string;
  src: number; // original 0-based index
  rot: number; // extra rotation applied here
  orig: number; // page's original rotation
  sel: boolean;
  thumb: string; // data URL
}

const smGhost = cx(btnSm, "border-border bg-panel text-text hover:border-accent hover:text-accent");
const smSolid = cx(btnSm, "border-accent bg-accent text-white");

export function OrganizeTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [pages, setPages] = useState<PageItem[]>([]);
  const uidRef = useRef(0);
  const dragUid = useRef<string | null>(null);
  const pjRef = useRef<import("pdfjs-dist").PDFDocumentLoadingTask | null>(null);

  const buildThumbs = async (item: LoadedPdf) => {
    if (pjRef.current) {
      pjRef.current.destroy();
      pjRef.current = null;
    }
    const pdfjs = await getPdfjs();
    const task = pdfjs.getDocument({ data: item.bytes.slice() });
    pjRef.current = task;
    const pj = await task.promise;
    const out: PageItem[] = [];
    for (let i = 0; i < item.pageCount; i++) {
      setStatus("Rendering page " + (i + 1) + " / " + item.pageCount + "…", "busy");
      const page = await pj.getPage(i + 1);
      const vp0 = page.getViewport({ scale: 1 });
      const scale = 300 / Math.max(vp0.width, vp0.height);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
      out.push({
        uid: String(uidRef.current++),
        src: i,
        rot: 0,
        orig: item.doc.getPage(i).getRotation().angle,
        sel: false,
        thumb: canvas.toDataURL("image/png"),
      });
    }
    setPages(out);
    setStatus(item.pageCount + " pages loaded — tap to select, drag to reorder.", "ok");
  };

  const onFiles = async (files: File[]) => {
    setStatus("Reading " + files[0].name + "…", "busy");
    try {
      const item = await load(files[0]);
      clearResults();
      await buildThumbs(item);
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  const reset = () => {
    if (file) buildThumbs(file).catch((e) => setStatus(friendly(e), "err"));
  };

  const anySel = pages.some((p) => p.sel);
  const setSel = (uid: string, sel: boolean) =>
    setPages((cur) => cur.map((p) => (p.uid === uid ? { ...p, sel } : p)));
  const selectAll = (v: boolean) => setPages((cur) => cur.map((p) => ({ ...p, sel: v })));

  const reorder = (over: string) => {
    const from = dragUid.current;
    if (!from || from === over) return;
    setPages((cur) => {
      const fi = cur.findIndex((p) => p.uid === from);
      const ti = cur.findIndex((p) => p.uid === over);
      if (fi < 0 || ti < 0 || fi === ti) return cur;
      const copy = [...cur];
      const [m] = copy.splice(fi, 1);
      copy.splice(ti, 0, m);
      return copy;
    });
  };

  const moveSel = (dir: -1 | 1) => {
    if (!anySel) return setStatus("Select at least one page to move.", "err");
    setPages((cur) => {
      const ps = [...cur];
      if (dir < 0) {
        for (let i = 0; i < ps.length; i++)
          if (ps[i].sel && i > 0 && !ps[i - 1].sel) [ps[i - 1], ps[i]] = [ps[i], ps[i - 1]];
      } else {
        for (let i = ps.length - 1; i >= 0; i--)
          if (ps[i].sel && i < ps.length - 1 && !ps[i + 1].sel) [ps[i + 1], ps[i]] = [ps[i], ps[i + 1]];
      }
      return ps;
    });
    setStatus("Moved selection.", "ok");
  };

  const rotate = () => {
    setPages((cur) => {
      const anyChosen = cur.some((p) => p.sel);
      const next = cur.map((p) =>
        !anyChosen || p.sel ? { ...p, rot: (p.rot + 90) % 360 } : p,
      );
      const count = anyChosen ? cur.filter((p) => p.sel).length : cur.length;
      setStatus("Rotated " + count + " page" + (count !== 1 ? "s" : "") + ".", "ok");
      return next;
    });
  };

  const del = () => {
    const sel = pages.filter((p) => p.sel);
    if (!sel.length) return setStatus("Select the pages to delete first.", "err");
    if (sel.length === pages.length) return setStatus("Keep at least one page.", "err");
    setPages((cur) => cur.filter((p) => !p.sel));
    setStatus("Deleted " + sel.length + " page" + (sel.length !== 1 ? "s" : "") + ". Apply to download.", "ok");
  };

  const buildFromPages = async (subset: PageItem[]) => {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(file!.doc, subset.map((p) => p.src));
    copied.forEach((pg, k) => {
      const total = (((subset[k].orig + subset[k].rot) % 360) + 360) % 360;
      pg.setRotation(degrees(total));
      out.addPage(pg);
    });
    return out.save();
  };

  const extract = async () => {
    if (!file) return;
    const sel = pages.filter((p) => p.sel);
    if (!sel.length) return setStatus("Select the pages to extract first.", "err");
    clearResults();
    setStatus("Extracting " + sel.length + " page" + (sel.length !== 1 ? "s" : "") + "…", "busy");
    try {
      const bytes = await buildFromPages(sel);
      deliver(bytes, baseName(file.name) + "-extract.pdf");
      setStatus("Done — extracted " + sel.length + " page" + (sel.length !== 1 ? "s" : "") + ".", "ok");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  const apply = async () => {
    if (!file) return;
    if (!pages.length) return setStatus("Nothing to save.", "err");
    clearResults();
    setStatus("Building PDF…", "busy");
    try {
      const bytes = await buildFromPages(pages);
      deliver(bytes, baseName(file.name) + "-edited.pdf");
      setStatus("Done — " + pages.length + " pages (" + fmtSize(bytes.length) + ").", "ok");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  const removeFile = () => {
    if (pjRef.current) {
      pjRef.current.destroy();
      pjRef.current = null;
    }
    clear();
    setPages([]);
    clearResults();
    setStatus("", "");
  };

  return (
    <ToolFrame
      code="ORG"
      title="Organize pages"
      desc="Tap pages to select them. Drag to reorder. Rotate, delete or extract the selection, then apply."
    >
      {!file ? (
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="⧉"
          title="Drop a PDF here"
          hint="or tap to browse — pages appear as thumbnails"
          onFiles={onFiles}
        />
      ) : (
        <FileChip
          name={file.name}
          meta={file.pageCount + " page" + (file.pageCount !== 1 ? "s" : "") + " · " + fmtSize(file.size)}
          onRemove={removeFile}
        />
      )}

      {pages.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={smGhost} onClick={() => selectAll(true)}>Select all</button>
            <button className={smGhost} onClick={() => selectAll(false)}>Clear selection</button>
            <button className={smGhost} onClick={() => moveSel(-1)}>◀ Move</button>
            <button className={smGhost} onClick={() => moveSel(1)}>Move ▶</button>
            <button className={smSolid} onClick={rotate}>⟳ Rotate 90°</button>
            <button className={smSolid} onClick={del}>Delete</button>
            <button className={smSolid} onClick={extract}>Extract selected</button>
            <button className={smGhost} onClick={reset}>Reset</button>
          </div>

          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-3">
            {pages.map((p) => (
              <figure
                key={p.uid}
                draggable
                onClick={() => setSel(p.uid, !p.sel)}
                onDragStart={() => (dragUid.current = p.uid)}
                onDragEnter={() => reorder(p.uid)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => (dragUid.current = null)}
                className={cx(
                  "relative cursor-grab select-none rounded-[10px] border-[1.5px] bg-panel p-1.5",
                  p.sel ? "border-accent ring-2 ring-accent/40" : "border-border",
                )}
              >
                <div className="grid h-[138px] place-items-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumb}
                    alt=""
                    className="max-h-full max-w-full shadow-[0_2px_10px_rgba(0,0,0,.45)] transition-transform"
                    style={{
                      transform: `rotate(${p.rot}deg)${p.rot % 180 !== 0 ? " scale(.78)" : ""}`,
                    }}
                  />
                </div>
                <figcaption className="mt-1.5 flex justify-between px-0.5 font-mono text-[10px] text-ink-soft">
                  <span>p.{p.src + 1}</span>
                  <span className="text-accent">{p.rot ? "⟳" + p.rot + "°" : ""}</span>
                </figcaption>
                {p.sel && (
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">
                    ✓
                  </span>
                )}
              </figure>
            ))}
          </div>

          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <button className={btnAccent} onClick={apply}>
              Apply &amp; download
            </button>
          </div>
        </>
      )}

      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
