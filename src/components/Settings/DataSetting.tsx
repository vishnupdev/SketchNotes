"use client";

import { useEffect, useRef, useState } from "react";
import { useBackup } from "@/hooks/useBackup";
import { useIntakeStore } from "@/store/useIntakeStore";
import { APP_MAP } from "@/components/AppCatalog";
import { cx, formatBytes } from "@/lib/utils";
import {
  DatabaseIcon,
  DownloadIcon,
  ImportIcon,
  ShieldCheckIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";

const PRIMARY =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const SECONDARY =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const DANGER =
  "inline-flex items-center gap-2 rounded-full border border-danger px-4 py-2.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger hover:text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-40";

/**
 * Settings → Data. The workspace's only door in and out of this browser.
 *
 * Everything the apps hold lives in this one browser with no account behind it,
 * which is the privacy promise and also the whole risk: clearing site data or
 * changing laptop takes all of it. So there are three things here, in the order
 * they matter — take a copy, put a copy back, and ask the browser not to throw
 * the data away in the first place. Erasing is last and deliberately plain.
 */
export function DataSetting() {
  const backup = useBackup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  const staged = backup.staged;

  /*
   * A backup file opened from outside — double-clicked, or shared in. The shell
   * recognises it (`lib/intake/classify.ts`), opens this dialog and leaves the
   * file here, so restoring is one confirmation rather than a hunt through
   * settings. It is only ever *staged*: nothing is written until the user picks
   * add or replace.
   */
  const takeIntake = useIntakeStore((s) => s.take);
  const pendingBackup = useIntakeStore((s) => s.pending.some((i) => i.kind === "backup"));
  useEffect(() => {
    if (!pendingBackup || staged || backup.busy) return;
    const item = takeIntake("backup");
    if (item?.file) backup.stage(item.file);
  }, [backup, pendingBackup, staged, takeIntake]);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-paper p-3.5">
        <DatabaseIcon size={20} className="mt-0.5 flex-none text-accent" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">Everything is saved in this browser only</div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            Notes, tasks, reminders, boards, timers and preferences. There is no account and no
            server copy, so a backup file is the only way to move to another device — or to come
            back from a cleared browser.
          </p>
        </div>
      </div>

      {/* ---------------------------- export ---------------------------- */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={backup.exportAll} disabled={backup.busy} className={PRIMARY}>
          <DownloadIcon size={15} />
          {backup.phase === "exporting" ? "Saving…" : "Save a backup"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={backup.busy}
          className={SECONDARY}
        >
          <ImportIcon size={15} />
          {backup.phase === "reading" ? "Reading…" : "Restore from a backup"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="hidden"
          aria-label="Choose a backup file to restore"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Cleared so choosing the same file twice still fires a change.
            e.target.value = "";
            if (file) backup.stage(file);
          }}
        />
      </div>

      {backup.error && (
        <p role="alert" className="text-[12px] leading-relaxed text-danger">
          {backup.error}
        </p>
      )}
      {backup.message && !backup.error && (
        <p role="status" className="text-[12px] leading-relaxed text-ink-soft">
          {backup.message}
        </p>
      )}

      {/* --------------------------- restore ---------------------------- */}
      {staged && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-accent-soft p-3.5">
          <div>
            <div className="text-[13px] font-semibold">{staged.fileName}</div>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {staged.summary.createdAt > 0
                ? `Taken ${new Date(staged.summary.createdAt).toLocaleString()}`
                : "No date recorded"}{" "}
              · {staged.summary.keys} keys · {formatBytes(staged.summary.bytes)}
            </p>
          </div>

          <ul role="list" className="flex flex-col gap-1">
            {staged.summary.rows.map((row) => (
              <li
                key={row.app ?? "settings"}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="min-w-0 truncate font-semibold">
                  {row.app ? (APP_MAP[row.app]?.name ?? row.app) : "Workspace settings"}
                </span>
                <span className="flex-none text-ink-soft">{formatBytes(row.bytes)}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => backup.restore("merge")}
              disabled={backup.busy}
              className={PRIMARY}
            >
              {backup.phase === "restoring" ? "Restoring…" : "Add to this browser"}
            </button>
            <button
              type="button"
              onClick={() => (confirmReplace ? backup.restore("replace") : setConfirmReplace(true))}
              disabled={backup.busy}
              className={cx(confirmReplace ? DANGER : SECONDARY)}
            >
              {confirmReplace ? "Really replace everything" : "Replace everything"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmReplace(false);
                backup.cancel();
              }}
              disabled={backup.busy}
              className={SECONDARY}
            >
              Cancel
            </button>
          </div>
          <p className="text-[12px] leading-relaxed text-ink-soft">
            {confirmReplace
              ? "Replacing deletes anything this browser has that the backup doesn't, including notes made since it was taken."
              : "Adding keeps what's already here and overwrites only what the backup covers. The page reloads when it's done."}
          </p>
        </div>
      )}

      {/* -------------------------- persistence ------------------------- */}
      {backup.persisted !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper p-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <ShieldCheckIcon
              size={18}
              className={cx("mt-0.5 flex-none", backup.persisted ? "text-success" : "text-ink-soft")}
            />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">
                {backup.persisted ? "Protected from eviction" : "Can be evicted when space runs low"}
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                Browsers may clear a site&apos;s data to reclaim disk space. Asking for permanent
                storage exempts this workspace.
              </p>
            </div>
          </div>
          {!backup.persisted && (
            <button type="button" onClick={backup.keepData} className={SECONDARY}>
              Ask to keep it
            </button>
          )}
        </div>
      )}

      {/* ---------------------------- erase ----------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
        <button
          type="button"
          onClick={() => (confirmErase ? backup.erase() : setConfirmErase(true))}
          disabled={backup.busy}
          className={confirmErase ? DANGER : SECONDARY}
        >
          <TrashSmallIcon size={15} />
          {confirmErase
            ? "Really erase everything"
            : backup.phase === "erasing"
              ? "Erasing…"
              : "Erase all workspace data"}
        </button>
        {confirmErase && (
          <button type="button" onClick={() => setConfirmErase(false)} className={SECONDARY}>
            Keep my data
          </button>
        )}
      </div>
      <p className="text-[12px] leading-relaxed text-ink-soft">
        Erasing removes every note, task, reminder and preference from this browser. It cannot be
        undone — save a backup first. Offline copies of the apps themselves are cleared from
        Settings → Offline.
      </p>
    </div>
  );
}
