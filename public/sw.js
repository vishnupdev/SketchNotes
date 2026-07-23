/*
 * Service worker for the OneApp workspace. Two jobs:
 *
 *  1. OFFLINE CACHING — caches the app shell and static assets so every app in
 *     the workspace (Sketchnotes, PDF Editor, Image Studio, Todos, Reminders,
 *     Timer, System Info) keeps working with no network, including a cold page
 *     reload while offline. All app data already lives in localStorage, so once
 *     the shell + JS chunks are cached the whole workspace runs locally.
 *
 *  2. NOTIFICATIONS — displays and handles reminder notifications, required so
 *     alerts show on mobile browsers where the page-context `Notification`
 *     constructor is disallowed.
 *
 * Caching strategy (same-origin GET only; cross-origin requests such as the
 * Cloudflare speed-test and the public-IP lookup are never touched, so they
 * still fail naturally when offline):
 *   • navigations                → network-first, fall back to the cached shell.
 *   • /_next/static, public files → stale-while-revalidate (instant + refresh).
 * Dev-only HMR requests are always passed straight through to the network.
 */

const VERSION = "oneapp-v1";
const CACHE = `oneapp-cache-${VERSION}`;

// Precached on install so the app boots offline after a single online visit.
// Hashed /_next/static chunks are added at runtime (their names aren't known
// here); the shell HTML pulls them in and stale-while-revalidate caches them.
const SHELL_URLS = ["/", "/pdf.worker.min.mjs", "/manifest.webmanifest"];

/* ----------------------------- lifecycle ------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is atomic; add() each so one missing asset can't abort install.
      .then((cache) => Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/* ------------------------------- fetch -------------------------------- */

function isHmrRequest(url) {
  // Next.js dev hot-reload traffic must never be cached or served stale.
  return (
    url.pathname.includes("hot-update") ||
    url.pathname.startsWith("/_next/static/webpack") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  );
}

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/pdf.worker.min.mjs" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg" ||
    /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico|wasm)$/i.test(url.pathname)
  );
}

// Serve the cached shell for a navigation, trying that exact URL first.
async function shellFallback(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request)) || (await cache.match("/")) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin hit the network
  if (isHmrRequest(url)) return;

  // Navigations: network-first so content stays fresh; cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => shellFallback(request)),
    );
    return;
  }

  // Static assets: stale-while-revalidate — instant from cache, refreshed in bg.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

/* --------------------------- notifications ---------------------------- */

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
