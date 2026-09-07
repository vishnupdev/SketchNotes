"use client";

import { useRef, useState } from "react";
import { useSheetsStore } from "@/store/useSheetsStore";
import { ImportIcon, TableIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** A table to look at, for someone arriving with no file to hand. */
const SAMPLE = [
  "region,quarter,units,revenue,margin",
  "South,2026-01-01,412,18540,0.34",
  "South,2026-04-01,388,17010,0.31",
  "North,2026-01-01,915,42980,0.28",
  "North,2026-04-01,1104,52190,0.29",
  "West,2026-01-01,220,11800,0.41",
  "West,2026-04-01,269,14320,0.4",
  "East,2026-01-01,77,3960,0.22",
  "East,2026-04-01,64,3010,0.19",
].join("\n");

/**
 * How a sheet gets in: pick a file, drop one, or paste the text.
 *
 * All three exist because all three are how people actually have a table to
 * hand — a downloaded export, something dragged off the desktop, and a block
 * copied out of another window, which is the one a file picker cannot serve.
 * The file is read in the browser; nothing is uploaded.
 */
export function OpenSheet() {
  const load = useSheetsStore((s) => s.load);
  const [over, setOver] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    load(await file.text(), file.name);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void readFile(file);
        }}
        className={cx(
          "flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed p-8 text-center",
          over ? "border-accent bg-accent-soft" : "border-border bg-panel",
        )}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <TableIcon size={26} />
        </span>

        <div>
          <p className="text-[15px] font-extrabold">Open a table</p>
          <p className="mx-auto mt-1 max-w-[42ch] text-[12.5px] leading-relaxed text-ink-soft">
            A CSV, TSV or any delimited text file. It is read on this device — the delimiter is
            worked out from the file itself, and every column is typed from its values.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent"
          >
            <ImportIcon size={15} />
            Choose a file
          </button>
          <button
            type="button"
            onClick={() => setPasting((value) => !value)}
            aria-expanded={pasting}
            className="tint rounded-full border border-border px-4 py-2.5 text-[13px] font-bold hover:border-accent hover:text-accent"
          >
            Paste text
          </button>
          <button
            type="button"
            onClick={() => load(SAMPLE, "sample.csv")}
            className="rounded-full border border-border px-4 py-2.5 text-[13px] font-semibold text-ink-soft hover:border-accent hover:text-accent"
          >
            Try a sample
          </button>
        </div>

        <input
          ref={input}
          type="file"
          accept=".csv,.tsv,.txt,.tab,text/csv,text/tab-separated-values,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {pasting && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim() !== "") load(text, "pasted.csv");
          }}
          className="flex flex-col gap-2 rounded-[14px] border border-accent/45 bg-panel p-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
              Delimited text
            </span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={7}
              placeholder={"name,qty\nAda,3\nGrace,10"}
              autoFocus
              className="scroll-slim w-full resize-y rounded-xl border border-border bg-paper px-3 py-2.5 font-mono text-[12.5px] outline-none focus-visible:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={text.trim() === ""}
            className="tint self-start rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-on-accent disabled:opacity-45"
          >
            Read it
          </button>
        </form>
      )}
    </div>
  );
}
