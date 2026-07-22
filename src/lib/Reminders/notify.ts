/** Thin wrapper over the Web Notifications API with SSR-safe guards. */

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
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Show a system notification when permission allows; silent otherwise. */
export function showNotification(title: string, body: string): void {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: `reminder-${title}-${body}` });
  } catch {
    /* some browsers require a ServiceWorker for notifications — ignore */
  }
}
