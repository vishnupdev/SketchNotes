"use client";

import { useMemo, useState } from "react";
import { useSheetsStore } from "@/store/useSheetsStore";
import {
  AGGREGATION_LABELS,
  AGGREGATIONS,
  buildSeries,
  fraction,
  niceScale,
  tickLabel,
  type Aggregation,
  type ChartKind,
} from "@/lib/Sheets/chart";
import { formatNumber } from "@/lib/Sheets/stats";
import { applyView } from "@/lib/Sheets/view";
import { OpenSheet } from "@/components/Sheets/molecules/OpenSheet";
import { BarChartIcon, LineChartIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * One chart, of one series, honestly.
 *
 * The rules it follows are the ones that decide whether a chart is true:
 *
 *  - **One value axis.** Two measures at different scales are two charts, so
 *    there is no second axis to offer.
 *  - **A bar's scale includes zero**, because bar length *is* the value. The
 *    line chart floats its baseline, where position rather than length carries
 *    the reading, and the axis says where it starts.
 *  - **One series, one colour** — the app's accent. Shading each bar by its own
 *    value would spend the only free channel restating the length.
 *  - **The chart is never the only way to read a number.** It charts what the
 *    Table tab is showing, filters included, and that tab is the table view.
 *
 * Identity is carried by the labels beside the marks rather than by colour, and
 * only the extreme is direct-labelled — a number on every bar goes unread.
 */
export function ChartPanel() {
  const sheet = useSheetsStore((s) => s.sheet);
  const view = useSheetsStore((s) => s.view);
  const chart = useSheetsStore((s) => s.chart);
  const setChart = useSheetsStore((s) => s.setChart);

  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => {
    if (!sheet) return null;
    // Charts what the table is showing: a filter that scopes the table has to
    // scope the chart, or the two disagree about the same data.
    const rows = applyView(sheet.columns, sheet.rows, view).map((index) => sheet.rows[index]);
    return buildSeries(sheet.columns, rows, chart.label, chart.value, chart.aggregation, chart.kind);
  }, [chart, sheet, view]);

  if (!sheet) return <OpenSheet />;
  if (!series) return null;

  const columnOptions = sheet.columns.map((column, index) => ({
    value: String(index),
    label: column.name,
  }));
  const values = series.points.map((point) => point.value);
  const scale = niceScale(values, chart.kind === "bar");
  const biggest = values.length > 0 ? Math.max(...values) : 0;
  const smallest = values.length > 0 ? Math.min(...values) : 0;

  const valueName = sheet.columns[chart.value]?.name ?? "";
  const labelName = sheet.columns[chart.label]?.name ?? "";
  const measure =
    chart.aggregation === "count"
      ? "Rows"
      : `${AGGREGATION_LABELS[chart.aggregation]} of ${valueName}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls in one row above the chart, scoping all of it. */}
      <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-panel px-3 py-2.5">
        <div className="flex gap-1.5">
          {(
            [
              ["bar", "Bars", <BarChartIcon key="b" size={15} />],
              ["line", "Line", <LineChartIcon key="l" size={15} />],
            ] as const
          ).map(([kind, label, icon]) => (
            <button
              key={kind}
              type="button"
              onClick={() => setChart({ kind: kind as ChartKind })}
              aria-pressed={chart.kind === kind}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold",
                chart.kind === kind ? "bg-accent text-on-accent" : "border border-border text-ink-soft",
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <Picker
          label="Group by"
          value={String(chart.label)}
          options={columnOptions}
          onChange={(label) => setChart({ label: Number(label) })}
        />

        <Picker
          label="Measure"
          value={chart.aggregation}
          options={AGGREGATIONS.map((aggregation) => ({
            value: aggregation,
            label: AGGREGATION_LABELS[aggregation],
          }))}
          onChange={(aggregation) => setChart({ aggregation: aggregation as Aggregation })}
        />

        {chart.aggregation !== "count" && (
          <Picker
            label="Of"
            value={String(chart.value)}
            options={columnOptions}
            onChange={(value) => setChart({ value: Number(value) })}
          />
        )}
      </div>

      {series.points.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-panel p-6 text-center text-[13px] text-ink-soft">
          Nothing to chart — every row in this view has an empty{" "}
          <strong className="font-semibold text-text">{labelName}</strong>.
        </p>
      ) : (
        <figure className="m-0 flex flex-col gap-2 rounded-[14px] border border-border bg-panel p-4">
          <figcaption>
            {/* One series, so the title names it — no legend box needed. */}
            <h2 className="text-[15px] font-extrabold leading-tight">
              {measure} by {labelName}
            </h2>
            <p className="text-[11.5px] text-ink-soft">
              {series.points.length} {chart.kind === "bar" ? "bars" : "points"}
              {series.folded > 0 && ` — the smallest ${series.folded} folded into “Other”`}
              {chart.kind === "line" && scale.min !== 0 && ` · axis starts at ${tickLabel(scale.min)}`}
            </p>
          </figcaption>

          {chart.kind === "bar" ? (
            <ul className="mt-1 flex flex-col gap-1.5">
              {series.points.map((point, index) => {
                const zero = fraction(0, scale);
                const at = fraction(point.value, scale);
                // Bars grow from wherever zero sits, so a negative value goes
                // the other way instead of being drawn as a positive one.
                const left = Math.min(zero, at);
                const width = Math.abs(at - zero);

                return (
                  <li
                    key={point.label}
                    onPointerEnter={() => setHover(index)}
                    onPointerLeave={() => setHover(null)}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className="w-[7.5rem] flex-none truncate text-right text-[12px] text-ink-soft"
                      title={point.label}
                    >
                      {point.label}
                    </span>

                    <span className="relative h-5 min-w-0 flex-1">
                      {/* Hairline grid, one shade off the surface, solid. */}
                      {scale.ticks.map((tick) => (
                        <span
                          key={tick}
                          aria-hidden="true"
                          className="absolute top-0 h-full border-l border-border/70"
                          style={{ left: `${fraction(tick, scale) * 100}%` }}
                        />
                      ))}
                      <span
                        className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-[4px] bg-accent"
                        style={{ left: `${left * 100}%`, width: `${Math.max(width * 100, 0.6)}%` }}
                      />
                      {/* Direct-label only the extremes; the rest is on hover
                          and in the table. */}
                      {(point.value === biggest || point.value === smallest || hover === index) && (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-1.5 text-[11px] font-semibold tabular-nums"
                          style={{ left: `${(left + width) * 100}%` }}
                        >
                          {formatNumber(point.value)}
                          {hover === index && (
                            <span className="pl-1.5 font-normal text-ink-soft">
                              {point.rows} row{point.rows === 1 ? "" : "s"}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <LineChart
              points={series.points}
              scale={scale}
              hover={hover}
              onHover={setHover}
              measure={measure}
            />
          )}

          <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-ink-soft">
            {scale.ticks.map((tick) => (
              <span key={tick}>{tickLabel(tick)}</span>
            ))}
          </div>
        </figure>
      )}

      <p className="text-[11.5px] leading-snug text-ink-soft">
        The chart follows the table&apos;s search and filter, so what is plotted is what the Table tab
        is showing. Every value is readable there as well — a chart should never be the only way to
        read a number.
      </p>
    </div>
  );
}

/** The line chart: SVG, because a line needs real geometry. */
function LineChart({
  points,
  scale,
  hover,
  onHover,
  measure,
}: {
  points: { label: string; value: number; rows: number }[];
  scale: ReturnType<typeof niceScale>;
  hover: number | null;
  onHover: (index: number | null) => void;
  measure: string;
}) {
  const width = 100;
  const height = 46;
  const step = points.length > 1 ? width / (points.length - 1) : 0;

  const at = (index: number, value: number) => ({
    x: points.length > 1 ? index * step : width / 2,
    y: height - fraction(value, scale) * height,
  });

  const path = points
    .map((point, index) => {
      const { x, y } = at(index, point.value);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label={`${measure} over ${points.length} points, from ${points[0]?.label} to ${points[points.length - 1]?.label}`}
      >
        {scale.ticks.map((tick) => (
          <line
            key={tick}
            x1={0}
            x2={width}
            y1={height - fraction(tick, scale) * height}
            y2={height - fraction(tick, scale) * height}
            stroke="var(--border)"
            strokeWidth={0.3}
          />
        ))}

        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={0.9}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((point, index) => {
          const { x, y } = at(index, point.value);
          return (
            <circle
              key={point.label}
              cx={x}
              cy={y}
              r={hover === index ? 1.5 : 0.9}
              fill="var(--accent)"
              stroke="var(--panel)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* A hit strip per point, far wider than the marker — landing on an
            8px dot dead-centre is not a hover target. */}
        {points.map((point, index) => (
          <rect
            key={`hit-${point.label}`}
            x={at(index, point.value).x - step / 2}
            y={0}
            width={Math.max(step, 4)}
            height={height}
            fill="transparent"
            onPointerEnter={() => onHover(index)}
            onPointerLeave={() => onHover(null)}
          />
        ))}
      </svg>

      {active && (
        <p className="mt-1 text-center text-[12px]">
          <strong className="font-semibold">{active.label}</strong>{" "}
          <span className="tabular-nums">{formatNumber(active.value)}</span>{" "}
          <span className="text-ink-soft">
            · {active.rows} row{active.rows === 1 ? "" : "s"}
          </span>
        </p>
      )}
    </div>
  );
}

/** A labelled select, used for all three chart controls. */
function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[10rem] truncate rounded-full border border-border bg-paper px-2.5 py-1.5 text-[12.5px] outline-none focus-visible:border-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
