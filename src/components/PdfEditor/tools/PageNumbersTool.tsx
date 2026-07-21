"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { baseName, fmtSize, friendly, isPdf } from "@/lib/PdfEditor/helpers";
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

export function PageNumbersTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [pos, setPos] = useState("bc");
  const [format, setFormat] = useState("n");
  const [size, setSize] = useState(11);

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
    setStatus("Numbering…", "busy");
    try {
      const sz = Math.min(24, Math.max(7, size || 11));
      const doc = await PDFDocument.load(file.bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const n = doc.getPageCount();
      const gray = rgb(0.32, 0.32, 0.36);

      doc.getPages().forEach((page, i) => {
        const label =
          format === "page"
            ? "Page " + (i + 1) + " of " + n
            : format === "slash"
              ? i + 1 + " / " + n
              : String(i + 1);
        const { width, height } = page.getSize();
        const tw = font.widthOfTextAtSize(label, sz);
        const x = pos === "bl" ? 40 : pos === "br" ? width - 40 - tw : (width - tw) / 2;
        const y = pos === "tc" ? height - 30 - sz : 30;
        page.drawText(label, { x, y, size: sz, font, color: gray });
      });

      const bytes = await doc.save();
      deliver(bytes, baseName(file.name) + "-numbered.pdf");
      setStatus("Done — numbers added to " + n + " page" + (n !== 1 ? "s" : "") + ".", "ok");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame code="NUM" title="Page numbers" desc="Add numbering to every page.">
      {!file ? (
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="№"
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
          <span className={fieldLabelCls}>Position</span>
          <select className={inputCls} value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="bc">Bottom center</option>
            <option value="br">Bottom right</option>
            <option value="bl">Bottom left</option>
            <option value="tc">Top center</option>
          </select>
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Format</span>
          <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="n">1</option>
            <option value="slash">1 / 12</option>
            <option value="page">Page 1 of 12</option>
          </select>
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Size</span>
          <input
            type="number"
            className={inputCls}
            style={{ width: 84 }}
            min={7}
            max={24}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10) || 11)}
          />
        </label>
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          Add numbers
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
