/**
 * Keeping the screen awake while a big transfer runs.
 *
 * A multi-gigabyte file takes minutes, and on a phone the screen dims and locks
 * long before that. Locking is not automatically fatal — a data channel can
 * survive it — but on many devices the tab is frozen or the radio parked, and the
 * transfer stalls or dies. Holding a wake lock for the duration is the difference
 * between "leave it running" and "stand here tapping the screen".
 *
 * Deliberately narrow: the lock is taken when a transfer starts, released the
 * moment it ends (or the app is left), and re-taken if the page comes back from
 * being hidden — a lock is dropped automatically then, and not re-taking it would
 * silently lose the protection. Where the API is missing it does nothing at all,
 * because a transfer that works is better than one that insists on a permission.
 */

type Sentinel = { release: () => Promise<void>; released: boolean; onrelease?: () => void };

/**
 * `navigator.wakeLock` is typed as always present by the DOM library but is
 * genuinely absent on Safari and Firefox, so it is read through a shape that
 * admits that rather than through the lie.
 */
type WakeLockHolder = { request: (type: "screen") => Promise<Sentinel> } | undefined;

const holder = (): WakeLockHolder =>
  (navigator as Navigator & { wakeLock?: WakeLockHolder }).wakeLock;

export class ScreenAwake {
  private sentinel: Sentinel | null = null;
  private wanted = false;
  private onVisible = () => {
    // A lock is released when the page is hidden; take it again on return.
    if (this.wanted && document.visibilityState === "visible") void this.take();
  };

  /** Whether this browser can hold the screen on at all. */
  static supported(): boolean {
    return typeof navigator !== "undefined" && "wakeLock" in navigator;
  }

  async acquire(): Promise<void> {
    if (this.wanted) return;
    this.wanted = true;
    document.addEventListener("visibilitychange", this.onVisible);
    await this.take();
  }

  private async take(): Promise<void> {
    const wakeLock = holder();
    if (!wakeLock || this.sentinel) return;
    try {
      const sentinel = await wakeLock.request("screen");
      this.sentinel = sentinel;
      // Cleared when the browser drops it (battery saver, backgrounding) so the
      // next visibility change can ask again.
      sentinel.onrelease = () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      };
    } catch {
      this.sentinel = null; // refused; the transfer carries on regardless
    }
  }

  async release(): Promise<void> {
    this.wanted = false;
    document.removeEventListener("visibilitychange", this.onVisible);
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (!sentinel || sentinel.released) return;
    try {
      await sentinel.release();
    } catch {
      /* already gone */
    }
  }
}
