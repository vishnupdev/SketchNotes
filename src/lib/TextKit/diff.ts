/**
 * A line diff.
 *
 * Comparing two versions of something — a config, a paragraph, a copied list —
 * is one of those jobs people reach for a website to do, pasting text they often
 * shouldn't into a stranger's form. It is also a solved algorithm, so it belongs
 * here rather than behind a network request.
 *
 * Longest-common-subsequence over lines, with a size cap: the table is O(n × m),
 * so two 20,000-line files would be 400 million cells and freeze the tab. Past
 * the cap the comparison degrades to "these differ, from line N" — honest, and
 * still useful — rather than pretending or hanging.
 */

export type DiffKind = "same" | "added" | "removed";

export interface DiffRow {
  kind: DiffKind;
  /** 1-based line number on the left, when the row exists there. */
  left?: number;
  /** 1-based line number on the right, when the row exists there. */
  right?: number;
  text: string;
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  /** True when the inputs were too large for a full comparison. */
  truncated: boolean;
}

/** Lines per side above which the full table is not attempted. */
export const DIFF_LINE_LIMIT = 4000;

export function diffLines(leftText: string, rightText: string): DiffResult {
  const left = leftText === "" ? [] : leftText.split(/\r?\n/);
  const right = rightText === "" ? [] : rightText.split(/\r?\n/);

  if (left.length > DIFF_LINE_LIMIT || right.length > DIFF_LINE_LIMIT) {
    return coarse(left, right);
  }

  // lcs[i][j] = length of the longest common subsequence of left[i:] and right[j:]
  const lcs: number[][] = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      lcs[i][j] =
        left[i] === right[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      rows.push({ kind: "same", left: i + 1, right: j + 1, text: left[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ kind: "removed", left: i + 1, text: left[i] });
      removed++;
      i++;
    } else {
      rows.push({ kind: "added", right: j + 1, text: right[j] });
      added++;
      j++;
    }
  }
  while (i < left.length) {
    rows.push({ kind: "removed", left: i + 1, text: left[i] });
    removed++;
    i++;
  }
  while (j < right.length) {
    rows.push({ kind: "added", right: j + 1, text: right[j] });
    added++;
    j++;
  }

  return { rows, added, removed, truncated: false };
}

/**
 * The fallback for very large inputs: find the first and last lines that differ
 * and report the span, without building the table.
 */
function coarse(left: string[], right: string[]): DiffResult {
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start++;
  let endL = left.length - 1;
  let endR = right.length - 1;
  while (endL > start && endR > start && left[endL] === right[endR]) {
    endL--;
    endR--;
  }
  const rows: DiffRow[] = [];
  for (let i = start; i <= endL; i++) rows.push({ kind: "removed", left: i + 1, text: left[i] });
  for (let j = start; j <= endR; j++) rows.push({ kind: "added", right: j + 1, text: right[j] });
  return {
    rows,
    removed: Math.max(0, endL - start + 1),
    added: Math.max(0, endR - start + 1),
    truncated: true,
  };
}

/** Only the rows that changed, plus a little context around each run. */
export function collapseUnchanged(rows: DiffRow[], context = 2): DiffRow[] {
  const keep = new Set<number>();
  rows.forEach((row, i) => {
    if (row.kind === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(rows.length - 1, i + context); k++) {
      keep.add(k);
    }
  });
  return rows.filter((_, i) => keep.has(i));
}
