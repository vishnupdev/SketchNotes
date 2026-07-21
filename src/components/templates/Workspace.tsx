"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useEditorStore } from "@/store/useEditorStore";
import { EditorShell } from "@/components/templates/EditorShell";
import { AppLauncher } from "@/components/organisms/AppLauncher";
import { cx } from "@/lib/utils";

/**
 * Top-level workspace that hosts every app and the launcher used to switch
 * between them. Sketchnotes is the default view and stays mounted so the
 * canvas and any in-progress note survive an app switch; the PDF editor is a
 * self-contained page loaded in an iframe, mounted lazily on first open and
 * then kept alive. The iframe mirrors the Sketchnotes light/dark theme.
 */
export function Workspace() {
  const activeApp = useWorkspaceStore((s) => s.activeApp);
  const pdfMounted = useWorkspaceStore((s) => s.pdfMounted);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const dark = useEditorStore((s) => s.dark);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Frozen once so toggling the theme never reloads the iframe.
  const srcRef = useRef<string | null>(null);
  // Latest theme, read by the message handler without re-subscribing.
  const darkRef = useRef(dark);
  darkRef.current = dark;

  if (pdfMounted && srcRef.current === null) {
    srcRef.current = `/apps/pdf-editor.html?theme=${dark ? "dark" : "light"}`;
  }

  const pushTheme = useCallback((isDark: boolean) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "sketchnotes:theme", theme: isDark ? "dark" : "light" },
      "*",
    );
  }, []);

  // Keep the embedded editor in sync whenever the shell theme changes.
  useEffect(() => {
    if (pdfMounted) pushTheme(dark);
  }, [dark, pdfMounted, pushTheme]);

  // Messages from the embedded editor: open the launcher, or (re)send the
  // theme once the iframe reports it is ready.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const type = e.data && e.data.type;
      if (type === "sketchnotes:open-launcher") openLauncher();
      else if (type === "sketchnotes:iframe-ready") pushTheme(darkRef.current);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openLauncher, pushTheme]);

  const pdfActive = activeApp === "pdf";

  return (
    <>
      {/* Sketchnotes — always mounted, hidden while another app is active. */}
      <div hidden={pdfActive}>
        <EditorShell />
      </div>

      {/* PDF editor — mounted on first open, then kept alive and cross-faded. */}
      {pdfMounted && (
        <iframe
          ref={iframeRef}
          src={srcRef.current ?? undefined}
          title="PDF Editor"
          className={cx(
            "fixed inset-0 z-40 h-full w-full border-0 bg-paper transition-opacity duration-300 ease-out",
            pdfActive ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
      )}

      <AppLauncher />
    </>
  );
}
