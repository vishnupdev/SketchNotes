/**
 * Asking the browser to keep checking reminders while the workspace is closed.
 *
 * The page-side scheduler only runs while a tab is open, so a reminder set for
 * the morning was missed if OneApp was closed overnight. Periodic Background
 * Sync is the only way a web app can be woken with no tab: the browser decides
 * when, and `public/sw.js` does the check.
 *
 * What this module does *not* do is pretend. Support is narrow — Chromium, and
 * only for an installed app the browser rates as engaged-with — so it reports
 * exactly what it managed to arrange, and the Reminders app says so plainly
 * rather than implying an alarm clock it cannot guarantee.
 */

/** Must match REMINDER_SYNC_TAG in `public/sw.js`. */
const SYNC_TAG = "oneapp-reminders";

/**
 * Twelve hours as the *requested* floor between checks.
 *
 * Deliberately not a small number: the browser treats this as a hint and
 * enforces its own minimum (usually not more often than hourly, and only when
 * it judges the app worth waking), and asking for a minute would not make it
 * happen — it only reads as an app that has not understood the API. Reminders
 * within the next few hours are almost always fired by the page anyway; this
 * exists for the ones that come due while the workspace is shut.
 */
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

export type BackgroundReminderState =
  /** Registered — the browser will wake the app to check. */
  | "on"
  /** Supported, but the browser hasn't granted it (not installed, or low engagement). */
  | "denied"
  /** This browser has no periodic background sync at all. */
  | "unsupported";

type PeriodicSyncManager = {
  register: (tag: string, options?: { minInterval?: number }) => Promise<void>;
  getTags?: () => Promise<string[]>;
};

/** The registration's periodic-sync manager, where the browser has one. */
function managerOf(reg: ServiceWorkerRegistration): PeriodicSyncManager | null {
  const holder = reg as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager };
  return holder.periodicSync ?? null;
}

/**
 * Arrange background checks, returning what was actually achieved.
 *
 * Safe to call repeatedly: registering a tag that already exists is a no-op, so
 * this can run on every mount without accumulating anything.
 */
export async function enableBackgroundReminders(): Promise<BackgroundReminderState> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return "unsupported";
    const manager = managerOf(reg);
    if (!manager) return "unsupported";

    // Chromium gates this behind its own permission, which is granted silently
    // to an installed, engaged-with app and never prompts. Checking first keeps
    // a predictable rejection out of the console.
    const permission = await queryPermission();
    if (permission === "denied") return "denied";

    if ((await manager.getTags?.())?.includes(SYNC_TAG)) return "on";
    await manager.register(SYNC_TAG, { minInterval: MIN_INTERVAL_MS });
    return "on";
  } catch {
    // Thrown when the app isn't installed, or the browser declines. Not an
    // error the user can act on beyond installing the app.
    return "denied";
  }
}

/** What the browser currently says about waking us in the background. */
export async function backgroundReminderState(): Promise<BackgroundReminderState> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const manager = reg ? managerOf(reg) : null;
    if (!manager) return "unsupported";
    // Supported but not registered: either the browser refused, or nothing has
    // asked yet. Both mean "not arranged", which is what the UI needs to say.
    return (await manager.getTags?.())?.includes(SYNC_TAG) ? "on" : "denied";
  } catch {
    return "unsupported";
  }
}

/** The `periodic-background-sync` permission, where the browser reports it. */
async function queryPermission(): Promise<PermissionState | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
  try {
    // Not in the standard PermissionName union; the cast is the feature test.
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    return status.state;
  } catch {
    return null;
  }
}
