"use client";

import type { ReactNode } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

interface AppBrandProps {
  /** The app's glyph, sized to sit inside the 46px accent tile. */
  icon: ReactNode;
  /** App name — the large title line. */
  name: string;
  /** The italic line under the name. */
  tagline: ReactNode;
  /**
   * Render the name as this page's `<h1>`. Off by default: `SeoContent` owns the
   * document's single top-level heading for most apps.
   */
  heading?: boolean;
  /**
   * Ran just before leaving, for apps holding something that must not follow the
   * user out — a playing tone, a live microphone, a running timer.
   */
  onLeave?: () => void;
}

/**
 * The masthead brand block every app shares: accent icon tile, app name, tagline
 * and byline — and the way back to the workspace home.
 *
 * A real `href` keeps it crawlable and middle-clickable, but a plain click is
 * intercepted: the workspace swaps apps in place and syncs the URL itself (see
 * `Workspace.tsx`), so a real navigation would tear down the whole client shell
 * for nothing. Modified clicks stay native, so "open in new tab" still works.
 */
export function AppBrand({ icon, name, tagline, heading = false, onLeave }: AppBrandProps) {
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const Name = heading ? "h1" : "div";

  return (
    /* eslint-disable-next-line @next/next/no-html-link-for-pages */
    <a
      href="/"
      onClick={(e) => {
        // Keep modified clicks (new tab/window) native.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onLeave?.();
        setActiveApp("sketchnotes");
      }}
      title="Back to home"
      aria-label={`${name} — back to the home app`}
      className="-m-1 flex items-center gap-3.5 rounded-[15px] p-1 hover:opacity-90"
    >
      <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-on-accent shadow-[0_0_0_4px_var(--accent-soft)]">
        {icon}
      </span>
      <div>
        <Name className="text-[27px] font-extrabold leading-none tracking-tight">{name}</Name>
        <div className="mt-1 font-serif text-[15px] italic text-ink-soft">{tagline}</div>
        <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">
          by Vishnu P
        </div>
      </div>
    </a>
  );
}
