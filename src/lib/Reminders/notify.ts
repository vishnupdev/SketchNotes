/**
 * Notifications for reminders, SSR-safe. Desktop can display via the plain
 * `Notification` constructor, but mobile browsers (notably Android Chrome) throw
 * on it and require a ServiceWorker's `registration.showNotification()`. We
 * register a tiny worker (`/sw.js`) and prefer it, falling back to the
 * constructor. A repeating vibration accompanies the alert on capable devices.
 */

import { MAX_RING_MS } from "./sounds";

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission, or "unsupported" when the API is missing. */
export function notifyPermission(): NotifyPermission {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

/** Prompt for permission (a no-op if already decided). Returns the result. */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!notifySupported()) return "unsupported";
  if (Notification.permission !== "default") {
    void registerNotifier();
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") void registerNotifier();
    return result;
  } catch {
    return Notification.permission;
  }
}

/* --------------------------- service worker --------------------------- */

let swReg: ServiceWorkerRegistration | null = null;

function swSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Register (or adopt) the notification service worker. Idempotent and safe to
 * call repeatedly; needed for notifications to show on mobile. The worker does
 * no request caching, so it can't affect any other app in the workspace.
 */
export async function registerNotifier(): Promise<void> {
  if (!swSupported() || swReg) return;
  try {
    swReg =
      (await navigator.serviceWorker.getRegistration()) ??
      (await navigator.serviceWorker.register("/sw.js"));
  } catch {
    swReg = null;
  }
}

/* ---------------------------- notifications --------------------------- */

/** Options we set that aren't in the stock lib.dom NotificationOptions type. */
type RichNotifyOptions = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
};

/** A buzz pattern that repeats for the ring; long enough to feel like a phone. */
const NOTIFY_VIBRATE = [500, 250, 500, 250, 500];

/**
 * Show a system notification when permission allows. Prefers the ServiceWorker
 * path (works on mobile), falling back to the constructor on desktop. The
 * notification stays until interacted with (`requireInteraction`) and re-alerts
 * for a shared tag (`renotify`). Silent no-op otherwise.
 */
export async function showNotification(
  title: string,
  body: string,
  tag?: string,
): Promise<void> {
  if (!notifySupported() || Notification.permission !== "granted") return;
  const options: RichNotifyOptions = {
    body,
    tag: tag ?? `reminder-${title}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: NOTIFY_VIBRATE,
  };
  try {
    const reg = swReg ?? (swSupported() ? await navigator.serviceWorker.getRegistration() : null);
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
    // Desktop fallback — the constructor throws on some mobile browsers.
    new Notification(title, options as NotificationOptions);
  } catch {
    /* some browsers only allow the ServiceWorker path — ignore */
  }
}

/* ----------------------------- vibration ------------------------------ */

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

const VIBRATE_PATTERN = [500, 300, 500];
const VIBRATE_INTERVAL_MS = 1_300;

let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let vibrateStopTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Buzz the device on repeat until {@link stopVibrate} or the safety cap
 * (default 30s, matching the ring). No-op where vibration is unsupported
 * (desktop, iOS Safari).
 */
export function startVibrate(maxMs: number = MAX_RING_MS): void {
  if (!canVibrate()) return;
  stopVibrate();
  const buzz = () => {
    try {
      navigator.vibrate(VIBRATE_PATTERN);
    } catch {
      /* ignore */
    }
  };
  buzz();
  vibrateTimer = setInterval(buzz, VIBRATE_INTERVAL_MS);
  vibrateStopTimer = setTimeout(stopVibrate, maxMs);
}

/** Stop any active vibration loop. */
export function stopVibrate(): void {
  if (vibrateTimer !== null) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
  if (vibrateStopTimer !== null) {
    clearTimeout(vibrateStopTimer);
    vibrateStopTimer = null;
  }
  if (canVibrate()) {
    try {
      navigator.vibrate(0); // cancel any in-flight buzz
    } catch {
      /* ignore */
    }
  }
}
