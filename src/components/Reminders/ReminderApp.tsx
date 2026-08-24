"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useReminderStore } from "@/store/useReminderStore";
import { useReminders, useReminderMutations } from "@/hooks/useReminders";
import type { Reminder, ReminderFilter } from "@/lib/Reminders/types";
import { notifyPermission, requestNotifyPermission, type NotifyPermission } from "@/lib/Reminders/notify";
import { backgroundReminderState, type BackgroundReminderState } from "@/lib/Reminders/background";
import { ensureAudioContext } from "@/lib/Reminders/sounds";
import { ReminderItem } from "@/components/Reminders/molecules/ReminderItem";
import { ReminderEditor } from "@/components/Reminders/organisms/ReminderEditor";
import { AppsIcon, BellIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

const FILTERS: { id: ReminderFilter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
  { id: "done", label: "Done" },
];

const isDone = (r: Reminder) => r.repeat === "none" && r.firedAt != null;

function matches(r: Reminder, filter: ReminderFilter): boolean {
  if (filter === "done") return isDone(r);
  if (filter === "upcoming") return r.enabled && !isDone(r);
  return true;
}

/**
 * Reminders — schedule timed alerts with a chosen notification sound and
 * optional repeat. Firing is handled app-wide by the ReminderScheduler; this
 * app is the management UI. Rendered natively; theme comes from the shared body.
 */
export function ReminderApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  const filter = useReminderStore((s) => s.filter);
  const setFilter = useReminderStore((s) => s.setFilter);
  const openEditor = useReminderStore((s) => s.openEditor);

  const { data: reminders = [], isLoading } = useReminders();
  const { toggle, remove } = useReminderMutations();

  const [now, setNow] = useState(() => Date.now());
  const [perm, setPerm] = useState<NotifyPermission>("default");
  /**
   * Whether the browser will wake the app to check reminders with no tab open.
   * Reported rather than assumed: it is Chromium-only and installation-gated, so
   * the app has to be able to say "only while OneApp is open" when that is the
   * truth (see `lib/Reminders/background.ts`).
   */
  const [background, setBackground] = useState<BackgroundReminderState>("unsupported");
  useEffect(() => {
    setNow(Date.now());
    setPerm(notifyPermission());
    void backgroundReminderState().then(setBackground);
    const iv = window.setInterval(() => setNow(Date.now()), 30_000); // keep countdowns fresh
    return () => window.clearInterval(iv);
  }, []);

  const list = useMemo(() => {
    const filtered = reminders.filter((r) => matches(r, filter));
    // Upcoming: soonest first. Otherwise most-recent fire time first.
    return filtered.sort((a, b) =>
      filter === "done" ? (b.firedAt ?? 0) - (a.firedAt ?? 0) : a.fireAt - b.fireAt,
    );
  }, [reminders, filter]);

  const enableNotifications = async () => {
    ensureAudioContext(); // unlock sound on the same gesture
    // requestNotifyPermission registers the notification service worker on grant.
    setPerm(await requestNotifyPermission());
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<BellIcon size={25} />}
            name="Reminders"
            tagline="timed alerts with a sound you choose"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-[110px] pt-[22px]">
        <div className="flex flex-col gap-4">
          {(perm === "default" || perm === "denied") && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-3.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
              <p className="text-[12.5px] text-ink-soft">
                {perm === "denied"
                  ? "System notifications are blocked — in-app alerts still ring and vibrate while this tab is open. Enable notifications in your browser settings to also get alerts in the background (recommended on mobile)."
                  : "Turn on notifications to get alerts — with sound and vibration on mobile — even when this tab isn't focused. Alerts ring for up to 30 seconds until you dismiss them."}
              </p>
              {perm === "default" && (
                <button
                  type="button"
                  onClick={enableNotifications}
                  className="flex-none rounded-[10px] bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white hover:brightness-110"
                >
                  Enable notifications
                </button>
              )}
            </div>
          )}

          {/* What happens when OneApp isn't open. Stated either way: a reminder
              app that quietly only works while you're looking at it is worse
              than one that tells you so. */}
          {perm === "granted" && (
            <p className="text-[12px] leading-relaxed text-ink-soft">
              {background === "on"
                ? "Alerts also arrive when OneApp is closed — the browser checks periodically, so a background alert can be a little late."
                : background === "denied"
                  ? "Alerts arrive while OneApp is open in any tab. Install OneApp to your device to also get them when it's closed."
                  : "Alerts arrive while OneApp is open in any tab — this browser can't wake a closed app."}
            </p>
          )}

          <div className="inline-flex gap-1 self-start rounded-xl border border-border bg-panel p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-current={filter === f.id}
                className={
                  "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors " +
                  (filter === f.id ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text")
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-[13px] text-ink-soft">Loading reminders…</p>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center text-ink-soft">
              <BellIcon size={30} />
              <p className="text-[13px]">
                {filter === "done" ? "No past reminders yet." : "No reminders — create one to get started."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((r) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  now={now}
                  onToggle={(id) => toggle.mutate(id)}
                  onEdit={(rem) => openEditor({ reminderId: rem.id })}
                  onDelete={(id) => remove.mutate(id)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      <AppFooter />

      <button
        type="button"
        aria-label="New reminder"
        onClick={() => openEditor()}
        className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 font-semibold text-white shadow-panel transition-transform hover:scale-105 active:scale-95"
      >
        <PlusIcon size={20} />
        <span className="hidden min-[420px]:inline">New reminder</span>
      </button>

      <ReminderEditor />
    </div>
  );
}
