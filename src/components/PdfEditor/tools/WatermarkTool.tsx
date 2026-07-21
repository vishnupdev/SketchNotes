"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { baseName, fmtSize, friendly, isPdf, sanitizeText } from "@/lib/PdfEditor/helpers";
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

const WM_COLORS: Record<string, ReturnType<typeof rgb>> = {
  gray: rgb(0.55, 0.55, 0.55),
  red: rgb(0.82, 0.16, 0.1),
  blue: rgb(0.14, 0.22, 0.91),
  black: rgb(0.08, 0.08, 0.1),
};

export function WatermarkTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [text, setText] = useState("CONFIDENTIAL");
  const [size, setSize] = useState(48);
  const [angle, setAngle] = useState("45");
  const [color, setColor] = useState("gray");
  const [opacity, setOpacity] = useState(15);

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
    const txt = sanitizeText(text.trim());
    if (!txt) return setStatus("Enter the watermark text.", "err");
    clearResults();
    setStatus("Stamping " + file.pageCount + " page" + (file.pageCount !== 1 ? "s" : "") + "…", "busy");
    try {
      const sz = Math.min(160, Math.max(10, size || 48));
      const ang = parseInt(angle, 10) || 0;
      const op = (opacity || 15) / 100;
      const col = WM_COLORS[color] || WM_COLORS.gray;

      const doc = await PDFDocument.load(file.bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const tw = font.widthOfTextAtSize(txt, sz);
      const rad = (ang * Math.PI) / 180;

      for (const page of doc.getPages()) {
        const { width, height } = page.getSize();
        page.drawText(txt, {
          x: width / 2 - (tw / 2) * Math.cos(rad),
          y: height / 2 - (tw / 2) * Math.sin(rad) - sz / 3,
          size: sz,
          font,
          color: col,
          opacity: op,
          rotate: degrees(ang),
        });
      }
      const bytes = await doc.save();
      deliver(bytes, baseName(file.name) + "-watermarked.pdf");
      setStatus(
        "Done — “" + txt + "” stamped on " + file.pageCount + " page" + (file.pageCount !== 1 ? "s" : "") + ".",
        "ok",
      );
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame code="WMK" title="Watermark" desc="Stamp a line of text across every page.">
      {!file ? (
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="≈"
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
        <label className={fieldCls} style={{ flex: 1, minWidth: 180 }}>
          <span className={fieldLabelCls}>Watermark text</span>
          <input type="text" className={inputCls} value={text} autoComplete="off" onChange={(e) => setText(e.target.value)} />
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Size</span>
          <input
            type="number"
            className={inputCls}
            style={{ width: 84 }}
            min={10}
            max={160}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10) || 48)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3.5">
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Angle</span>
          <select className={inputCls} value={angle} onChange={(e) => setAngle(e.target.value)}>
            <option value="45">Diagonal</option>
            <option value="0">Straight</option>
          </select>
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Color</span>
          <select className={inputCls} value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="gray">Gray</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="black">Black</option>
          </select>
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Opacity</span>
          <div className="flex items-center gap-2.5">
            <input
              type="range"
              className="accent-accent"
              min={5}
              max={60}
              step={5}
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
            />
            <output className="font-mono text-[12px]">{opacity}%</output>
          </div>
        </label>
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          Stamp watermark
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
