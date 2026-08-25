"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { applyClone, planClone, readClone, CloneError, readCurrent } from "@/lib/Clone/snapshot";
import type { CloneReceipt, ReadClone, RestoreMode } from "@/lib/Clone/types";
import { useCloneStore } from "@/store/useCloneStore";
import { ContentsSummary } from "@/components/Clone/molecules/ContentsSummary";
import { PlanTable } from "@/components/Clone/molecules/PlanTable";
import { formatBytes, timeAgo } from "@/lib/utils";
import type { CloneRoute } from "@/lib/Clone/types";

/**
 * A clone has arrived. Now what?
 *
 * Every way in ends here — a cable, a network, a file off a USB stick, a chain
 * of QR codes — because the dangerous part has nothing to do with how it
 * travelled. What matters is that a document is about to be written over
 * whatever this device already holds, and the person doing it should see
 * exactly what that means first.
 *
 * So the order is fixed and never skipped: validate, describe where it came
 * from, list what it carries, show what applying it would change on *this*
 * device, and only then offer a button. Nothing is written until that button is
 * pressed, and the clone can be discarded at any point up to it.
 */
export function ArrivalPanel({
  /** The clone document, exactly as it arrived. */
  text,
  route,
  /** Told what happened, so the far end can stop guessing. */
  onApplied,
  /** The user threw it away, or wants to start again. */
  onDiscard,
}: {
  text: string;
  route: CloneRoute;
  onApplied?: (receipt: CloneReceipt) => void;
  onDiscard: () => void;
}) {
  const device = useCloneStore((s) => s.device);
  const record = useCloneStore((s) => s.record);

  const [clone, setClone] = useState<ReadClone | null>(null);
  /** What this device already holds — read once, and only once. */
  const [current, setCurrent] = useState<Record<string, string> | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Validate the clone and read this device, both once. Re-reading storage per
  // mode change would be the same answer at the cost of a delay, and a plan
  // that arrives a tick after the radio it belongs to is a plan that can be
  // read as describing the *other* choice — the one thing this screen cannot
  // afford to get wrong.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const read = readClone(text);
        const here = await readCurrent();
        if (cancelled) return;
        setClone(read);
        setCurrent(here);
        setError("");
      } catch (e) {
        if (cancelled) return;
        setClone(null);
        setCurrent(null);
        setError(e instanceof CloneError ? e.message : "That clone couldn't be read.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  // Switching mode redraws the table in the same frame as the radio, because
  // planning is pure once both sides have been read.
  const plan = useMemo(
    () => (clone && current ? planClone(clone.entries, current, mode) : null),
    [clone, current, mode],
  );

  const apply = useCallback(async () => {
    if (!clone || !plan) return;
    setBusy(true);
    try {
      const result = await applyClone(clone.entries, plan.mode);
      const receipt: CloneReceipt = { ...result, device: device || "the other device" };
      record({
        direction: "received",
        route,
        other: clone.from.label,
        keys: result.written,
        bytes: clone.bytes,
        replaced: plan.mode === "replace",
      });
      onApplied?.(receipt);
      // Apps read their data when they open, so re-hydrating every store in
      // place is not something this can honestly claim to do. A reload is the
      // one thing that leaves the workspace unambiguously showing the clone.
      //
      // Held for a moment first: `onApplied` queues the receipt on the data
      // channel, and tearing the page down in the same tick would leave the
      // sending device — usually the one about to be wiped — with no answer to
      // the only question it has.
      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setBusy(false);
      setError("Writing the clone didn't finish. Nothing else on this device was changed.");
    }
  }, [clone, plan, device, record, route, onApplied]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
        <button
          type="button"
          onClick={onDiscard}
          className="self-start rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!clone || !plan) {
    return (
      <p role="status" className="text-[12.5px] text-ink-soft">
        Checking the clone…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-accent bg-accent-soft p-3.5">
        <p className="text-[13px] font-semibold">A clone arrived from {clone.from.label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
          {clone.takenAt ? `Taken ${timeAgo(clone.takenAt)}` : "Taken at an unknown time"} ·{" "}
          {clone.keys} {clone.keys === 1 ? "item" : "items"} · {formatBytes(clone.bytes)}
          {clone.from.platform ? ` · ${clone.from.platform}` : ""}. It arrived whole — its checksum
          matched.
        </p>
      </div>

      <ContentsSummary
        rows={clone.rows}
        keys={clone.keys}
        bytes={clone.bytes}
        skipped={clone.skipped}
        title="What the clone carries"
      />

      <PlanTable
        plan={plan}
        onMode={setMode}
        busy={busy}
        onApply={() => void apply()}
        onCancel={onDiscard}
      />
    </div>
  );
}
