/**
 * The two ways something arrives from outside the workspace, read on start-up.
 *
 * Both are deliberately thin: they collect `File`s (and shared text) and hand
 * them over. Deciding which app opens what is `./classify.ts`, and delivering it
 * is `components/Intake/IntakeBridge.tsx`.
 */

/** Where the service worker leaves a shared payload. Mirrored in `public/sw.js`. */
export const SHARE_CACHE = "oneapp-share";
export const SHARE_INDEX_URL = "/_share/index.json";

/** The share payload as the worker stored it. */
interface StoredShare {
  title?: string;
  text?: string;
  url?: string;
  /** Cache URLs of the shared files, with the name and type to rebuild them. */
  files?: Array<{ url: string; name: string; type: string }>;
}

/**
 * One incoming file, with the handle it arrived on where the platform gave one.
 *
 * The handle is the valuable half: it is what lets the app *save back* to the
 * very file the user double-clicked, instead of producing a second copy in the
 * downloads folder. Shares never carry one — the payload was copied to us.
 */
export interface IncomingFile {
  file: File;
  handle?: FileSystemFileHandle;
}

export interface Arrival {
  files: IncomingFile[];
  text?: string;
  url?: string;
  title?: string;
}

/* --------------------------- file handlers ---------------------------- */

/**
 * Files the operating system launched the app with (`file_handlers` in the
 * manifest, delivered through `launchQueue`).
 *
 * The consumer must be set as early as possible — the queue holds one launch and
 * only flushes it once something is listening — which is why this is called from
 * a component mounted with the workspace rather than lazily.
 *
 * Chromium-only today; everywhere else the call is a no-op and files simply
 * never arrive this way.
 */
export function onLaunchFiles(deliver: (arrival: Arrival) => void): void {
  if (typeof window === "undefined") return;
  const queue = window.launchQueue;
  if (!queue?.setConsumer) return;
  queue.setConsumer((params) => {
    void (async () => {
      const handles = params.files ?? [];
      if (handles.length === 0) return;
      const files: IncomingFile[] = [];
      for (const handle of handles) {
        try {
          files.push({ file: await handle.getFile(), handle });
        } catch {
          /* a file that vanished between launch and read — skip it */
        }
      }
      if (files.length) deliver({ files });
    })();
  });
}

/* ----------------------------- share target --------------------------- */

/**
 * Read anything shared into the app, then delete it from the cache.
 *
 * The worker answers the share POST with a redirect and leaves the payload in a
 * cache, because a `POST` cannot survive into the page that ends up on screen.
 * Reading it here is destructive on purpose: a share is a one-time delivery, and
 * a copy left behind would be re-opened on the next reload.
 */
export async function takeSharedArrival(): Promise<Arrival | null> {
  if (typeof caches === "undefined") return null;
  try {
    if (!(await caches.has(SHARE_CACHE))) return null;
    const cache = await caches.open(SHARE_CACHE);
    const indexResponse = await cache.match(SHARE_INDEX_URL);
    if (!indexResponse) return null;

    const stored = (await indexResponse.json()) as StoredShare;
    const files: IncomingFile[] = [];
    for (const entry of stored.files ?? []) {
      const response = await cache.match(entry.url);
      if (!response) continue;
      const blob = await response.blob();
      files.push({ file: new File([blob], entry.name, { type: entry.type || blob.type }) });
    }

    await caches.delete(SHARE_CACHE);
    if (!files.length && !stored.text && !stored.url) return null;
    return { files, text: stored.text, url: stored.url, title: stored.title };
  } catch {
    return null;
  }
}

/**
 * How this load was started, from the marker on the redirect:
 *
 *  - `"1"`       a share the worker stored and this page can read
 *  - `"missed"`  the POST reached the server, so the worker wasn't controlling
 *                the page yet and the payload was deliberately not uploaded
 *  - `"failed"`  the worker had it but couldn't read the form
 *  - `null`      an ordinary load
 */
export function shareMarker(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("share");
}

/**
 * Drop the `?share=…` marker from the address bar once it has been acted on, so
 * a reload doesn't look like a second share.
 */
export function clearShareMarker(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("share")) return;
  url.searchParams.delete("share");
  window.history.replaceState(null, "", url.pathname + url.search);
}
