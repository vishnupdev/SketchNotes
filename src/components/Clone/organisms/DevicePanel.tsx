"use client";

import { ROUTE_MAP } from "@/lib/Clone/routes";
import { guessDeviceLabel } from "@/lib/Clone/snapshot";
import { useCloneStore } from "@/store/useCloneStore";
import { formatBytes, timeAgo } from "@/lib/utils";
import { TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * This device — what it calls itself, and what it has cloned.
 *
 * The name is the only piece of identity in the whole app, and it exists for
 * one reason: the receiving device has to say where an arriving clone came
 * from. "A clone arrived from Work laptop" is something a person can act on;
 * "a clone arrived" is not, and the difference matters most in exactly the
 * situation this app is for — several devices, mid-migration, one of them about
 * to be wiped.
 *
 * Nothing here is collected or sent anywhere beyond the clone itself. The
 * browser gives no device name of its own (rightly), so the default is a
 * description — "Windows laptop" — rather than an identifier, and whatever is
 * typed over it is what travels.
 */
export function DevicePanel() {
  const device = useCloneStore((s) => s.device);
  const setDevice = useCloneStore((s) => s.setDevice);
  const history = useCloneStore((s) => s.history);
  const clearHistory = useCloneStore((s) => s.clearHistory);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-paper p-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">What this device is called</span>
          <span className="text-[12px] leading-relaxed text-ink-soft">
            Travels inside every clone this device sends, so the other end knows what arrived. It
            goes nowhere else.
          </span>
          <input
            type="text"
            value={device}
            maxLength={60}
            onChange={(e) => setDevice(e.target.value)}
            placeholder={guessDeviceLabel()}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-border bg-panel px-3 py-2 text-[13px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold">Clones so far</h3>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 text-[11.5px] font-semibold text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <TrashSmallIcon size={14} />
              Clear the list
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-[12.5px] text-ink-soft">
            Nothing yet. Clones sent from or taken onto this device are listed here.
          </p>
        ) : (
          <ul role="list" className="flex flex-col gap-1.5">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-panel p-3"
              >
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold">
                    {entry.direction === "sent" ? "Sent to" : "Taken from"} {entry.other}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">
                    {timeAgo(entry.ts)} · {ROUTE_MAP[entry.route].label.toLowerCase()} · {entry.keys}{" "}
                    {entry.keys === 1 ? "item" : "items"} · {formatBytes(entry.bytes)}
                    {entry.replaced ? " · replaced this device's data" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-paper p-3.5">
        <h3 className="text-[13px] font-semibold">What a clone contains</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          Everything this workspace has saved in this browser: notes and sketches, tasks,
          reminders, boards, timers, and every preference including your theme and app order. Keys
          stored by anything else on this domain are never included. A clone is the same document
          Settings → Data writes to a backup file, wrapped with a note of where it came from — so a
          backup can be cloned onto a device, and a clone can be kept as a backup.
        </p>
      </section>
    </div>
  );
}
