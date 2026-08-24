"use client";

import { useState } from "react";
import { useQrStore } from "@/store/useQrStore";
import { readPayload } from "@/lib/qr/payload";
import { QR_KIND_LABEL } from "@/lib/qr/types";
import { ScanResult } from "@/components/QrTool/molecules/ScanResult";
import { ClockIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { cx, timeAgo } from "@/lib/utils";

/**
 * Codes scanned and made on this device, newest first.
 *
 * Kept because a scanned code is usually needed twice — the Wi-Fi password you
 * scanned in the kitchen, the ticket link you scanned at the door — and a
 * scanner that forgets immediately makes you go back and find the code again.
 * It is also plainly clearable, because the same list is a record of what you
 * pointed a camera at.
 */
export function HistoryPanel() {
  const history = useQrStore((s) => s.history);
  const forget = useQrStore((s) => s.forget);
  const clearHistory = useQrStore((s) => s.clearHistory);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center text-ink-soft">
        <ClockIcon size={28} />
        <p className="text-[13px]">Nothing yet — scanned and created codes are listed here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul role="list" className="flex flex-col gap-2">
        {history.map((entry) => {
          const reading = readPayload(entry.text);
          const open = entry.id === openId;
          return (
            <li key={entry.id} className="rounded-xl border border-border bg-panel">
              <div className="flex items-center gap-2 p-2.5">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : entry.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
                      {QR_KIND_LABEL[reading.kind]}
                    </span>
                    <span
                      className={cx(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        entry.origin === "created"
                          ? "bg-accent-soft text-accent"
                          : "bg-paper text-ink-soft",
                      )}
                    >
                      {entry.origin === "created" ? "made" : "scanned"}
                    </span>
                    <span className="text-[11px] text-ink-soft">{timeAgo(entry.ts)}</span>
                  </span>
                  <span className="line-clamp-2 min-w-0 text-[13px] font-semibold wrap-break-word">
                    {reading.label}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => forget(entry.id)}
                  aria-label={`Forget ${reading.label}`}
                  className="tint grid size-8 flex-none place-items-center rounded-[10px] text-ink-soft hover:text-danger"
                >
                  <TrashSmallIcon size={15} />
                </button>
              </div>
              {open && (
                <div className="px-2.5 pb-2.5">
                  <ScanResult text={entry.text} onClear={() => setOpenId(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (confirmClear ? clearHistory() : setConfirmClear(true))}
          className={cx(
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2",
            confirmClear
              ? "border-danger text-danger hover:bg-danger hover:text-on-accent focus-visible:ring-danger"
              : "border-border bg-panel text-ink-soft hover:text-text focus-visible:ring-accent",
          )}
        >
          <TrashSmallIcon size={15} />
          {confirmClear ? "Really clear everything" : "Clear history"}
        </button>
        {confirmClear && (
          <button
            type="button"
            onClick={() => setConfirmClear(false)}
            className="rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft hover:text-text"
          >
            Keep it
          </button>
        )}
      </div>
    </div>
  );
}
