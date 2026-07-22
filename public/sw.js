/*
 * Minimal service worker for the Reminders app. Its ONLY job is to display and
 * handle notifications — required so alerts show on mobile browsers, where the
 * page-context `Notification` constructor is disallowed. It intentionally does
 * NOT intercept fetch or cache anything, so it can't affect any other app.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Tapping a notification focuses an existing tab, or opens the Reminders app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow("/reminders");
        return undefined;
      }),
  );
});
