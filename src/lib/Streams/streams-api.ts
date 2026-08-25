import { fetchJson } from "@/lib/net/fetch";
import type { StreamKind, StreamSearchResponse, StreamVideo } from "./types";

/** Give up on a stalled search rather than spinning indefinitely. */
const STREAMS_TIMEOUT_MS = 12_000;

/**
 * Run a search through this site's own `/api/streams` route.
 *
 * The request goes out even when the browser reports offline: the service
 * worker answers it from the last successful response, so a station opened
 * earlier still lists its videos. Only when that misses too does this reject
 * with a {@link NetError} whose message is already fit to show - and playing
 * anything still needs a live connection, which the UI says plainly.
 */
export async function fetchStreams(
  query: string,
  kind: StreamKind,
  signal?: AbortSignal,
): Promise<StreamVideo[]> {
  const data = await fetchJson<StreamSearchResponse>(
    `/api/streams?q=${encodeURIComponent(query)}&kind=${kind}`,
    { label: "Streams", timeoutMs: STREAMS_TIMEOUT_MS, signal },
  );
  return data.videos ?? [];
}
