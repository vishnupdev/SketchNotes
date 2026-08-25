"use client";

import { APP_MAP } from "@/components/AppCatalog";
import type { BackupRow } from "@/lib/backup/types";
import { formatBytes } from "@/lib/utils";

/**
 * What a clone holds, app by app.
 *
 * Shown on both sides and for the same reason: cloning is the one operation
 * here that moves *everything*, so the only way to know it did the right thing
 * is to see the list. The sending device shows it before it sends, the
 * receiving device shows it before it writes, and the two lists should match —
 * which is a check anyone can perform with their eyes.
 *
 * Sizes are on every row because they set expectations: a device dominated by
 * one enormous sketchbook is a different transfer from one with fifty small
 * things in it, and the row that explains a slow clone is right there.
 */
export function ContentsSummary({
  rows,
  keys,
  bytes,
  skipped = 0,
  title,
}: {
  rows: BackupRow[];
  keys: number;
  bytes: number;
  /** Keys under a prefix this workspace doesn't own — never carried. */
  skipped?: number;
  title: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-soft">
        There is nothing saved on this device yet to clone.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-paper p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-ink-soft">
          {rows.length} {rows.length === 1 ? "app" : "apps"} · {keys}{" "}
          {keys === 1 ? "item" : "items"} · {formatBytes(bytes)}
        </p>
      </div>

      <ul role="list" className="flex flex-col divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.app ?? "settings"}
            className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]"
          >
            <span className="min-w-0 flex-1 truncate">
              {row.app ? APP_MAP[row.app].name : "Workspace settings"}
            </span>
            <span className="flex-none font-mono text-[11px] text-ink-soft">
              {formatBytes(row.bytes)}
            </span>
          </li>
        ))}
      </ul>

      {skipped > 0 && (
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          {skipped} {skipped === 1 ? "item is" : "items are"} stored under a prefix this workspace
          doesn&apos;t own, so {skipped === 1 ? "it isn't" : "they aren't"} part of the clone.
        </p>
      )}
    </section>
  );
}
