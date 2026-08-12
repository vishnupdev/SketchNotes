"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { WifiOffIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Keeps one app's failure inside that app.
 *
 * Every app but Sketchnotes is code-split, so mounting it downloads a chunk. If
 * that download fails the import rejects *during render*, and with no boundary
 * in the way React tears down the whole tree — the workspace, the launcher and
 * all — leaving the browser's "this page couldn't load" screen. Offline that is
 * the normal case for an app whose chunk isn't cached yet (a connection lost
 * before the worker finished saving the build, or a deploy that renamed the
 * chunks), so the one situation the offline story exists for was the one that
 * broke hardest.
 *
 * With this boundary the failure stays local: the shell keeps running, the
 * launcher still switches apps, and the app's own panel explains itself.
 *
 * Recovery is a reload rather than a re-render, because `React.lazy` (which
 * `next/dynamic` builds on) memoises the rejected import — re-rendering the
 * same component replays the failure without asking the network again. The
 * shell itself is cached, so the reload is cheap even with no connection, and
 * the worker will have another go at the chunk.
 */

interface AppLoadBoundaryProps {
  /** App name, so the message names the thing that failed. */
  name: string;
  /**
   * Opens the app launcher. Essential rather than decorative: the button that
   * normally opens it lives in the app's own header, which is exactly what
   * failed to render — and reloading returns to the same route and fails the
   * same way, so without this the user is stuck on a dead panel.
   */
  onBrowseApps: () => void;
  children: ReactNode;
}

interface AppLoadBoundaryState {
  /** The error, or null while all is well. */
  error: Error | null;
}

/**
 * True for "the browser couldn't fetch this module" — as opposed to a bug
 * inside the app, which deserves different wording. Next/webpack use
 * `ChunkLoadError`; native ESM failures surface as a TypeError naming the
 * import, so match on the message too.
 */
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk|failed to load chunk|error loading dynamically imported module|failed to fetch dynamically imported module/i.test(
      error.message,
    )
  );
}

export class AppLoadBoundary extends Component<AppLoadBoundaryProps, AppLoadBoundaryState> {
  state: AppLoadBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppLoadBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A missing chunk offline is expected, not a defect, so it is not reported
    // as an error — that would put a console error on a normal offline session
    // (rule #7). Anything else is a real fault and still gets logged.
    if (isChunkLoadError(error)) return;
    console.error(`[${this.props.name}] failed to render`, error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const offlineChunk = isChunkLoadError(error);

    return (
      <div
        role="alert"
        className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-20 text-center"
      >
        <WifiOffIcon size={32} className="text-ink-soft" />
        <p className="text-[14px] font-semibold">
          {offlineChunk
            ? `${this.props.name} isn't saved for offline use yet`
            : `${this.props.name} couldn't be opened`}
        </p>
        <p className="max-w-[340px] text-[12.5px] leading-relaxed text-ink-soft">
          {offlineChunk
            ? "Open it once while you're connected and it's kept on this device from then on. Every app already saved still works."
            : "Something went wrong starting this app. Your saved work is untouched."}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {/* Listed first, and the filled button, because it is the action that
              works right now — a reload of this same route fails again while the
              chunk is still unreachable. */}
          <button
            type="button"
            onClick={this.props.onBrowseApps}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Open another app
          </button>
          <button
            type="button"
            onClick={this.reload}
            className="rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
