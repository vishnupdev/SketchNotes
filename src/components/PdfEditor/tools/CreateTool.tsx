"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { A4, LETTER, fmtSize, friendly, sanitizeText, slug, wrapLine } from "@/lib/PdfEditor/helpers";
import {
  ResultList,
  StatusLine,
  ToolFrame,
  btnAccent,
  fieldCls,
  fieldLabelCls,
  inputCls,
  useToolState,
} from "@/components/PdfEditor/ui";

const FONT_SETS: Record<string, [StandardFonts, StandardFonts]> = {
  Helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
  TimesRoman: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
  Courier: [StandardFonts.Courier, StandardFonts.CourierBold],
};

export function CreateTool() {
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [page, setPage] = useState("a4");
  const [font, setFont] = useState("Helvetica");
  const [size, setSize] = useState(12);

  const run = async () => {
    if (!text.trim()) return setStatus("Type or paste some text first.", "err");
    clearResults();
    setStatus("Typesetting…", "busy");
    try {
      const cleanTitle = sanitizeText(title.trim());
      const body = sanitizeText(text);
      const sz = Math.min(32, Math.max(8, size || 12));
      const dims = page === "letter" ? [...LETTER] : [...A4];
      const [fReg, fBold] = FONT_SETS[font] || FONT_SETS.Helvetica;

      const doc = await PDFDocument.create();
      const reg = await doc.embedFont(fReg);
      const bold = await doc.embedFont(fBold);
      const [W, H] = dims;
      const margin = 64,
        maxW = W - margin * 2,
        lh = sz * 1.5;
      const ink = rgb(0.08, 0.08, 0.1);

      let pg = doc.addPage(dims as [number, number]);
      let y = H - margin;
      const ensure = (space: number) => {
        if (y - space < margin) {
          pg = doc.addPage(dims as [number, number]);
          y = H - margin;
        }
      };

      if (cleanTitle) {
        const ts = Math.round(sz * 1.8);
        for (const ln of wrapLine(cleanTitle, bold, ts, maxW)) {
          ensure(ts * 1.25);
          pg.drawText(ln, { x: margin, y: y - ts, size: ts, font: bold, color: ink });
          y -= ts * 1.25;
        }
        y -= sz * 1.1;
      }

      for (const para of body.split("\n")) {
        if (!para.trim()) {
          y -= lh * 0.6;
          continue;
        }
        for (const ln of wrapLine(para, reg, sz, maxW)) {
          ensure(lh);
          pg.drawText(ln, { x: margin, y: y - sz, size: sz, font: reg, color: ink });
          y -= lh;
        }
      }

      if (cleanTitle) doc.setTitle(cleanTitle);
      doc.setProducer("PDF Editor");
      doc.setCreator("PDF Editor");
      const bytes = await doc.save();
      deliver(bytes, slug(cleanTitle) + ".pdf");
      setStatus(
        "Done — " + doc.getPageCount() + " page" + (doc.getPageCount() !== 1 ? "s" : "") + " (" + fmtSize(bytes.length) + ").",
        "ok",
      );
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame
      code="TXT"
      title="Text → PDF"
      desc="Paste or write text and get a clean, paginated PDF. Latin characters supported by the built-in fonts."
    >
      <div className="flex flex-wrap gap-3.5">
        <label className={fieldCls} style={{ flex: 1, minWidth: 220 }}>
          <span className={fieldLabelCls}>Document title (optional)</span>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. Meeting notes"
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3.5">
        <label className={fieldCls} style={{ flex: 1, width: "100%" }}>
          <span className={fieldLabelCls}>Body text</span>
          <textarea
            className={inputCls + " min-h-[200px] w-full resize-y leading-relaxed"}
            placeholder="Type or paste your text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3.5">
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Page size</span>
          <select className={inputCls} value={page} onChange={(e) => setPage(e.target.value)}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <label className={fieldCls}>
          <span className={fieldLabelCls}>Font</span>
          <select className={inputCls} value={font} onChange={(e) => setFont(e.target.value)}>
            <option value="Helvetica">Helvetica</option>
            <option value="TimesRoman">Times Roman</option>
            <option value="Courier">Courier</option>
          </select>
        </label>
        <label className={fieldCls} style={{ minWidth: 0 }}>
          <span className={fieldLabelCls}>Font size</span>
          <input
            type="number"
            className={inputCls}
            style={{ width: 84 }}
            min={8}
            max={32}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10) || 12)}
          />
        </label>
      </div>
      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          Create PDF
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
