"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyTrash,
  listTrash,
  purgeFromTrash,
  restoreFromTrash,
  TRASH_DAYS,
  type TrashEntry,
} from "@/lib/trash";
import { APP_MAP } from "@/components/AppCatalog";
import { cx, formatBytes, timeAgo } from "@/lib/utils";
import { RotateIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-ink-soft transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const DANGER =
  "inline-flex items-center gap-2 rounded-full border border-danger px-3.5 py-2 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger hover:text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-40";

/**
 * Settings → Data → Recently deleted.
 *
 * Every delete in the workspace used to be final. Deleting a note, a task, a
 * reminder or a board section now leaves a copy here for a month, and this is
 * where it comes back from — one shared list rather than a separate undo in each
 * app, because the mistake is always the same mistake.
 *
 * Restoring reloads the page, exactly as restoring a backup does: apps read
 * their data once at start-up, so writing it back is only half the job.
 */
export function TrashSetting() {
  const [entries, setEntries] = useState<TrashEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const load = useCallback(() => {
    void listTrash().then(setEntries);
  }, []);

  // Reading the list is also what prunes anything past the retention window.
  useEffect(load, [load]);

  const restore = (id: string) => {
    setBusy(true);
    void restoreFromTrash(id).then((ok) => {
      if (ok) window.location.reload();
      else {
        setBusy(false);
        load();
      }
    });
  };

  if (!entries) {
    return <p className="text-[12.5px] text-ink-soft">Checking…</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-ink-soft">
        Nothing deleted recently. Notes, tasks, reminders and board sections you delete are kept
        here for {TRASH_DAYS} days, so a slip is recoverable. Everything else — an emptied
        canvas, a cleared history — is not kept.
      </p>
    );
  }

  const total = entries.reduce((sum, e) => sum + e.bytes, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        {entries.length} item{entries.length === 1 ? "" : "s"} · {formatBytes(total)} · kept for{" "}
        {TRASH_DAYS} days
      </p>

      <ul role="list" className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-paper p-2.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{entry.label}</span>
              <span className="block truncate text-[11.5px] text-ink-soft">
                {APP_MAP[entry.app]?.name ?? entry.app}
                {entry.detail ? ` · ${entry.detail}` : ""} · {timeAgo(entry.deletedAt)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => restore(entry.id)}
              disabled={busy}
              className={cx(BTN, "flex-none")}
            >
              <RotateIcon size={14} />
              Restore
            </button>
            <button
              type="button"
              onClick={() => {
                setBusy(true);
                void purgeFromTrash(entry.id).then(() => {
                  setBusy(false);
                  load();
                });
              }}
              disabled={busy}
              aria-label={`Delete ${entry.label} for good`}
              className="tint grid size-8 flex-none place-items-center rounded-[10px] text-ink-soft hover:text-danger"
            >
              <TrashSmallIcon size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!confirmEmpty) {
              setConfirmEmpty(true);
              return;
            }
            setBusy(true);
            void emptyTrash().then(() => {
              setConfirmEmpty(false);
              setBusy(false);
              load();
            });
          }}
          disabled={busy}
          className={confirmEmpty ? DANGER : BTN}
        >
          <TrashSmallIcon size={14} />
          {confirmEmpty ? "Really empty the trash" : "Empty the trash"}
        </button>
        {confirmEmpty && (
          <button type="button" onClick={() => setConfirmEmpty(false)} className={BTN}>
            Keep it
          </button>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-ink-soft">
        Restoring puts an item back where it came from and reloads the page. Very large items
        aren&apos;t kept — the app says so at the time rather than implying a net that
        isn&apos;t there.
      </p>
    </div>
  );
}
