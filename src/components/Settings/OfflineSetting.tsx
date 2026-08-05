"use client";

import { useOfflineReady } from "@/hooks/useOfflineReady";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { timeAgo, cx } from "@/lib/utils";
import { CloudCheckIcon, DownloadIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Settings → Offline. The workspace already caches itself in the background,
 * but only on a healthy connection; this puts the user in charge of it.
 *
 * "Save all apps" downloads every app's code plus the news feed in one go —
 * the thing to press before a flight, or on a metered link where the automatic
 * warm-up deliberately holds back. "Clear" frees the space again; the cache
 * simply rebuilds as apps get used.
 */
export function OfflineSetting() {
  const { supported, active, status, progress, label, cachedFiles, savedAt, save, clear } =
    useOfflineReady();
  const { online, slow } = useNetworkStatus();

  if (!supported) {
    return (
      <p className="text-[12.5px] text-ink-soft">
        This browser can&apos;t store the workspace for offline use. Your notes, todos and
        reminders are still saved on this device — only reopening the app needs a connection.
      </p>
    );
  }

  const saving = status === "saving";
  const percent = Math.round(progress * 100);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-paper p-3.5">
        <CloudCheckIcon
          size={20}
          className={cx("mt-0.5 flex-none", status === "ready" ? "text-success" : "text-accent")}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">
            {saving
              ? `Saving for offline… ${percent}%`
              : status === "ready"
                ? "Saved for offline use"
                : active
                  ? "Saving automatically in the background"
                  : "Offline files build as you use the apps"}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            {saving && label ? (
              <>Currently saving: {label}</>
            ) : status === "error" ? (
              label
            ) : (
              <>
                {cachedFiles !== null && cachedFiles > 0
                  ? `${cachedFiles} files stored on this device`
                  : "Nothing stored yet"}
                {savedAt ? ` · last full save ${timeAgo(savedAt)}` : ""}
              </>
            )}
          </p>

          {saving && (
            <div
              role="progressbar"
              aria-label="Saving apps for offline use"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !online}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
        >
          <DownloadIcon size={15} />
          {saving ? "Saving…" : "Save all apps for offline"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
        >
          <TrashSmallIcon size={15} />
          Clear offline files
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-soft">
        {!online
          ? "You're offline — reconnect to save anything that's still missing."
          : slow
            ? "Your connection looks weak: saving everything now may take a while, and background saving is paused to protect your data."
            : "Notes, todos, reminders and timers never need a connection. News, online translation, handwriting recognition and the speed test do."}
      </p>
    </div>
  );
}
