"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import {
  inferType,
  parseSheet,
  toCsv,
  type Delimiter,
  type ParsedSheet,
} from "@/lib/Sheets/csv";
import { EMPTY_VIEW, nextSort, type ColumnFilter, type ViewSpec } from "@/lib/Sheets/view";
import { AGGREGATIONS, type Aggregation, type ChartKind } from "@/lib/Sheets/chart";

const PREFS_KEY = "sknotes:sheets:prefs";
/** The sheet itself, kept so a reload doesn't lose the file you opened. */
const SHEET_KEY = "sknotes:sheets:last";

/**
 * Past this, the sheet is not kept across a reload.
 *
 * A 2 MB CSV is a large table and a reasonable thing to keep; a 40 MB export is
 * both slow to re-parse on every visit and a real share of the origin's quota,
 * which every other app here has to live within. Over the cap the table still
 * works for as long as the tab is open, and the app says it won't be kept.
 */
export const KEEP_LIMIT = 2_000_000;

export type SheetsTool = "table" | "stats" | "chart";

export const SHEETS_TOOLS: SheetsTool[] = ["table", "stats", "chart"];

interface SheetsState {
  tool: SheetsTool;
  /** The parsed sheet, or null when nothing has been opened. */
  sheet: ParsedSheet | null;
  /** What the file was called, for the export's filename. */
  name: string;
  /** True when the sheet was too big to keep across a reload. */
  transient: boolean;

  view: ViewSpec;

  /** Which column the stats panel is describing. */
  statColumn: number;

  chart: {
    kind: ChartKind;
    label: number;
    value: number;
    aggregation: Aggregation;
  };

  setTool: (tool: SheetsTool) => void;
  hydrate: () => Promise<void>;
  load: (text: string, name: string, delimiter?: Delimiter) => void;
  /** Re-read the same text with a different delimiter. */
  reparse: (delimiter: Delimiter) => void;
  close: () => void;

  setQuery: (query: string) => void;
  setFilter: (filter: ColumnFilter | null) => void;
  toggleSort: (column: number) => void;
  clearView: () => void;

  setStatColumn: (column: number) => void;
  setChart: (chart: Partial<SheetsState["chart"]>) => void;
  /** Edit one cell. */
  setCell: (row: number, column: number, value: string) => void;
}

/** The raw text, kept out of the store so a re-parse needn't hold two copies. */
let source = "";

/**
 * Sheets' state.
 *
 * The parsed sheet is the truth and the view is an ordering over it (see
 * `lib/Sheets/view.ts`), so nothing here ever sorts or filters the rows in
 * place. Editing a cell re-infers that column's type, because changing the one
 * "n/a" in a column of numbers is exactly how a text column becomes a numeric
 * one, and leaving it typed as text would leave it unchartable for no reason.
 */
export const useSheetsStore = create<SheetsState>((set, get) => ({
  tool: "table",
  sheet: null,
  name: "sheet.csv",
  transient: false,
  view: EMPTY_VIEW,
  statColumn: 0,
  chart: { kind: "bar", label: 0, value: 1, aggregation: "sum" },

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (raw) {
      try {
        const prefs = JSON.parse(raw) as Partial<SheetsState>;
        set({
          tool: SHEETS_TOOLS.includes(prefs.tool as SheetsTool)
            ? (prefs.tool as SheetsTool)
            : "table",
          chart: {
            kind: prefs.chart?.kind === "line" ? "line" : "bar",
            label: Number(prefs.chart?.label) || 0,
            value: Number(prefs.chart?.value) || 1,
            aggregation: AGGREGATIONS.includes(prefs.chart?.aggregation as Aggregation)
              ? (prefs.chart?.aggregation as Aggregation)
              : "sum",
          },
        });
      } catch {
        /* corrupt prefs are simply the defaults */
      }
    }

    const kept = await sGet(SHEET_KEY);
    if (kept) {
      try {
        const { name, text } = JSON.parse(kept) as { name: string; text: string };
        source = text;
        set({ sheet: parseSheet(text), name, transient: false });
      } catch {
        /* an unreadable saved sheet is simply no saved sheet */
      }
    }
  },

  load: (text, name, delimiter) => {
    source = text;
    const sheet = parseSheet(text, delimiter);
    const transient = text.length > KEEP_LIMIT;

    set({
      sheet,
      name,
      transient,
      // A new file's columns have nothing to do with the last one's, so every
      // view and selection starts over rather than pointing at a column that
      // is now something else entirely.
      view: EMPTY_VIEW,
      statColumn: 0,
      chart: {
        ...get().chart,
        label: 0,
        // Default the value axis to the first numeric column, which is what
        // someone charting a table almost always means.
        value: Math.max(
          0,
          sheet.columns.findIndex((column) => column.type === "number"),
        ),
      },
    });

    void (transient ? sSet(SHEET_KEY, "") : sSet(SHEET_KEY, JSON.stringify({ name, text })));
  },

  reparse: (delimiter) => {
    if (source === "") return;
    set({ sheet: parseSheet(source, delimiter), view: EMPTY_VIEW });
  },

  close: () => {
    source = "";
    set({ sheet: null, name: "sheet.csv", transient: false, view: EMPTY_VIEW, statColumn: 0 });
    void sSet(SHEET_KEY, "");
  },

  setQuery: (query) => set({ view: { ...get().view, query } }),
  setFilter: (filter) => set({ view: { ...get().view, filter } }),
  toggleSort: (column) => set({ view: { ...get().view, sort: nextSort(get().view.sort, column) } }),
  clearView: () => set({ view: EMPTY_VIEW }),

  setStatColumn: (statColumn) => set({ statColumn }),

  setChart: (chart) => {
    set({ chart: { ...get().chart, ...chart } });
    void persist(get());
  },

  setCell: (row, column, value) => {
    const sheet = get().sheet;
    if (!sheet || !sheet.rows[row]) return;

    const rows = sheet.rows.map((existing, index) =>
      index === row ? existing.map((cell, at) => (at === column ? value : cell)) : existing,
    );

    // Re-infer the edited column: fixing the one value that didn't parse is how
    // a text column legitimately becomes a numeric one.
    const values = rows.map((r) => r[column] ?? "");
    const columns = sheet.columns.map((existing, index) =>
      index === column
        ? {
            ...existing,
            type: inferType(values),
            blanks: values.filter((cell) => cell.trim() === "").length,
          }
        : existing,
    );

    const next = { ...sheet, rows, columns };
    set({ sheet: next });
    if (!get().transient) {
      void sSet(SHEET_KEY, JSON.stringify({ name: get().name, text: sourceOf(next) }));
    }
  },
}));

/** The edited sheet, back as text, so what is kept matches what is shown. */
const sourceOf = (sheet: ParsedSheet): string =>
  toCsv(
    sheet.columns.map((column) => column.name),
    sheet.rows,
    sheet.delimiter,
  );

const persist = (state: SheetsState): Promise<void> =>
  sSet(PREFS_KEY, JSON.stringify({ tool: state.tool, chart: state.chart }));
