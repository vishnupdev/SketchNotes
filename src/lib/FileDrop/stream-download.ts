/**
 * Downloading a file the browser has not finished receiving yet.
 *
 * A browser will only download what you can hand it — normally a finished
 * `Blob`, which means holding the whole file first. That is the wall a
 * multi-gigabyte transfer hits on any browser without the folder picker.
 *
 * The way round it is the service worker. The page creates a stream, hands the
 * *readable* end to the worker, and then navigates to a URL the worker answers
 * with that stream as the response body. The browser sees an ordinary download
 * with a known length and writes it to disk as it arrives; the page writes into
 * the other end a chunk at a time and never holds more than one.
 *
 * Two properties worth noting:
 *
 *  - **The writer's `ready` promise is real backpressure.** If the disk cannot
 *    keep up, writes stop resolving, which is exactly the signal the transfer
 *    needs — it throttles rather than filling memory.
 *  - **Nothing leaves the device.** The "download" is served by a worker in this
 *    browser; there is no server involved at any point.
 *
 * Requires transferable streams (Chrome 89+, Firefox 103+, Safari 16.4+) and an
 * active service worker — so it is feature-detected, and in development, where
 * the worker is deliberately not registered, it simply reports unavailable.
 */

/** Path prefix the worker answers. Mirrored in `public/sw.js`. */
export const STREAM_PATH = "/_drop/";

let readiness: Promise<boolean> | null = null;

/**
 * Whether a streaming download can be set up in this browser, right now.
 *
 * Only a *positive* answer is cached. A worker that has installed but not yet
 * taken control cannot serve our URL, and that is the state a first-ever visit is
 * in — caching "no" there would leave streaming disabled for the whole session,
 * moments before it became available.
 */
export function streamDownloadReady(): Promise<boolean> {
  if (!readiness) {
    readiness = probe().then((ok) => {
      if (!ok) readiness = null;
      return ok;
    });
  }
  return readiness;
}

async function probe(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (typeof TransformStream === "undefined" || typeof MessageChannel === "undefined") return false;

  // Transferable streams: postMessage has to actually accept one.
  try {
    const probeStream = new TransformStream();
    const channel = new MessageChannel();
    channel.port1.postMessage(probeStream.readable, [probeStream.readable]);
    channel.port1.close();
    channel.port2.close();
  } catch {
    return false;
  }

  const worker = await controllingWorker();
  return worker !== null;
}

/**
 * The worker that is actually controlling this page.
 *
 * `navigator.serviceWorker.controller` is null on the very first load after a
 * worker installs (nothing is controlled until the next navigation), so the
 * registration's active worker is checked too — but only a *controlling* worker
 * can answer a fetch for this page, which is what a download needs.
 */
async function controllingWorker(): Promise<ServiceWorker | null> {
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    // Installed but not yet controlling: the worker claims its clients on
    // activation, so wait briefly for that rather than reporting a capability
    // the page is a second away from having.
    return await new Promise<ServiceWorker | null>((resolve) => {
      const timer = window.setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        resolve(null);
      }, 2000);
      const onChange = () => {
        window.clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        resolve(navigator.serviceWorker.controller);
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
    });
  } catch {
    return null;
  }
}

export interface DownloadStream {
  /** Write chunks here; `ready` is the backpressure signal. */
  writer: WritableStreamDefaultWriter<Uint8Array>;
  /** The URL the browser is downloading from, for diagnostics. */
  url: string;
}

/**
 * How often to poke the worker while a download is running.
 *
 * A service worker is terminated when the browser decides it is idle, and a
 * worker that dies mid-download takes the download with it. Serving a response
 * body is supposed to count as activity, but the margin is not generous and a
 * multi-gigabyte transfer runs for many minutes — so the page pings it. Cheap
 * insurance against the failure mode that only shows up on the largest files.
 */
const KEEPALIVE_MS = 10_000;

/**
 * Set up a streaming download and start it.
 *
 * The download is triggered with a hidden iframe rather than by navigating: a
 * navigation would tear down the page that is feeding the stream, and an
 * `<a download>` in some browsers refuses a URL that is not yet a file.
 */
export async function openDownloadStream(
  name: string,
  size: number,
  type: string,
): Promise<DownloadStream> {
  const worker = await controllingWorker();
  if (!worker) throw new Error("No service worker is controlling this page.");

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const url = `${STREAM_PATH}${id}`;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

  // Hand the readable end over, and wait for the worker to confirm it is holding
  // it — starting the download before that would 404.
  const channel = new MessageChannel();
  const registered = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("The worker didn't answer.")), 4000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      if ((event.data as { ok?: boolean })?.ok) resolve();
      else reject(new Error("The worker refused the stream."));
    };
  });

  worker.postMessage(
    { type: "DROP_STREAM", id, name, size, mime: type || "application/octet-stream", readable },
    [readable, channel.port2],
  );
  await registered;

  triggerDownload(url);

  // Keep the worker awake for as long as this download is being fed, and stop
  // the moment the writer is finished with — however it finished.
  const ping = window.setInterval(() => {
    navigator.serviceWorker.controller?.postMessage({ type: "DROP_KEEPALIVE" });
  }, KEEPALIVE_MS);

  const writer = writable.getWriter();
  void writer.closed.finally(() => window.clearInterval(ping));

  return { writer, url };
}

/** Start the download without navigating away from the page feeding it. */
function triggerDownload(url: string): void {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.src = url;
  document.body.appendChild(frame);
  // The frame's only job is to start the download; the response is an
  // attachment, so nothing ever renders in it.
  window.setTimeout(() => frame.remove(), 60_000);
}
