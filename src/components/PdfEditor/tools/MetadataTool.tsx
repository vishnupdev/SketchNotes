"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
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

const EMPTY = { title: "", author: "", subject: "", keywords: "", creator: "", producer: "" };

export function MetadataTool() {
  const { file, load, clear } = useSinglePdf();
  const { status, setStatus, results, clearResults, deliver } = useToolState();
  const [fields, setFields] = useState({ ...EMPTY });

  const onFiles = async (files: File[]) => {
    setStatus("Reading " + files[0].name + "…", "busy");
    try {
      const it = await load(files[0]);
      const d = it.doc;
      const get = (fn: () => string | undefined) => {
        try {
          return fn() || "";
        } catch {
          return "";
        }
      };
      setFields({
        title: get(() => d.getTitle()),
        author: get(() => d.getAuthor()),
        subject: get(() => d.getSubject()),
        keywords: get(() => d.getKeywords()),
        creator: get(() => d.getCreator()),
        producer: get(() => d.getProducer()),
      });
      clearResults();
      setStatus("", "");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const run = async () => {
    if (!file) return setStatus("Add a PDF first.", "err");
    clearResults();
    setStatus("Writing metadata…", "busy");
    try {
      const doc = await PDFDocument.load(file.bytes);
      doc.setTitle(fields.title.trim());
      doc.setAuthor(fields.author.trim());
      doc.setSubject(fields.subject.trim());
      doc.setKeywords(fields.keywords.split(",").map((s) => s.trim()).filter(Boolean));
      doc.setCreator(fields.creator.trim());
      doc.setProducer(fields.producer.trim());
      doc.setModificationDate(new Date());
      const bytes = await doc.save();
      deliver(bytes, baseName(file.name) + "-updated.pdf");
      setStatus("Done — metadata saved.", "ok");
    } catch (e) {
      setStatus(friendly(e), "err");
    }
  };

  return (
    <ToolFrame code="INF" title="Metadata" desc="Read and rewrite the document information fields.">
      {!file ? (
        <Dropzone
          accept="application/pdf,.pdf"
          filter={isPdf}
          icon="ℹ"
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
            setFields({ ...EMPTY });
            clearResults();
            setStatus("", "");
          }}
        />
      )}

      <div className="mt-4 grid grid-cols-1 gap-3.5 min-[560px]:grid-cols-2">
        <Field label="Title" value={fields.title} onChange={set("title")} />
        <Field label="Author" value={fields.author} onChange={set("author")} />
        <Field label="Subject" value={fields.subject} onChange={set("subject")} />
        <Field label="Keywords (comma-separated)" value={fields.keywords} onChange={set("keywords")} />
        <Field label="Creator" value={fields.creator} onChange={set("creator")} />
        <Field label="Producer" value={fields.producer} onChange={set("producer")} />
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button className={btnAccent} onClick={run}>
          Save metadata
        </button>
      </div>
      <StatusLine status={status} />
      <ResultList results={results} />
    </ToolFrame>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={fieldCls}>
      <span className={fieldLabelCls}>{label}</span>
      <input type="text" className={inputCls} value={value} onChange={onChange} />
    </label>
  );
}
