"use client";

import { APP_MAP } from "@/components/AppCatalog";
import type { ClonePlan, PlanEffect, RestoreMode } from "@/lib/Clone/types";
import { cx, formatBytes } from "@/lib/utils";

/**
 * What this clone would do to the device it has landed on — the screen that
 * stands between an arriving clone and work that is already here.
 *
 * Two decisions are made on this one screen, and they are deliberately not
 * separated: the mode, and whether to go ahead. Choosing "replace" rewrites the
 * table underneath the buttons, so the consequence is visible in the same
 * glance as the choice, and nobody has to hold "replace deletes things" in
 * their head while looking at a list that doesn't show it.
 *
 * Colour is never the only signal (rule #7): every row is also labelled in
 * words, so the destructive ones read as destructive in greyscale, to a screen
 * reader, and to anyone who doesn't see red.
 */

const EFFECT_LABEL: Record<PlanEffect, string> = {
  new: "Arrives",
  overwrite: "Replaced",
  keep: "Untouched",
  erase: "Deleted",
};

const EFFECT_CLASS: Record<PlanEffect, string> = {
  new: "border-accent/40 bg-accent-soft text-accent",
  overwrite: "border-accent/40 bg-accent-soft text-accent",
  keep: "border-border bg-panel text-ink-soft",
  erase: "border-danger/40 bg-danger/10 text-danger",
};

const MODES: Array<{ id: RestoreMode; label: string; detail: string }> = [
  {
    id: "merge",
    label: "Add to this device",
    detail:
      "Everything the clone carries is written. Anything on this device the clone doesn't mention is left exactly as it is.",
  },
  {
    id: "replace",
    label: "Make this device identical",
    detail:
      "Everything the clone carries is written, and anything else this workspace saved here is deleted. This is what cloning a device onto a new one means — and it cannot be undone.",
  },
];

export function PlanTable({
  plan,
  onMode,
  busy,
  onApply,
  onCancel,
}: {
  /**
   * The plan, already computed for the chosen mode. Everything on this screen —
   * the radios, the table and the button — reads from this one value, so the
   * choice and its consequence can never disagree.
   */
  plan: ClonePlan;
  onMode: (mode: RestoreMode) => void;
  busy: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const destructive = plan.mode === "replace" && plan.removals > 0;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          How should it land?
        </legend>
        {MODES.map((option) => (
          <label
            key={option.id}
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              plan.mode === option.id
                ? option.id === "replace"
                  ? "border-danger bg-danger/10"
                  : "border-accent bg-accent-soft"
                : "border-border bg-panel hover:border-accent",
            )}
          >
            <input
              type="radio"
              name="clone-mode"
              value={option.id}
              checked={plan.mode === option.id}
              onChange={() => onMode(option.id)}
              className="mt-0.5 size-4 flex-none accent-accent"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
                {option.detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-paper p-3.5">
        <h3 className="text-[13px] font-semibold">What changes on this device</h3>
        <ul role="list" className="flex flex-col divide-y divide-border">
          {plan.rows.map((row) => (
            <li
              key={row.app ?? "settings"}
              className="flex items-center justify-between gap-3 py-2 text-[12.5px]"
            >
              <span className="min-w-0 flex-1 truncate">
                {row.app ? APP_MAP[row.app].name : "Workspace settings"}
              </span>
              {row.bytes > 0 && (
                <span className="flex-none font-mono text-[11px] text-ink-soft">
                  {formatBytes(row.bytes)}
                </span>
              )}
              <span
                className={cx(
                  "flex-none rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.1em]",
                  EFFECT_CLASS[row.effect],
                )}
              >
                {EFFECT_LABEL[row.effect]}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-[12px] leading-relaxed text-ink-soft">
          {plan.writes} {plan.writes === 1 ? "item" : "items"} written
          {plan.removals > 0
            ? `, ${plan.removals} ${plan.removals === 1 ? "item" : "items"} deleted`
            : ""}
          . Apps read their data when they open, so this page reloads once it&apos;s done.
        </p>
      </section>

      {destructive && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          This will delete {plan.removals} {plan.removals === 1 ? "item" : "items"}{" "}
          saved on this device that the clone doesn&apos;t carry. There is no undo — if you might
          want any of it, choose &quot;Add to this device&quot; instead, or take a backup first from
          Settings → Data.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApply}
          disabled={busy || plan.writes === 0}
          className={cx(
            "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 disabled:opacity-40",
            destructive ? "bg-danger focus-visible:ring-danger" : "bg-accent focus-visible:ring-accent",
          )}
        >
          {busy ? "Writing…" : destructive ? "Replace this device's data" : "Add it to this device"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
        >
          Discard it
        </button>
      </div>
    </div>
  );
}
