"use client";

import { useState } from "react";
import { PDFDocument, type PDFImage } from "pdf-lib";
import { A4, LETTER, fileToBytes, fmtSize, friendly, isImg } from "@/lib/PdfEditor/helpers";
import {
  Dropzone,
  ResultList,
  StatusLine,
  ToolFrame,
  btnAccent,
  btnGhost,
  fieldCls,
  fieldLabelCls,
  inputCls,
  useToolState,
} from "@/components/PdfEditor/ui";

interface ImgItem {
  file: File;
  name: string;
  size: number;
  url: string;
}

async function embedAnyImage(doc: PDFDocument, file: File): Promise<PDFImage> {
  if (file.type === "image/jpeg") return doc.embedJpg(await fileToBytes(file));
  if (file.type === "image/png") return doc.embedPng(await fileToBytes(file));
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
  return doc.embedPng(new Uint8Array(await blob!.arrayBuffer()));
}

export function ImagesTool() {
  const [items, setItems] = useState<ImgItem[]>([]);
  const [mode, setMode] = useState("auto");
  const { status, setStatus, results, clearResults, deliver } = useToolState();

  const add = (files: File[]) => {
    setItems((cur) => [
      ...cur,
      ...files.map((f) => ({ file: f, name: f.name, size: f.size, url: URL.createObjectURL(f) })),
    ]);
    setStatus("", "");
  };
  const move = (i: number, dir: -1 | 1) =>
    setItems((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const copy = [...cur];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const remove = (i: number) =>
    setItems((cur) => {
      URL.revokeObjectURL(cur[i].url);
      return cur.filter((_, k) => k !== i);
    });
  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    clearResults();
    setStatus("", "");
  };

  const run = async () => {
    if (!items.length) return setStatus("Add at least one image.", "err");
    clearResults();
    try {
      const doc = await PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        setStatus("Placing image " + (i + 1) + " / " + items.length + "…", "busy");
        const img = await embedAnyImage(doc, items[i].file);
        if (mode === "auto") {
          const w = Math.max(72, img.width * 0.75);
          const h = Math.max(72, img.height * 0.75);
          doc.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
        } else {
          const dims = mode === "letter" ? [...LETTER] : [...A4];
          const p = doc.addPage(dims as [number, number]);
          const m = 36,
            availW = dims[0] - m * 2,
            availH = dims[1] - m * 2;
          const s = Math.min(availW / img.width, availH / img.height);
          const dw = img.width * s,
            dh = img.height * s;
          p.drawImage(img, { x: (dims[0] - dw) / 2, y: (dims[1] - dh) / 2, width: dw, height: dh });
        }
      }
      doc.setProducer("PDF Editor");
      const bytes = await doc.save();
      deliver(bytes, "images.pdf");
      setStatus(
        "Done — " + items.length + " image" + (items.length !== 1 ? "s" : "") + " → 1 PDF (" + fmtSize(bytes.length) + ").",
        "ok",
      );
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame
      code="IMG"
      title="Images → PDF"
      desc="JPG, PNG, WebP or GIF — each image becomes a page, in the order you set."
    >
      <Dropzone
        accept="image/*"
        multiple
        filter={isImg}
        icon="🖼"
        title="Drop images here"
        hint="or tap to browse"
        onFiles={add}
      />

      <div className="mt-3.5 flex flex-col gap-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[10px] border-[1.5px] border-border bg-panel px-[11px] py-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt="" className="size-[38px] rounded-[7px] border border-border object-cover" />
            <div className="min-w-0">
              <div className="break-all text-[13.5px] font-semibold">{it.name}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-ink-soft">{fmtSize(it.size)}</div>
            </div>
            <div className="flex gap-1.5">
              <MiniBtn label="Move up" onClick={() => move(i, -1)}>↑</MiniBtn>
              <MiniBtn label="Move down" onClick={() => move(i, 1)}>↓</MiniBtn>
              <MiniBtn label="Remove" danger onClick={() => remove(i)}>✕</MiniBtn>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3.5">
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Page size</span>
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="auto">Match each image</option>
            <option value="a4">Fit to A4</option>
            <option value="letter">Fit to Letter</option>
          </select>
        </label>
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          {items.length ? "Create PDF (" + items.length + " image" + (items.length !== 1 ? "s" : "") + ")" : "Create PDF"}
        </button>
        <button className={btnGhost} onClick={clearAll}>
          Clear list
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}

function MiniBtn({
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
