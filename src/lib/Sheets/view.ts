/**
 * Sorting and filtering — computed as a list of row indices, never by mutating
 * the sheet.
 *
 * That is the one design decision in this file. The rows loaded from the file
 * are the truth; a view is an ordering over them. So clearing a filter restores
 * every row exactly, an edit lands on the right record however the table is
 * sorted, and "export what I can see" and "export everything" are both
 * answerable — none of which survives sorting the array in place.
 */

import { cellValue, parseNumber, type Column, type ColumnType } from "./csv";

export type SortDirection = "asc" | "desc";

export interface SortSpec {
  column: number;
  direction: SortDirection;
}

/** The operators a column filter offers, per type. */
export type FilterOp =
  | "contains"
  | "equals"
  | "not-equals"
  | "starts"
  | "empty"
  | "not-empty"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export const TEXT_OPS: FilterOp[] = ["contains", "equals", "not-equals", "starts", "empty", "not-empty"];
export const NUMBER_OPS: FilterOp[] = ["equals", "not-equals", "gt", "gte", "lt", "lte", "empty", "not-empty"];

export const OP_LABELS: Record<FilterOp, string> = {
  contains: "contains",
  equals: "is",
  "not-equals": "is not",
  starts: "starts with",
  empty: "is blank",
  "not-empty": "is not blank",
  gt: "is more than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
};

/** Which operators make sense for a column of this type. */
export const opsFor = (type: ColumnType): FilterOp[] =>
  type === "number" || type === "date" ? NUMBER_OPS : TEXT_OPS;

export interface ColumnFilter {
  column: number;
  op: FilterOp;
  value: string;
}

export interface ViewSpec {
  /** Free-text search, matched across every column. */
  query: string;
  filter: ColumnFilter | null;
  sort: SortSpec | null;
}

export const EMPTY_VIEW: ViewSpec = { query: "", filter: null, sort: null };

/**
 * Compare two cells as their column's type.
 *
 * Blanks always sort last, in both directions. Sorting them to the top on
 * descending is technically consistent and useless: the rows you want to see
 * are the ones with values in them.
 */
export function compareCells(a: string, b: string, type: ColumnType): number {
  const left = cellValue(a, type);
  const right = cellValue(b, type);

  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  // `localeCompare` with numeric collation, so "item 2" precedes "item 10".
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function matchesFilter(cell: string, filter: ColumnFilter, type: ColumnType): boolean {
  const value = cell.trim();
  const needle = filter.value.trim();

  switch (filter.op) {
    case "empty":
      return value === "";
    case "not-empty":
      return value !== "";
    case "contains":
      return value.toLowerCase().includes(needle.toLowerCase());
    case "starts":
      return value.toLowerCase().startsWith(needle.toLowerCase());
    case "equals":
    case "not-equals": {
      // Compared as the column's type, so "5" matches "5.0" in a number column
      // and doesn't in a text one.
      const same =
        type === "number"
          ? parseNumber(value) === parseNumber(needle)
          : value.toLowerCase() === needle.toLowerCase();
      return filter.op === "equals" ? same : !same;
    }
    default: {
      const left = cellValue(value, type === "date" ? "date" : "number");
      const right =
        type === "date" ? cellValue(needle, "date") : parseNumber(needle);
      if (typeof left !== "number" || typeof right !== "number") return false;
      if (filter.op === "gt") return left > right;
      if (filter.op === "gte") return left >= right;
      if (filter.op === "lt") return left < right;
      return left <= right;
    }
  }
}

/** True if an operator needs no value typed beside it. */
export const isUnary = (op: FilterOp): boolean => op === "empty" || op === "not-empty";

/**
 * The row indices a view selects, in the order it puts them.
 *
 * Filtering happens before sorting, and the sort is stable — two rows the sort
 * cannot separate stay in file order, so the table doesn't reshuffle its ties
 * every time it re-renders.
 */
export function applyView(columns: Column[], rows: string[][], view: ViewSpec): number[] {
  const query = view.query.trim().toLowerCase();
  let indices = rows.map((_, index) => index);

  if (query !== "") {
    indices = indices.filter((index) =>
      rows[index].some((cell) => cell.toLowerCase().includes(query)),
    );
  }

  const { filter } = view;
  if (filter && columns[filter.column] && (isUnary(filter.op) || filter.value.trim() !== "")) {
    const type = columns[filter.column].type;
    indices = indices.filter((index) =>
      matchesFilter(rows[index][filter.column] ?? "", filter, type),
    );
  }

  const { sort } = view;
  if (sort && columns[sort.column]) {
    const type = columns[sort.column].type;
    const sign = sort.direction === "asc" ? 1 : -1;
    indices = indices
      .map((index, order) => ({ index, order }))
      .sort((a, b) => {
        const result = compareCells(
          rows[a.index][sort.column] ?? "",
          rows[b.index][sort.column] ?? "",
          type,
        );
        return result !== 0 ? result * sign : a.order - b.order;
      })
      .map((entry) => entry.index);
  }

  return indices;
}

/** Cycle a header click: ascending → descending → unsorted. */
export function nextSort(current: SortSpec | null, column: number): SortSpec | null {
  if (!current || current.column !== column) return { column, direction: "asc" };
  if (current.direction === "asc") return { column, direction: "desc" };
  return null;
}
