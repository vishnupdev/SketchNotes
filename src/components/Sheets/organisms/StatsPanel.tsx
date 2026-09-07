"use client";

import { useMemo } from "react";
import { useSheetsStore } from "@/store/useSheetsStore";
import { formatNumber, summarize } from "@/lib/Sheets/stats";
import { OpenSheet } from "@/components/Sheets/molecules/OpenSheet";
import { ChipBar } from "@/components/SketchNotes/molecules/ChipBar";

/**
 * What a column actually contains.
 *
 * The figures are ordered by what reveals a problem, not by what a spreadsheet
 * puts in its status bar. Blanks and distinct counts come first, because "this
 * column has 400 blanks" and "this column of 5,000 rows has 3 distinct values"
 * are the two things that change what you do next. The mean and the median sit
 * side by side for the same reason: when they disagree, the column is skewed,
 * and averaging it is about to mislead you.
 */
export function StatsPanel() {
  const sheet = useSheetsStore((s) => s.sheet);
  const statColumn = useSheetsStore((s) => s.statColumn);
  const setStatColumn = useSheetsStore((s) => s.setStatColumn);

  const index = sheet ? Math.min(statColumn, sheet.columns.length - 1) : 0;
  const summary = useMemo(
    () => (sheet && sheet.columns[index] ? summarize(sheet.columns[index], sheet.rows, index) : null),
    [index, sheet],
  );

  if (!sheet) return <OpenSheet />;
  if (!summary) return null;

  const column = sheet.columns[index];

  return (
    <div className="flex flex-col gap-4">
      <ChipBar
        label="Columns"
        items={sheet.columns.map((item, at) => ({
          id: String(at),
          label: item.name,
          hint: `${item.type} column`,
        }))}
        value={String(index)}
        onChange={(id) => setStatColumn(Number(id))}
      />

      <div className="rounded-[14px] border border-border bg-panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-extrabold">{column.name}</h2>
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            {column.type}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Figure label="Values" value={summary.count.toLocaleString()} />
          <Figure
            label="Blank"
            value={summary.blanks.toLocaleString()}
            note={
              summary.blanks > 0
                ? `${Math.round((summary.blanks / (summary.count + summary.blanks)) * 100)}% of rows`
                : undefined
            }
          />

          {summary.kind === "number" && (
            <>
              <Figure label="Total" value={formatNumber(summary.sum)} />
              <Figure label="Mean" value={formatNumber(summary.mean)} />
              <Figure
                label="Median"
                value={formatNumber(summary.median)}
                note={
                  Math.abs(summary.mean - summary.median) >
                  Math.abs(summary.mean || 1) * 0.15
                    ? "well off the mean — skewed"
                    : undefined
                }
              />
              <Figure label="Lowest" value={formatNumber(summary.min)} />
              <Figure label="Highest" value={formatNumber(summary.max)} />
              <Figure label="Std deviation" value={formatNumber(summary.stdDev)} />
              <Figure
                label="Middle half"
                value={`${formatNumber(summary.p25)} – ${formatNumber(summary.p75)}`}
                note="25th to 75th percentile"
              />
            </>
          )}

          {summary.kind === "date" && (
            <>
              <Figure label="Distinct days" value={summary.days.toLocaleString()} />
              <Figure
                label="Earliest"
                value={new Date(summary.earliest).toLocaleDateString()}
              />
              <Figure label="Latest" value={new Date(summary.latest).toLocaleDateString()} />
            </>
          )}

          {summary.kind === "category" && (
            <Figure
              label="Distinct"
              value={summary.distinct.toLocaleString()}
              note={
                summary.distinct === summary.count
                  ? "every value unique — an id, not a category"
                  : undefined
              }
            />
          )}
        </dl>
      </div>

      {summary.kind === "category" && summary.top.length > 0 && (
        <div className="rounded-[14px] border border-border bg-panel p-4">
          <h3 className="text-[13px] font-bold">Commonest values</h3>
          <ul className="mt-2.5 flex flex-col gap-2">
            {summary.top.map((entry) => (
              <li key={entry.value} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-[13px]" title={entry.value}>
                  {entry.value}
                </span>
                {/* The bar is a proportion, so it needs no axis — the count
                    beside it carries the number. */}
                <span className="h-1.5 w-24 flex-none overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(3, entry.share * 100)}%` }}
                  />
                </span>
                <span className="w-20 flex-none text-right font-mono text-[12px] tabular-nums text-ink-soft">
                  {entry.count.toLocaleString()} · {Math.round(entry.share * 100)}%
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11.5px] leading-snug text-ink-soft">
            Shortest value “{summary.shortest}”, longest “{summary.longest}”. A single very long
            value in a short column is usually a field that swallowed a delimiter.
          </p>
        </div>
      )}
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">{label}</dt>
      <dd className="text-[18px] font-bold leading-tight tabular-nums">{value}</dd>
      {note && <dd className="text-[11px] leading-snug text-ink-soft">{note}</dd>}
    </div>
  );
}
