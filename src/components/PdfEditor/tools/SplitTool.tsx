"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { baseName, fmtSize, friendly, isPdf, parseRanges } from "@/lib/PdfEditor/helpers";
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

export function SplitTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [mode, setMode] = useState<"ranges" | "each">("ranges");
  const [ranges, setRanges] = useState("");

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
    try {
      const src = await PDFDocument.load(file.bytes);
      const base = baseName(file.name);

      if (mode === "each") {
        const zip = new JSZip();
        for (let i = 0; i < file.pageCount; i++) {
          setStatus("Splitting page " + (i + 1) + " / " + file.pageCount + "…", "busy");
          const nd = await PDFDocument.create();
          const [p] = await nd.copyPages(src, [i]);
          nd.addPage(p);
          zip.file(base + "-page-" + (i + 1) + ".pdf", await nd.save());
        }
        setStatus("Zipping…", "busy");
        const blob = await zip.generateAsync({ type: "blob" });
        deliver(blob, base + "-pages.zip", "application/zip");
        setStatus("Done — " + file.pageCount + " single-page PDFs in one ZIP.", "ok");
        return;
      }

      const { groups, labels } = parseRanges(ranges, file.pageCount);
      if (groups.length === 1) {
        setStatus("Extracting pages " + labels[0] + "…", "busy");
        const nd = await PDFDocument.create();
        (await nd.copyPages(src, groups[0])).forEach((p) => nd.addPage(p));
        const bytes = await nd.save();
        deliver(bytes, base + "-pages-" + labels[0] + ".pdf");
        setStatus(
          "Done — " + groups[0].length + " page" + (groups[0].length !== 1 ? "s" : "") + " extracted.",
          "ok",
        );
      } else {
        const zip = new JSZip();
        for (let k = 0; k < groups.length; k++) {
          setStatus("Building part " + (k + 1) + " / " + groups.length + "…", "busy");
          const nd = await PDFDocument.create();
          (await nd.copyPages(src, groups[k])).forEach((p) => nd.addPage(p));
          zip.file(base + "-part" + (k + 1) + "-p" + labels[k] + ".pdf", await nd.save());
        }
        setStatus("Zipping…", "busy");
        const blob = await zip.generateAsync({ type: "blob" });
        deliver(blob, base + "-split.zip", "application/zip");
        setStatus("Done — " + groups.length + " PDFs in one ZIP.", "ok");
      }
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame
      code="SPL"
      title="Split PDF"
      desc="Pull out custom ranges (each range becomes its own file), or burst every page into a separate PDF."
    >
      {!file ? (
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="✂"
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

      <div className="mt-4 flex flex-wrap gap-3.5">
        {(["ranges", "each"] as const).map((m) => (
          <label
            key={m}
            className={
              "inline-flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] " +
              (mode === m ? "border-accent bg-accent-soft" : "border-border bg-panel")
            }
          >
            <input
              type="radio"
              name="split-mode"
              className="accent-accent"
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            {m === "ranges" ? "Custom ranges" : "Every page → separate PDF"}
          </label>
        ))}
      </div>

      {mode === "ranges" && (
        <div className="mt-4 flex flex-wrap gap-3.5">
          <label className={fieldCls} style={{ flex: 1, minWidth: 220 }}>
            <span className={fieldLabelCls}>Pages / ranges</span>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. 1-3, 5, 8-"
              autoComplete="off"
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
            />
          </label>
        </div>
      )}
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        {mode === "each"
          ? "Every page becomes its own PDF, delivered as a ZIP."
          : "Comma-separated. “8-” means page 8 to the end. Multiple ranges download as a ZIP."}
      </p>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          Split PDF
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}
