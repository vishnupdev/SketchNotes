/**
 * The map's image store: one `Image` per tile address, kept until the cache is
 * full, then evicted least-recently-drawn first.
 *
 * Why this exists rather than a hundred `<img>` elements: the map is drawn to a
 * canvas, so every frame needs the decoded bitmap synchronously. A cache that
 * answers "have you got this one?" without touching the network is what lets the
 * renderer draw whatever it has *this* frame — a blurrier parent tile, usually —
 * and repaint when the real one lands, instead of showing holes while panning.
 *
 * `crossOrigin = "anonymous"` is set so a drawn tile does not taint the canvas.
 * Nothing here reads pixels back today, but a tainted canvas fails silently and
 * only much later, which is not a trap worth leaving armed.
 */

type Status = "loading" | "ready" | "failed";

interface Entry {
  image: HTMLImageElement;
  status: Status;
  /** Draw counter at last use, for eviction. */
  used: number;
}

export class TileCache {
  private entries = new Map<string, Entry>();
  private clock = 0;
  private inFlight = 0;

  /**
   * @param onReady called when a tile finishes loading, so the map repaints
   * @param limit   how many decoded tiles to hold; a screenful is ~30
   * @param maxParallel cap on simultaneous requests, so a fast pan does not
   *        open two hundred connections and starve the tiles actually on screen
   */
  constructor(
    private readonly onReady: () => void,
    private readonly limit = 320,
    private readonly maxParallel = 12,
  ) {}

  /**
   * The decoded tile at `url`, or null if it is not here yet. Requests it on the
   * first miss; a miss on a tile already loading or known bad costs nothing.
   */
  get(url: string): HTMLImageElement | null {
    const hit = this.entries.get(url);
    if (hit) {
      hit.used = this.clock++;
      return hit.status === "ready" ? hit.image : null;
    }
    if (this.inFlight >= this.maxParallel) return null;

    const image = new Image();
    const entry: Entry = { image, status: "loading", used: this.clock++ };
    this.entries.set(url, entry);
    this.inFlight++;

    const settle = (status: Status) => {
      entry.status = status;
      this.inFlight--;
      if (status === "ready") this.onReady();
    };
    image.onload = () => settle("ready");
    // A failed tile stays in the map as a tombstone: without it, every frame
    // would re-request a 404 for as long as that area is on screen.
    image.onerror = () => settle("failed");
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = url;

    this.evict();
    return null;
  }

  /**
   * The tile at `url` only if it is already decoded — never a request.
   *
   * This is what the parent-tile fallback asks with. Zooming in reveals four
   * tiles where one was, and requesting the whole pyramid above every hole
   * would flood the connection with imagery that is about to be covered up. So
   * coarser levels are *borrowed* when they happen to be in hand, and otherwise
   * skipped.
   */
  peek(url: string): HTMLImageElement | null {
    const hit = this.entries.get(url);
    if (!hit || hit.status !== "ready") return null;
    hit.used = this.clock++;
    return hit.image;
  }

  /** True once this address has been tried and found missing. */
  failed(url: string): boolean {
    return this.entries.get(url)?.status === "failed";
  }

  private evict(): void {
    if (this.entries.size <= this.limit) return;
    const ordered = [...this.entries.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [url, entry] of ordered.slice(0, this.entries.size - this.limit)) {
      if (entry.status === "loading") continue; // let it land; it will age out next time
      this.entries.delete(url);
    }
  }

  /** Drop everything — used when the layer changes and the old tiles are dead. */
  clear(): void {
    for (const entry of this.entries.values()) {
      if (entry.status === "loading") entry.image.src = "";
    }
    this.entries.clear();
    this.inFlight = 0;
  }
}
