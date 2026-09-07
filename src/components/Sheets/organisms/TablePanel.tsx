"use client";

import { useMemo, useState } from "react";
import { useSheetsStore } from "@/store/useSheetsStore";
import {
  DELIMITER_NAMES,
  DELIMITERS,
  toCsv,
  toJson,
  toMarkdown,
  type Delimiter,
} from "@/lib/Sheets/csv";
import {
  applyView,
  isUnary,
  OP_LABELS,
  opsFor,
  type FilterOp,
} from "@/lib/Sheets/view";
import { saveBlob } from "@/lib/download";
import { OpenSheet } from "@/components/Sheets/molecules/OpenSheet";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  DownloadIcon,
  SearchIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** Rows revealed at a time. A table of 50,000 <tr>s is a table nobody can use. */
const PAGE = 200;

/**
 * The table: what is in the file, sortable, filterable and editable.
 *
 * Rows are revealed a few hundred at a time rather than paged with numbered
 * buttons — a 50,000-row sheet is 250 pages, and a row of 250 buttons is worse
 * than the problem it solves. The count above the table always states the
 * whole truth ("312 of 12,904 rows"), so the reveal never hides how much there
 * is.
 *
 * Sorting and filtering never touch the rows: they produce an ordering, which
 * is what makes an edit land on the right record however the table is arranged
 * (see `lib/Sheets/view.ts`).
 */
export function TablePanel() {
  const sheet = useSheetsStore((s) => s.sheet);
  const name = useSheetsStore((s) => s.name);
  const transient = useSheetsStore((s) => s.transient);
  const view = useSheetsStore((s) => s.view);
  const setQuery = useSheetsStore((s) => s.setQuery);
  const setFilter = useSheetsStore((s) => s.setFilter);
  const toggleSort = useSheetsStore((s) => s.toggleSort);
  const clearView = useSheetsStore((s) => s.clearView);
  const setCell = useSheetsStore((s) => s.setCell);
  const reparse = useSheetsStore((s) => s.reparse);
  const close = useSheetsStore((s) => s.close);

  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<{ row: number; column: number } | null>(null);

  const indices = useMemo(
    () => (sheet ? applyView(sheet.columns, sheet.rows, view) : []),
    [sheet, view],
  );

  if (!sheet) return <OpenSheet />;

  const filtered = indices.length !== sheet.rows.length;
  const base = name.replace(/\.[^.]+$/, "") || "sheet";

  /** Export what is on screen, in the order it is on screen. */
  const download = (format: "csv" | "tsv" | "md" | "json") => {
    const rows = indices.map((index) => sheet.rows[index]);
    const names = sheet.columns.map((column) => column.name);

    const [text, type, extension] =
      format === "csv"
        ? [toCsv(names, rows, ","), "text/csv", "csv"]
        : format === "tsv"
          ? [toCsv(names, rows, "\t"), "text/tab-separated-values", "tsv"]
          : format === "md"
            ? [toMarkdown(names, rows), "text/markdown", "md"]
            : [toJson(sheet.columns, rows), "application/json", "json"];

    saveBlob(new Blob([text], { type: `${type};charset=utf-8` }), `${base}.${extension}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* One control row above the table, scoping everything below it. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[10rem] flex-1">
          <span className="sr-only">Search every column</span>
          <SearchIcon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={view.query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE);
            }}
            placeholder="Search every column"
            className="w-full rounded-full border border-border bg-panel py-2 pl-9 pr-3 text-[13.5px] outline-none focus-visible:border-accent"
          />
        </label>

        <div className="flex gap-2">
          <ExportMenu onPick={download} />
          <button
            type="button"
            onClick={close}
            className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-danger hover:text-danger"
          >
            <CloseIcon size={14} />
            Close
          </button>
        </div>
      </div>

      <FilterRow
        columns={sheet.columns.map((column) => ({ name: column.name, type: column.type }))}
        filter={view.filter}
        onChange={(filter) => {
          setFilter(filter);
          setShown(PAGE);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-soft">
        <span>
          <strong className="font-semibold text-text tabular-nums">
            {Math.min(shown, indices.length).toLocaleString()}
          </strong>{" "}
          of {indices.length.toLocaleString()} row{indices.length === 1 ? "" : "s"}
          {filtered && ` — ${sheet.rows.length.toLocaleString()} in the file`}
          {" · "}
          {sheet.columns.length} column{sheet.columns.length === 1 ? "" : "s"}
        </span>

        <span className="flex items-center gap-2">
          {(view.query !== "" || view.filter || view.sort) && (
            <button
              type="button"
              onClick={clearView}
              className="font-semibold text-accent underline decoration-dotted"
            >
              Reset view
            </button>
          )}
          <label className="inline-flex items-center gap-1.5">
            <span className="sr-only">Delimiter</span>
            <select
              value={sheet.delimiter}
              onChange={(event) => reparse(event.target.value as Delimiter)}
              className="rounded-full border border-border bg-panel px-2.5 py-1 text-[12px] outline-none focus-visible:border-accent"
            >
              {DELIMITERS.map((delimiter) => (
                <option key={delimiter} value={delimiter}>
                  {DELIMITER_NAMES[delimiter]}
                </option>
              ))}
            </select>
          </label>
        </span>
      </div>

      {(sheet.warnings.length > 0 || transient) && (
        <ul className="flex flex-col gap-1 rounded-xl border border-border bg-panel p-3 text-[12px] leading-snug text-ink-soft">
          {sheet.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
          {transient && (
            <li>
              This file is over 2 MB, so it is not kept when you leave — the table works for as long
              as the tab is open.
            </li>
          )}
        </ul>
      )}

      {/* The table scrolls inside its own box, so a wide sheet never gives the
          page a horizontal scrollbar (rule #3). */}
      <div className="scroll-slim overflow-x-auto rounded-[14px] border border-border bg-panel">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {sheet.columns.map((column, index) => {
                const sorted = view.sort?.column === index ? view.sort.direction : null;
                return (
                  <th key={column.name} scope="col" className="border-b border-border p-0 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort(index)}
                      aria-label={`Sort by ${column.name}`}
                      className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left font-bold hover:text-accent"
                    >
                      <span className="min-w-0 flex-1 truncate">{column.name}</span>
                      <span className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft">
                        {column.type}
                      </span>
                      {sorted === "asc" ? (
                        <ChevronUpIcon size={13} />
                      ) : sorted === "desc" ? (
                        <ChevronDownIcon size={13} />
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {indices.slice(0, shown).map((rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/60 last:border-0">
                {sheet.columns.map((column, columnIndex) => {
                  const value = sheet.rows[rowIndex][columnIndex] ?? "";
                  const active =
                    editing?.row === rowIndex && editing?.column === columnIndex;

                  return (
                    <td
                      key={columnIndex}
                      className={cx(
                        "max-w-[22rem] px-3 py-2 align-top",
                        column.type === "number" && "text-right tabular-nums",
                      )}
                    >
                      {active ? (
                        <input
                          defaultValue={value}
                          autoFocus
                          onBlur={(event) => {
                            setCell(rowIndex, columnIndex, event.target.value);
                            setEditing(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                            if (event.key === "Escape") setEditing(null);
                          }}
                          className="w-full rounded-md border border-accent bg-paper px-1.5 py-1 text-[13px] outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing({ row: rowIndex, column: columnIndex })}
                          className="block w-full truncate text-left hover:text-accent"
                          title={value}
                        >
                          {value === "" ? (
                            <span className="text-ink-soft">—</span>
                          ) : (
                            value
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {indices.length === 0 && (
          <p className="p-6 text-center text-[13px] text-ink-soft">
            Nothing matches. {view.query !== "" && `No cell contains “${view.query}”.`}
          </p>
        )}
      </div>

      {shown < indices.length && (
        <button
          type="button"
          onClick={() => setShown((value) => value + PAGE * 4)}
          className="tint self-center rounded-full border border-border bg-panel px-5 py-2.5 text-[13px] font-bold hover:border-accent hover:text-accent"
        >
          Show {Math.min(PAGE * 4, indices.length - shown).toLocaleString()} more
        </button>
      )}
    </div>
  );
}

/** The column filter — operators offered per the column's own type. */
function FilterRow({
  columns,
  filter,
  onChange,
}: {
  columns: { name: string; type: Parameters<typeof opsFor>[0] }[];
  filter: { column: number; op: FilterOp; value: string } | null;
  onChange: (filter: { column: number; op: FilterOp; value: string } | null) => void;
}) {
  const column = filter?.column ?? 0;
  const ops = opsFor(columns[column]?.type ?? "text");
  const op = filter?.op && ops.includes(filter.op) ? filter.op : ops[0];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Where</span>

      <label>
        <span className="sr-only">Column to filter</span>
        <select
          value={column}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange({ column: next, op: opsFor(columns[next].type)[0], value: "" });
          }}
          className="max-w-[9rem] truncate rounded-full border border-border bg-paper px-2.5 py-1 text-[12.5px] outline-none focus-visible:border-accent"
        >
          {columns.map((item, index) => (
            <option key={item.name} value={index}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Condition</span>
        <select
          value={op}
          onChange={(event) =>
            onChange({ column, op: event.target.value as FilterOp, value: filter?.value ?? "" })
          }
          className="rounded-full border border-border bg-paper px-2.5 py-1 text-[12.5px] outline-none focus-visible:border-accent"
        >
          {ops.map((option) => (
            <option key={option} value={option}>
              {OP_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      {!isUnary(op) && (
        <label className="min-w-[6rem] flex-1">
          <span className="sr-only">Value</span>
          <input
            value={filter?.value ?? ""}
            onChange={(event) => onChange({ column, op, value: event.target.value })}
            placeholder="value"
            className="w-full rounded-full border border-border bg-paper px-3 py-1 text-[12.5px] outline-none focus-visible:border-accent"
          />
        </label>
      )}

      {filter && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Clear the filter"
          className="grid size-7 place-items-center rounded-full border border-border text-ink-soft hover:border-danger hover:text-danger"
        >
          <CloseIcon size={13} />
        </button>
      )}
    </div>
  );
}

function ExportMenu({ onPick }: { onPick: (format: "csv" | "tsv" | "md" | "json") => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
      >
        <DownloadIcon size={14} />
        Export
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-panel shadow-panel">
          {(
            [
              ["csv", "CSV"],
              ["tsv", "TSV (for Excel)"],
              ["md", "Markdown table"],
              ["json", "JSON records"],
            ] as const
          ).map(([format, label]) => (
            <button
              key={format}
              type="button"
              onClick={() => {
                onPick(format);
                setOpen(false);
              }}
              className="block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-accent-soft hover:text-accent"
            >
              {label}
            </button>
          ))}
          <p className="border-t border-border px-3.5 py-2 text-[11px] leading-snug text-ink-soft">
            Exports the rows you can see, in the order you can see them.
          </p>
        </div>
      )}
    </div>
  );
}
