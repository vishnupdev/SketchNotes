/*
 * Service worker for the OneApp workspace. Two jobs:
 *
 *  1. OFFLINE / LOW-BANDWIDTH CACHING — every app in the workspace keeps
 *     working with a slow connection or no connection at all, including a cold
 *     reload of any deep link while offline. All app data already lives on the
 *     device (IndexedDB, see src/lib/storage.ts), so once the shells + JS chunks
 *     are cached the whole workspace runs locally.
 *
 *  2. NOTIFICATIONS — displays and handles reminder notifications, required so
 *     alerts show on mobile browsers where the page-context `Notification`
 *     constructor is disallowed. Also *checks* for due reminders on a periodic
 *     background sync, so an alert still arrives when no tab is open (see
 *     "background reminders" below).
 *
 *  3. SHARE TARGET — catches the `POST /share-target` the platform's share sheet
 *     sends, stashes the payload in a cache and redirects to the workspace,
 *     which reads it back. Handling it here is what keeps a shared file on the
 *     device: nothing is uploaded, because the request never reaches a server.
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

// Bumped whenever the precached shell list or the caching rules change, so
// existing installs pick up newly added app routes instead of serving a cache
// that predates them. v7 added build-manifest precaching (every code-split app
// chunk, not just the ones visited) and query-tolerant static lookups; v8 adds
// the /nearby route; v10 adds the share target, background reminder checks and
// the /qr and /handoff routes; v11 adds the /drop route and File Drop's
// streaming downloads; v12 adds the /clone route.
const VERSION = "oneapp-v16";
const SHELL_CACHE = `oneapp-shell-${VERSION}`;
const STATIC_CACHE = `oneapp-static-${VERSION}`;
const DATA_CACHE = `oneapp-data-${VERSION}`;
const MEDIA_CACHE = `oneapp-media-${VERSION}`;
const OWNED_CACHES = [SHELL_CACHE, STATIC_CACHE, DATA_CACHE, MEDIA_CACHE];

/** Serve from cache if the network hasn't answered within these budgets. */
const NAV_TIMEOUT_MS = 3500;
const DATA_TIMEOUT_MS = 6000;

/**
 * Stamped on API responses replayed from cache, so the page can tell a saved
 * answer from a live one — and, more usefully, *why* it got the saved one:
 *
 *   "offline"  the request failed outright: there is no usable connection
 *   "stale"    the network answered too slowly or with an error, so it is
 *              reachable and only this response wasn't good enough
 *
 * Without the distinction a cached reply looks exactly like a successful
 * request, and `src/lib/net/fetch.ts` would read it as proof the network is fine
 * — clearing the offline state at the exact moment saved data is being served.
 * The "offline" value is the app's most reliable offline signal, because
 * `navigator.onLine` can claim a connection that does not work. Keep in sync
 * with `CACHED_RESPONSE_HEADER` there.
 */
const CACHED_RESPONSE_HEADER = "x-oneapp-cached";

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
  "/board",
  "/todos",
  "/reminders",
  "/timer",
  "/system",
  "/resources",
  "/nearby",
  "/speedtest",
  "/news",
  "/streams",
  "/worldclock",
  "/malayalam",
  "/translate",
  "/morse",
  "/soundmeter",
  "/color",
  "/qr",
  "/qrfiles",
  "/handoff",
  "/clone",
  "/drop",
  "/text",
  "/assistant",
  "/walkaround",
  "/scan",
  "/wallet",
  "/voice",
  "/convert",
  "/apiclient",
  "/snippets",
  "/markdown",
  "/chrono",
  "/contrast",
  "/satellite",
];

/** Non-HTML files the workspace can't start (or edit PDFs) without. */
const CORE_ASSET_URLS = ["/manifest.webmanifest", "/icon.svg", "/pdf.worker.min.mjs"];

/**
 * Written by `scripts/generate-precache.mjs` at build time: every JS/CSS file
 * under `/_next/static`, including the code-split chunk for each app.
 *
 * This is what makes the *whole* workspace offline-ready after one online
 * visit. Without it, an app's chunk only landed in the cache if the client
 * warm-up had reached that app before the connection dropped — and opening an
 * un-warmed app offline failed to load its chunk, which takes down the page.
 */
const BUILD_MANIFEST_URL = "/precache-manifest.json";

/** Remote hosts whose images may be cached (news publisher logos, country flags, video art). */
const MEDIA_HOSTS = ["www.google.com", "news.google.com", "flagcdn.com", "i.ytimg.com"];

/*
 * Share target. The manifest points the platform's share sheet at this path; the
 * POST is answered here and never travels. The payload waits in its own cache —
 * deliberately not one of the OWNED_CACHES above, so clearing the offline files
 * can't throw away something the user just shared — and is read back (and
 * deleted) by `src/lib/intake/arrivals.ts`. Keep both sides in step.
 */
const SHARE_TARGET_PATH = "/share-target";
const SHARE_CACHE = "oneapp-share";
const SHARE_INDEX_URL = "/_share/index.json";

/*
 * Streaming downloads for File Drop.
 *
 * A browser will only download something you can hand it in full, which is the
 * wall a multi-gigabyte transfer hits on any browser without the folder picker.
 * So the page hands *this worker* the readable end of a stream, and the worker
 * answers a fetch for /_drop/<id> with that stream as the body: the browser
 * writes it to disk as it arrives, and the page never holds more than a chunk.
 *
 * Nothing leaves the device — the "download" is served from inside this browser.
 * Entries are one-shot and are dropped as soon as they are claimed, so a reload
 * cannot replay a stale stream. Keep in sync with `lib/FileDrop/stream-download.ts`.
 */
const STREAM_PATH = "/_drop/";
const pendingStreams = new Map();

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

/* --------------------- whole-build precaching ------------------------- */

/**
 * Connection classes where optional downloads are skipped, mirroring
 * `src/lib/net/status.ts` — precaching the whole build behind the user's back
 * must never spend a metered or 2g-class connection. A user who wants it anyway
 * gets it from Settings → Offline, which forces this through.
 */
function connectionIsMetered() {
  const c = self.navigator && self.navigator.connection;
  if (!c) return false;
  return Boolean(c.saveData) || c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

/** Once-per-worker guard, so concurrent fetch events share a single run. */
let buildPrecache = null;

/**
 * Download every asset in the build manifest that isn't already stored.
 *
 * Deliberately *not* run from `install`/`activate`: their `waitUntil` gates the
 * worker's activation, and fetch events aren't dispatched to a worker that
 * hasn't activated — so precaching a few MB there would stall the very page
 * that just registered the worker. It's kicked off from the first fetch event
 * instead, where `waitUntil` keeps the worker alive without delaying any
 * response.
 */
async function precacheBuild(force = false) {
  if (!force && connectionIsMetered()) return { skipped: "metered" };

  const manifest = await fetch(BUILD_MANIFEST_URL, { cache: "no-cache" })
    .then((res) => (res && res.ok ? res.json() : null))
    .catch(() => null);

  const assets = manifest && Array.isArray(manifest.assets) ? manifest.assets : null;
  if (!assets || assets.length === 0) return { skipped: "no-manifest" };

  const cache = await caches.open(STATIC_CACHE);
  const stored = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
  const missing = assets.filter((url) => !stored.has(url));

  // add() one at a time rather than addAll(): addAll is atomic, so a single
  // asset that 404s after a redeploy would discard the whole batch.
  let saved = 0;
  await Promise.all(
    missing.map((url) =>
      cache
        .add(url)
        .then(() => {
          saved += 1;
        })
        .catch(() => {}),
    ),
  );

  // The manifest lists one build's output, which is well inside the cap; trim
  // afterwards so the entries evicted are the previous deploy's, not this one's.
  await trimCache(STATIC_CACHE, STATIC_MAX_ENTRIES);
  return { saved, total: assets.length, revision: manifest.revision ?? null };
}

/** Run the build precache at most once per worker, unless forced. */
function ensureBuildPrecached(force = false) {
  if (force) {
    buildPrecache = precacheBuild(true).catch(() => ({ skipped: "error" }));
    return buildPrecache;
  }
  if (!buildPrecache) {
    buildPrecache = precacheBuild(false).catch(() => ({ skipped: "error" }));
  }
  return buildPrecache;
}

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
 * Same-origin API responses safe to replay from cache: news headlines and
 * stream listings (stale beats blank — a station still shows what it found last
 * time, even though playing it needs the network) and translations
 * (deterministic for a given query, so a cached hit is the same answer the
 * network would give).
 */
function isCacheableApi(url) {
  return (
    url.pathname === "/api/news" ||
    url.pathname === "/api/streams" ||
    url.pathname === "/api/worldclock/news" ||
    url.pathname === "/api/translate"
  );
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
  /*
   * `ignoreSearch` on the fallback, because these URLs are versioned by query
   * string rather than by filename: the root layout asks for `/icon.svg?v=2`
   * while the precache stored `/icon.svg`, and an exact match misses — which
   * offline meant a failed icon request on every single page load.
   *
   * Safe for this set specifically (see `isRevalidatingAsset`): it is static
   * files and the core assets, where a query string is only ever a cache-buster
   * and never selects different bytes.
   */
  const cached =
    (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
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
  // Whether the request failed at the transport level, as opposed to being slow
  // or answering with an error — that is the difference between "no connection"
  // and "connection fine, this response wasn't", and the page acts on it.
  let unreachable = false;

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        void putSafely(DATA_CACHE, request, response.clone(), DATA_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => {
      unreachable = true;
      return null;
    });

  const fresh = await withTimeout(network, DATA_TIMEOUT_MS);
  if (fresh && fresh.ok) return fresh;

  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  // A timeout leaves the fetch still running, so `unreachable` is only true when
  // it actually rejected — a slow link is reported as "stale", not offline.
  if (cached) return labelAsCached(cached, unreachable ? "offline" : "stale");
  return fresh || Response.error();
}

/**
 * Copy a cached response with {@link CACHED_RESPONSE_HEADER} added, since a
 * Response's own headers are immutable. Only used for API data, which is small
 * JSON — buffering the body here would be the wrong trade for large assets.
 */
async function labelAsCached(response, reason) {
  try {
    const headers = new Headers(response.headers);
    headers.set(CACHED_RESPONSE_HEADER, reason);
    return new Response(await response.blob(), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response; // labelling is a nicety; serving the data is the point
  }
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

/* ----------------------------- share target --------------------------- */

/**
 * Receive a share: stash the files and text, then redirect to the workspace.
 *
 * A `POST` cannot survive a navigation, so the payload is written to a cache and
 * the browser is sent to `/?share=1`; the page reads it from there. `303` is the
 * status that turns the POST into a GET — a 302 would have the browser re-POST.
 */
async function handleShare(request) {
  const stored = { files: [] };
  try {
    const form = await request.formData();
    const title = form.get("title");
    const text = form.get("text");
    const url = form.get("url");
    if (typeof title === "string") stored.title = title;
    if (typeof text === "string") stored.text = text;
    if (typeof url === "string") stored.url = url;

    const cache = await caches.open(SHARE_CACHE);
    const files = form.getAll("files").filter((f) => f && typeof f !== "string");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = `/_share/${i}`;
      await cache.put(
        fileUrl,
        new Response(file, {
          headers: { "content-type": file.type || "application/octet-stream" },
        }),
      );
      stored.files.push({
        url: fileUrl,
        name: file.name || `shared-${i}`,
        type: file.type || "",
      });
    }
    await cache.put(
      SHARE_INDEX_URL,
      new Response(JSON.stringify(stored), {
        headers: { "content-type": "application/json" },
      }),
    );
  } catch {
    // A share that can't be read is still a navigation the user is waiting on:
    // send them into the workspace rather than leaving them on a failed POST.
    return Response.redirect("/?share=failed", 303);
  }
  return Response.redirect("/?share=1", 303);
}

/* --------------------------- streaming downloads ---------------------- */

/**
 * Answer a /_drop/<id> request with the stream the page handed us.
 *
 * `Content-Length` is set because we know the size up front, which is what gives
 * the browser's own download UI a real progress bar instead of a spinner.
 */
function handleStreamDownload(id) {
  const entry = pendingStreams.get(id);
  if (!entry) return new Response("No such transfer.", { status: 404 });
  // One shot: claimed streams are forgotten, so a reload can't replay one.
  pendingStreams.delete(id);

  const headers = new Headers({
    "content-type": entry.mime || "application/octet-stream",
    // The filename is quoted and stripped of quotes/newlines by the page before
    // it gets here (see `safeName`), so it cannot break the header.
    "content-disposition": `attachment; filename="${entry.name}"`,
    "cache-control": "no-store",
  });
  if (Number.isFinite(entry.size) && entry.size > 0) {
    headers.set("content-length", String(entry.size));
  }
  return new Response(entry.readable, { headers });
}

/* -------------------------------- fetch ------------------------------- */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const target = new URL(request.url);

  /*
   * Checked before anything else, and before the navigation branch in
   * particular: the download is started in an iframe, so it *is* a navigation,
   * and the shell-serving rule below would answer it with the app's HTML.
   */
  if (
    target.origin === self.location.origin &&
    target.pathname.startsWith(STREAM_PATH) &&
    request.method === "GET"
  ) {
    event.respondWith(handleStreamDownload(target.pathname.slice(STREAM_PATH.length)));
    return;
  }

  // The one POST this worker answers itself; every other POST goes live.
  if (request.method === "POST") {
    if (target.origin === self.location.origin && target.pathname === SHARE_TARGET_PATH) {
      event.respondWith(handleShare(request));
    }
    return;
  }
  if (request.method !== "GET") return;

  const url = target;

  /*
   * First same-origin request after the worker starts: store the rest of the
   * build in the background. `waitUntil` here only keeps the worker alive — it
   * does not delay this response — so the page loads at full speed while every
   * app's chunk is being saved for offline use.
   */
  if (url.origin === self.location.origin && !buildPrecache && !isHmrRequest(url)) {
    event.waitUntil(ensureBuildPrecached());
  }

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
    // Settings → Offline: store the whole build now, metered link included —
    // an explicit "save for offline" is the user choosing to spend the data.
    case "PRECACHE_BUILD":
      event.waitUntil(ensureBuildPrecached(true).then(reply));
      break;
    case "CLEAR_CACHES":
      event.waitUntil(clearCaches().then(reply));
      break;
    /*
     * File Drop handing over the readable end of a stream, to be served as a
     * download (see STREAM_PATH above). Answered on the port that came with the
     * message, because the page must not start the download until the stream is
     * actually registered here — otherwise the fetch 404s.
     */
    /*
     * A page feeding a streaming download, saying it is still there. Handling
     * the message is the whole point — an event is what resets this worker's
     * idle timer, so a long download is not cut off by termination.
     */
    case "DROP_KEEPALIVE":
      break;
    case "DROP_STREAM":
      if (data.id && data.readable) {
        pendingStreams.set(data.id, {
          readable: data.readable,
          name: String(data.name || "file"),
          size: Number(data.size) || 0,
          mime: String(data.mime || "application/octet-stream"),
        });
        reply({ ok: true });
      } else {
        reply({ ok: false });
      }
      break;
    /*
     * Deliberately no "check reminders now" message: while a tab is open the
     * page owns firing (it can also ring and show the in-app alert), and having
     * both sides check the same collection at the same moment is how a reminder
     * ends up announced twice. The worker only ever checks when the browser
     * wakes it, which by definition is when no page is doing it.
     */
    default:
      break;
  }
});

/* ----------------------- background reminders ------------------------- */

/*
 * Reminders fire from the page while a tab is open (see
 * `components/Reminders/organisms/ReminderScheduler.tsx`). With no tab open
 * there is nothing running — so a reminder set for 9am was simply missed if the
 * workspace had been closed, which is a hole in the one feature whose whole job
 * is to interrupt you.
 *
 * A periodic background sync closes it: the browser wakes this worker every so
 * often, it reads the same reminders out of the same store the page uses, and
 * fires anything due. Two honest limits, both surfaced in the app:
 *
 *  - it is Chromium-only, and only for an *installed* app the browser considers
 *    engaged-with. Everywhere else this code never runs and reminders stay
 *    page-bound.
 *  - the browser decides *when* to wake us (typically not more often than
 *    hourly), so a background alert can be late. It is never early, and never
 *    fires twice: `firedAt` is written back before the notification is shown.
 *
 * The store is IndexedDB rather than localStorage precisely because this needs
 * to work — worker scope has no localStorage (see `src/lib/storage.ts`).
 */

const DB_NAME = "oneapp";
const DB_STORE = "kv";
const REMINDERS_KEY = "sknotes:reminders";
const REMINDER_SYNC_TAG = "oneapp-reminders";

/**
 * Open the workspace database *without* a version, so this worker can never
 * create or upgrade the schema — if the page has not built the store yet there
 * is nothing to read, and guessing at a version here could leave the page with a
 * database it cannot write to.
 */
function openDb() {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME);
    } catch {
      resolve(null);
      return;
    }
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.close();
        resolve(null);
        return;
      }
      resolve(db);
    };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function dbGet(db, key) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function dbSet(db, key, value) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Advance a fire time by one repeat interval. Mirrors `advanceRepeat` in
 * `src/lib/Reminders/types.ts` — including the calendar arithmetic, so a monthly
 * reminder lands on the same day of the month rather than 30 days later. Keep
 * the two in step.
 */
function advanceRepeat(at, repeat) {
  const d = new Date(at);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else return at + 60_000;
  return d.getTime();
}

/**
 * Fire every reminder that is due, and write the collection back.
 *
 * The write happens *before* the notifications are shown, so a worker killed
 * mid-run cannot repeat an alert it has already recorded — a late reminder is a
 * nuisance, a duplicate one at 3am is worse.
 */
async function checkReminders() {
  const db = await openDb();
  if (!db) return { checked: false };

  const raw = await dbGet(db, REMINDERS_KEY);
  if (!raw) {
    db.close();
    return { checked: true, fired: 0 };
  }

  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    db.close();
    return { checked: true, fired: 0 };
  }
  if (!Array.isArray(list)) {
    db.close();
    return { checked: true, fired: 0 };
  }

  const now = Date.now();
  const fired = [];
  let changed = false;

  const next = list.map((r) => {
    if (!r || typeof r.fireAt !== "number" || r.enabled === false || r.fireAt > now) return r;
    const repeat = r.repeat || "none";
    if (repeat === "none") {
      if (r.firedAt != null) return r; // already fired
      fired.push(r);
      changed = true;
      return { ...r, firedAt: now };
    }
    fired.push(r);
    changed = true;
    let at = r.fireAt;
    while (at <= now) at = advanceRepeat(at, repeat);
    return { ...r, firedAt: now, fireAt: at };
  });

  if (changed) await dbSet(db, REMINDERS_KEY, JSON.stringify(next));
  db.close();

  for (const r of fired) {
    try {
      await self.registration.showNotification(String(r.title || "Reminder"), {
        body: String(r.notes || "Reminder"),
        tag: `reminder-${r.id}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500],
        data: { app: "/reminders" },
      });
    } catch {
      /* a notification the platform refused — the record is already updated */
    }
  }

  return { checked: true, fired: fired.length };
}

// The browser's own wake-up. Registered by the page (see
// `src/lib/Reminders/background.ts`); the tag must match.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === REMINDER_SYNC_TAG) event.waitUntil(checkReminders());
});

// One-off background sync, used as the fallback where periodic sync is missing
// but one-shot sync is not: it at least covers the moment connectivity returns.
self.addEventListener("sync", (event) => {
  if (event.tag === REMINDER_SYNC_TAG) event.waitUntil(checkReminders());
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
