/*
 * Service worker for the OneApp workspace. Two jobs:
 *
 *  1. OFFLINE / LOW-BANDWIDTH CACHING — every app in the workspace keeps
 *     working with a slow connection or no connection at all, including a cold
 *     reload of any deep link while offline. All app data already lives in
 *     localStorage, so once the shells + JS chunks are cached the whole
 *     workspace runs locally.
 *
 *  2. NOTIFICATIONS — displays and handles reminder notifications, required so
 *     alerts show on mobile browsers where the page-context `Notification`
 *     constructor is disallowed.
 *
 * Caching strategy — four caches so each kind of asset can be trimmed and
 * versioned on its own:
 *
 *   SHELL   every app route's HTML         network-first with a short timeout,
 *                                          falling back to the cached shell
 *   STATIC  /_next/static + public assets  cache-first (hashed = immutable),
 *                                          stale-while-revalidate for the rest
 *   DATA    same-origin GET /api/*         network-first with a timeout, then
 *                                          the last good response (news reads
 *                                          offline, translations replay)
 *   MEDIA   allow-listed remote images     cache-first, so news logos survive
 *
 * "Network-first with a timeout" is what makes a *weak* connection usable: if
 * the network hasn't answered within a few seconds we paint from cache instead
 * of spinning, while the request keeps running to refresh the cache for later.
 *
 * Anything not listed above is passed straight through and never cached —
 * measurement endpoints (the Cloudflare speed test, the public-IP lookup) must
 * always reflect the real network, and dev HMR traffic must never go stale.
 */

const VERSION = "oneapp-v3";
const SHELL_CACHE = `oneapp-shell-${VERSION}`;
const STATIC_CACHE = `oneapp-static-${VERSION}`;
const DATA_CACHE = `oneapp-data-${VERSION}`;
const MEDIA_CACHE = `oneapp-media-${VERSION}`;
const OWNED_CACHES = [SHELL_CACHE, STATIC_CACHE, DATA_CACHE, MEDIA_CACHE];

/** Serve from cache if the network hasn't answered within these budgets. */
const NAV_TIMEOUT_MS = 3500;
const DATA_TIMEOUT_MS = 6000;

/*
 * Entry caps — keeps the caches bounded on long-lived installs.
 *
 * STATIC holds hashed build output, so a deploy adds new filenames rather than
 * replacing old ones. The cap is generous (a full build of every app is well
 * under 100 entries) and trims oldest-first, which is deploy order: the chunks
 * evicted are the ones no build references any more. Anything trimmed by
 * mistake is simply re-fetched the next time the app is opened online.
 */
const STATIC_MAX_ENTRIES = 240;
const DATA_MAX_ENTRIES = 60;
const MEDIA_MAX_ENTRIES = 80;

/*
 * Every app deep link is precached, so a cold offline load of /todos (or any
 * other app) serves that route's own HTML — correct <title> and metadata
 * included — instead of only the root shell. Keep in sync with APPS in
 * src/lib/site.ts. Hashed /_next/static chunks aren't known here: the shell
 * pulls in the ones it needs, and the client warm-up
 * (src/lib/offline/warmup.ts) imports every lazy app once so their chunks land
 * in STATIC too.
 */
const SHELL_URLS = [
  "/",
  "/pdfeditor",
  "/image",
  "/todos",
  "/reminders",
  "/timer",
  "/system",
  "/speedtest",
  "/news",
  "/malayalam",
  "/translate",
  "/assistant",
];

/** Non-HTML files the workspace can't start (or edit PDFs) without. */
const CORE_ASSET_URLS = ["/manifest.webmanifest", "/icon.svg", "/pdf.worker.min.mjs"];

/** Remote hosts whose images may be cached (news publisher logos). */
const MEDIA_HOSTS = ["www.google.com", "news.google.com"];

/* ----------------------------- lifecycle ------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // add() each rather than addAll(): addAll is atomic, so one unreachable
      // asset would abort the whole install.
      const shell = await caches.open(SHELL_CACHE);
      await Promise.all(SHELL_URLS.map((url) => shell.add(url).catch(() => {})));
      const statics = await caches.open(STATIC_CACHE);
      await Promise.all(CORE_ASSET_URLS.map((url) => statics.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("oneapp-") && !OWNED_CACHES.includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/* ------------------------------ helpers ------------------------------- */

/** Resolve to `null` after `ms` instead of waiting on a stalled network. */
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** True for a response worth storing (opaque cross-origin images included). */
function isStorable(response) {
  return Boolean(response) && (response.ok || response.type === "opaque");
}

/** Drop the oldest entries once a cache grows past `max` (keys are FIFO). */
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

/** Cache a response without ever letting a storage failure break the fetch. */
function putSafely(cacheName, request, response, max) {
  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, response))
    .then(() => (max ? trimCache(cacheName, max) : undefined))
    .catch(() => {});
}

function isHmrRequest(url) {
  // Next.js dev hot-reload traffic must never be cached or served stale.
  // Turbopack (the dev bundler since Next 15) uses its own endpoints and ships
  // its client as a chunk under /_next/static, so match those too.
  return (
    url.pathname.includes("hot-update") ||
    url.pathname.includes("hmr-client") ||
    url.pathname.startsWith("/_next/static/webpack") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/_next/turbopack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  );
}

/** Hashed build output — the filename changes with the content, so cache-first. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/**
 * True only when the server promises this URL's bytes will never change.
 *
 * `isImmutableAsset` matches on path, and the dev server serves that same
 * `/_next/static/` prefix with *unhashed* filenames that change on every edit.
 * Storing cache-first under those URLs pins pre-edit code, so the check is made
 * on the response instead: production sends `max-age=31536000, immutable` there,
 * while the dev server sends `no-cache, must-revalidate` and is skipped.
 */
function isImmutableResponse(response) {
  const cc = (response && response.headers.get("cache-control")) || "";
  if (/no-store|no-cache/i.test(cc)) return false;
  if (/immutable/i.test(cc)) return true;
  const maxAge = /max-age=(\d+)/i.exec(cc);
  return Boolean(maxAge) && Number(maxAge[1]) >= 3600;
}

/** Other same-origin static files: serve stale, revalidate in the background. */
function isRevalidatingAsset(url) {
  return (
    CORE_ASSET_URLS.includes(url.pathname) ||
    /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico|wasm|json|txt)$/i.test(
      url.pathname,
    )
  );
}

/**
 * Same-origin API responses safe to replay from cache: news headlines (stale
 * beats blank) and translations (deterministic for a given query, so a cached
 * hit is the same answer the network would give).
 */
function isCacheableApi(url) {
  return url.pathname === "/api/news" || url.pathname === "/api/translate";
}

/* ------------------------------ strategies ---------------------------- */

/** Cached shell for a navigation: exact route first, then the root shell. */
async function cachedShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  const opts = { ignoreSearch: true, ignoreVary: true };
  return (await cache.match(request, opts)) || (await cache.match("/", opts)) || null;
}

/**
 * Navigations: network-first, but only for as long as NAV_TIMEOUT_MS — past
 * that the cached shell paints immediately while the response still lands in
 * the cache for next time.
 */
async function handleNavigation(request) {
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        void putSafely(SHELL_CACHE, new Request(request.url), response.clone());
      }
      return response;
    })
    .catch(() => null);

  const cached = await cachedShell(request);
  if (!cached) return (await network) || Response.error();

  const fresh = await withTimeout(network, NAV_TIMEOUT_MS);
  return fresh || cached;
}

/** Hashed assets: cache-first, network only on a miss. */
async function handleImmutable(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request).catch(() => null);
  if (isStorable(response) && isImmutableResponse(response)) {
    void putSafely(STATIC_CACHE, request, response.clone(), STATIC_MAX_ENTRIES);
  }
  return response || Response.error();
}

/** Everything else static: instant from cache, refreshed in the background. */
async function handleRevalidating(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (isStorable(response)) {
        void putSafely(STATIC_CACHE, request, response.clone(), STATIC_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  return (await network) || Response.error();
}

/**
 * API data: network-first with a timeout, falling back to the last good
 * response — so offline (or on a dead-slow link) the app shows saved data
 * instead of an error.
 */
async function handleApi(request) {
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        void putSafely(DATA_CACHE, request, response.clone(), DATA_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => null);

  const fresh = await withTimeout(network, DATA_TIMEOUT_MS);
  if (fresh && fresh.ok) return fresh;

  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  return cached || fresh || Response.error();
}

/** Allow-listed remote images: cache-first so they render with no network. */
async function handleMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request).catch(() => null);
  if (isStorable(response)) {
    void putSafely(MEDIA_CACHE, request, response.clone(), MEDIA_MAX_ENTRIES);
  }
  return response || Response.error();
}

/* -------------------------------- fetch ------------------------------- */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POSTs (handwriting) always go live

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (MEDIA_HOSTS.includes(url.hostname) && request.destination === "image") {
      event.respondWith(handleMedia(request));
    }
    return; // every other cross-origin request hits the network untouched
  }

  if (isHmrRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (isImmutableAsset(url)) {
    event.respondWith(handleImmutable(request));
    return;
  }
  if (isCacheableApi(url)) {
    event.respondWith(handleApi(request));
    return;
  }
  if (isRevalidatingAsset(url)) {
    event.respondWith(handleRevalidating(request));
  }
});

/* ----------------------------- client messages ------------------------ */

/** Count entries per owned cache — powers the "saved for offline" readout. */
async function cacheStatus() {
  const counts = {};
  let total = 0;
  for (const name of OWNED_CACHES) {
    const has = await caches.has(name);
    const keys = has ? await (await caches.open(name)).keys() : [];
    const label = name.replace(`-${VERSION}`, "").replace("oneapp-", "");
    counts[label] = keys.length;
    total += keys.length;
  }
  return { version: VERSION, counts, total };
}

/** Warm the cache with URLs the page discovered (chunks it just imported). */
async function precache(urls) {
  const cache = await caches.open(STATIC_CACHE);
  let saved = 0;
  await Promise.all(
    (Array.isArray(urls) ? urls : []).map(async (url) => {
      try {
        if (await cache.match(url)) {
          saved += 1;
          return;
        }
        await cache.add(url);
        saved += 1;
      } catch {
        /* unreachable asset — skip it, the rest still cache */
      }
    }),
  );
  return { saved };
}

async function clearCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith("oneapp-")).map((k) => caches.delete(k)));
  return { cleared: true };
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const reply = (payload) => event.ports?.[0]?.postMessage(payload);

  switch (data.type) {
    case "SKIP_WAITING":
      void self.skipWaiting();
      break;
    case "CACHE_STATUS":
      event.waitUntil(cacheStatus().then(reply));
      break;
    case "PRECACHE":
      event.waitUntil(precache(data.urls).then(reply));
      break;
    case "CLEAR_CACHES":
      event.waitUntil(clearCaches().then(reply));
      break;
    default:
      break;
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
