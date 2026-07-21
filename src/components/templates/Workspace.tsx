"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useEditorStore } from "@/store/useEditorStore";
import { EditorShell } from "@/components/templates/EditorShell";
import { AppLauncher } from "@/components/organisms/AppLauncher";
import { cx } from "@/lib/utils";

/** URL prefix that maps to the embedded PDF editor. */
const PDF_BASE = "/pdfeditor";

/** Split the current path into {isPdf, tool}. `tool` is null for the PDF home. */
function parsePath(pathname: string): { isPdf: boolean; tool: string | null } {
  if (pathname === PDF_BASE || pathname === PDF_BASE + "/") return { isPdf: true, tool: null };
  if (pathname.startsWith(PDF_BASE + "/")) {
    const tool = pathname.slice(PDF_BASE.length + 1).replace(/\/+$/, "");
    return { isPdf: true, tool: tool || null };
  }
  return { isPdf: false, tool: null };
}
const pdfPath = (tool: string | null) => (tool ? `${PDF_BASE}/${tool}` : PDF_BASE);

/**
 * Top-level workspace that hosts every app and keeps the browser URL in sync
 * with what's on screen. Sketchnotes lives at `/`; the PDF editor lives at
 * `/pdfeditor` and `/pdfeditor/<section>`. The PDF editor is a self-contained
 * page in an iframe, mounted lazily on first open and then kept alive so its
 * loaded document survives app/section switches; its light/dark theme mirrors
 * the Sketchnotes shell.
 */
export function Workspace() {
  const activeApp = useWorkspaceStore((s) => s.activeApp);
  const pdfMounted = useWorkspaceStore((s) => s.pdfMounted);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const dark = useEditorStore((s) => s.dark);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Frozen once so toggling theme/section never reloads the iframe.
  const srcRef = useRef<string | null>(null);
  // Latest values read by event handlers without re-subscribing.
  const darkRef = useRef(dark);
  darkRef.current = dark;
  const activeAppRef = useRef(activeApp);
  activeAppRef.current = activeApp;
  // Current PDF section (null = its home), and the section to deep-link on load.
  const pdfToolRef = useRef<string | null>(null);
  const initialToolRef = useRef<string | null>(null);
  const didInit = useRef(false);
  const appSynced = useRef(false);

  if (pdfMounted && srcRef.current === null) {
    const t = initialToolRef.current;
    srcRef.current = `/apps/pdf-editor.html?theme=${dark ? "dark" : "light"}${t ? `#${t}` : ""}`;
  }

  const pushTheme = useCallback((isDark: boolean) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "sketchnotes:theme", theme: isDark ? "dark" : "light" },
      "*",
    );
  }, []);

  const navigateIframe = useCallback((tool: string | null) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "sketchnotes:navigate", tool }, "*");
  }, []);

  const setUrl = useCallback((path: string) => {
    if (typeof window === "undefined" || window.location.pathname === path) return;
    window.history.pushState(null, "", path);
  }, []);

  // One-time init: adopt the app/section encoded in the URL on first load.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const { isPdf, tool } = parsePath(window.location.pathname);
    if (isPdf) {
      initialToolRef.current = tool;
      pdfToolRef.current = tool;
      setActiveApp("pdf");
    }
  }, [setActiveApp]);

  // Mirror the shell theme into the embedded editor.
  useEffect(() => {
    if (pdfMounted) pushTheme(dark);
  }, [dark, pdfMounted, pushTheme]);

  // Messages from the embedded editor.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d.type !== "string") return;
      if (d.type === "sketchnotes:open-launcher") openLauncher();
      else if (d.type === "sketchnotes:iframe-ready") pushTheme(darkRef.current);
      else if (d.type === "sketchnotes:route") {
        const tool: string | null = d.tool ?? null;
        pdfToolRef.current = tool;
        if (activeAppRef.current === "pdf") setUrl(pdfPath(tool));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openLauncher, pushTheme, setUrl]);

  // Reflect app switches into the URL. The first pass only records state so a
  // deep link isn't overwritten before the init effect adopts it.
  useEffect(() => {
    if (!appSynced.current) {
      appSynced.current = true;
      return;
    }
    setUrl(activeApp === "pdf" ? pdfPath(pdfToolRef.current) : "/");
  }, [activeApp, setUrl]);

  // Browser back/forward: re-derive the view from the URL and steer the iframe.
  useEffect(() => {
    const onPop = () => {
      const { isPdf, tool } = parsePath(window.location.pathname);
      if (isPdf) {
        pdfToolRef.current = tool;
        if (activeAppRef.current !== "pdf") setActiveApp("pdf");
        navigateIframe(tool);
      } else if (activeAppRef.current !== "sketchnotes") {
        setActiveApp("sketchnotes");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActiveApp, navigateIframe]);

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
