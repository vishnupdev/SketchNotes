"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "@/lib/utils";
import { download } from "@/lib/PdfEditor/helpers";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/* ---------------- shared class tokens ---------------- */
export const fieldCls = "flex flex-col gap-1.5 min-w-[120px]";
export const fieldLabelCls =
  "font-mono text-[10px] tracking-[.14em] uppercase text-ink-soft";
export const inputCls =
  "font-[inherit] text-[14px] text-text px-[11px] py-[9px] border-[1.5px] border-border rounded-[9px] bg-paper max-w-full outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold px-[18px] py-[11px] cursor-pointer transition-[transform,box-shadow,background-color] disabled:opacity-40 disabled:pointer-events-none";
export const btnAccent = cx(
  btnBase,
  "border border-accent bg-accent text-white shadow-panel hover:-translate-y-px active:translate-y-px",
);
export const btnGhost = cx(
  btnBase,
  "border border-border bg-transparent text-text hover:border-accent hover:text-accent",
);
export const btnSm =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold px-3 py-[7px] cursor-pointer border transition-colors disabled:opacity-40 disabled:pointer-events-none";

/* ---------------- status + results ---------------- */
export type StatusKind = "" | "busy" | "ok" | "err";
export interface ToolResult {
  id: number;
  name: string;
  data: Uint8Array | Blob;
  mime?: string;
}

export function useToolState() {
  const [status, setStatusState] = useState<{ msg: string; kind: StatusKind }>({
    msg: "",
    kind: "",
  });
  const [results, setResults] = useState<ToolResult[]>([]);
  const idRef = useRef(0);

  const setStatus = useCallback((msg: string, kind: StatusKind = "") => {
    setStatusState({ msg, kind });
  }, []);
  const clearResults = useCallback(() => setResults([]), []);
  const deliver = useCallback(
    (data: Uint8Array | Blob, name: string, mime?: string) => {
      download(data, name, mime);
      setResults((r) => [...r, { id: idRef.current++, name, data, mime }]);
    },
    [],
  );

  return { status, setStatus, results, clearResults, deliver };
}

export function StatusLine({ status }: { status: { msg: string; kind: StatusKind } }) {
  const { msg, kind } = status;
  return (
    <div
      className={cx(
        "mt-3.5 flex min-h-4 items-center gap-2 font-mono text-[12px] leading-relaxed",
        kind === "err" ? "text-danger" : kind === "ok" ? "text-accent" : "text-ink-soft",
      )}
    >
      {kind === "busy" && (
        <span className="size-3 flex-none animate-spin rounded-full border-2 border-border border-t-accent" />
      )}
      {msg}
    </div>
  );
}

export function ResultList({ results }: { results: ToolResult[] }) {
  if (!results.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {results.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => download(r.data, r.name, r.mime)}
          title="Download again"
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-paper px-3 py-2 font-mono text-[12px] hover:border-accent hover:text-accent"
        >
          ⬇ {r.name}
        </button>
      ))}
    </div>
  );
}

/* ---------------- dropzone ---------------- */
export function Dropzone({
  accept,
  multiple,
  filter,
  icon,
  title,
  hint,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  filter: (f: File) => boolean;
  icon: string;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    if (!list) return;
    const fs = [...list].filter(filter);
    if (fs.length) onFiles(fs);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cx(
        "cursor-pointer rounded-xl border-2 border-dashed px-4 py-[30px] text-center transition-colors",
        over ? "border-accent bg-accent-soft" : "border-ink-soft/50 hover:border-accent hover:bg-accent-soft/60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mb-2 text-[26px] leading-none">{icon}</div>
      <b className="mb-1 block font-mono text-[12.5px] tracking-wide">{title}</b>
      <span className="text-[12px] text-ink-soft">{hint}</span>
    </div>
  );
}

/* ---------------- loaded-file chip ---------------- */
export function FileChip({
  name,
  meta,
  onRemove,
}: {
  name: string;
  meta: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-border bg-paper px-3.5 py-[11px]">
      <div className="min-w-0">
        <div className="break-all text-[14px] font-semibold">{name}</div>
        <div className="mt-0.5 font-mono text-[11px] text-ink-soft">{meta}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove file"
        className="grid size-7 flex-none place-items-center rounded-lg border border-border bg-panel text-[13px] hover:border-danger hover:bg-danger hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

/* ---------------- tool frame (header + panel) ---------------- */
export function ToolFrame({
  code,
  title,
  desc,
  children,
}: {
  code: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);
  return (
    <>
      <div className="mb-4 flex flex-col gap-3.5">
        <button
          type="button"
          onClick={() => setPdfTool(null)}
          className="self-start rounded-full border border-border bg-panel px-3.5 py-[7px] font-mono text-[11px] tracking-wide hover:border-accent hover:bg-accent hover:text-white"
        >
          ← All tools
        </button>
        <div>
          <h2 className="flex flex-wrap items-center gap-2.5 text-[25px] font-extrabold tracking-tight">
            <span className="rounded-[5px] border border-accent px-[7px] py-[3px] font-mono text-[10.5px] font-normal tracking-[.18em] text-accent">
              {code}
            </span>
            {title}
          </h2>
          <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-soft">{desc}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-panel">{children}</div>
    </>
  );
}
