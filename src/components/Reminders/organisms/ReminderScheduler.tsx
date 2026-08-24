"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useReminders, useReminderMutations } from "@/hooks/useReminders";
import { useReminderStore } from "@/store/useReminderStore";
import { advanceRepeat, type Reminder } from "@/lib/Reminders/types";
import { ensureAudioContext } from "@/lib/Reminders/sounds";
import { registerNotifier, showNotification } from "@/lib/Reminders/notify";
import { enableBackgroundReminders } from "@/lib/Reminders/background";
import { queryKeys } from "@/lib/query-keys";

const TICK_MS = 15_000;

const body = (r: Reminder) => r.notes || "Reminder";

/**
 * Headless, always-mounted scheduler. Every tick (and on focus/visibility) it
 * fires any due reminders: raises the in-app alert, advances/marks them, and
 * shows a system notification when permitted. Mounted once at the workspace
 * root so reminders fire no matter which app is on screen.
 */
export function ReminderScheduler() {
  useReminders(); // ensure the collection is loaded into the cache
  const qc = useQueryClient();
  const { replace } = useReminderMutations();
  const pushRinging = useReminderStore((s) => s.pushRinging);

  // Register the notification service worker so alerts can show on mobile, then
  // ask it to keep checking while the workspace is closed. Both are idempotent.
  useEffect(() => {
    void registerNotifier().then(() => enableBackgroundReminders());
  }, []);

  // Unlock audio on the first user gesture (autoplay policy).
  useEffect(() => {
    const unlock = () => ensureAudioContext();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const check = () => {
      const list = qc.getQueryData<Reminder[]>(queryKeys.reminders) ?? [];
      const now = Date.now();
      const fired: Reminder[] = [];
      let changed = false;

      const next = list.map((r) => {
        if (!r.enabled || r.fireAt > now) return r;
        if (r.repeat === "none") {
          if (r.firedAt != null) return r; // already fired
          fired.push(r);
          changed = true;
          return { ...r, firedAt: now };
        }
        // Repeating: fire, then roll forward to the next future occurrence.
        fired.push(r);
        changed = true;
        let at = r.fireAt;
        while (at <= now) at = advanceRepeat(at, r.repeat);
        return { ...r, firedAt: now, fireAt: at };
      });

      if (!changed) return;
      replace.mutate(next);
      fired.forEach((r) => void showNotification(r.title, body(r), `reminder-${r.id}`));
      pushRinging(fired); // the alert rings + vibrates until dismissed (max 30s)
    };

    /*
     * Coming back to the tab, the collection in the cache may be out of date:
     * the service worker fires reminders too while the workspace is closed (see
     * `lib/Reminders/background.ts`) and writes `firedAt` straight to storage.
     * Re-reading before checking is what stops this side announcing a reminder
     * the worker has already dealt with — and, worse, writing the stale list
     * back over the worker's update.
     */
    const resync = async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.reminders });
      check();
    };

    check();
    const iv = window.setInterval(check, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void resync();
    };
    const onFocus = () => void resync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [qc, replace, pushRinging]);

  return null;
}
