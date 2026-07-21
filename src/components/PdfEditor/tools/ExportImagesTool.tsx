"use client";

import { useState } from "react";
import JSZip from "jszip";
import { baseName, fmtSize, friendly, isPdf } from "@/lib/PdfEditor/helpers";
import { getPdfjs } from "@/lib/PdfEditor/pdfjs";
import { useSinglePdf } from "@/lib/PdfEditor/useSinglePdf";
import {
  Dropzone,
  FileChip,
  ResultList,
  StatusLine,
  ToolFrame,
  btnAccent,
  fieldCls,
  fieldLabelCls,
  inputCls,
  useToolState,
} from "@/components/PdfEditor/ui";

export function ExportImagesTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [format, setFormat] = useState("png");
  const [scale, setScale] = useState("2");

  const onFiles = async (files: File[]) => {
    setStatus("Reading " + files[0].name + "…", "busy");
    try {
      await load(files[0]);
      clearResults();
      setStatus("", "");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  const run = async () => {
    if (!file) return setStatus("Add a PDF first.", "err");
    clearResults();
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const ext = format === "jpeg" ? "jpg" : "png";
    const sc = parseInt(scale, 10) || 2;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | null = null;
    try {
      const pdfjs = await getPdfjs();
      task = pdfjs.getDocument({ data: file.bytes.slice() });
      const doc = await task.promise;
      const n = doc.numPages;
      const base = baseName(file.name);
      const blobs: Blob[] = [];
      for (let i = 1; i <= n; i++) {
        setStatus("Rendering page " + i + " / " + n + "…", "busy");
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: sc });
        const c = document.createElement("canvas");
        c.width = vp.width;
        c.height = vp.height;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise;
        blobs.push(await new Promise<Blob>((res) => c.toBlob((b) => res(b!), mime, 0.92)));
      }
      if (n === 1) {
        deliver(blobs[0], base + "." + ext, mime);
        setStatus("Done — 1 page exported as " + format.toUpperCase() + ".", "ok");
      } else {
        setStatus("Zipping " + n + " images…", "busy");
        const zip = new JSZip();
        blobs.forEach((b, i) => zip.file(base + "-page-" + (i + 1) + "." + ext, b));
        const blob = await zip.generateAsync({ type: "blob" });
        deliver(blob, base + "-images.zip", "application/zip");
        setStatus("Done — " + n + " " + format.toUpperCase() + "s in one ZIP.", "ok");
      }
    } catch (e) {
      setStatus(friendly(e), "err");
    } finally {
      if (task) task.destroy();
    }
  };

  return (
    <ToolFrame
      code="EXP"
      title="PDF → Images"
      desc="Render every page to an image. One page downloads directly; more get zipped."
    >
      {!file ? (
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="🖻"
          title="Drop a PDF here"
          hint="or tap to browse"
          onFiles={onFiles}
        />
      ) : (
        <FileChip
          name={file.name}
          meta={file.pageCount + " page" + (file.pageCount !== 1 ? "s" : "") + " · " + fmtSize(file.size)}
          onRemove={() => {
            clear();
            clearResults();
            setStatus("", "");
          }}
        />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3.5">
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Format</span>
          <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Quality</span>
          <select className={inputCls} value={scale} onChange={(e) => setScale(e.target.value)}>
            <option value="1">Standard (1×)</option>
            <option value="2">Sharp (2×)</option>
            <option value="3">Print (3×)</option>
          </select>
        </label>
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          Export images
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
