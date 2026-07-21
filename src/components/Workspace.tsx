"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { EditorShell } from "@/components/SketchNotes/EditorShell";
import { AppLauncher } from "@/components/AppLauncher";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { PdfApp } from "@/components/PdfEditor/PdfApp";
import { ImageStudio } from "@/components/ImageStudio/ImageStudio";
import { TOOL_IDS } from "@/components/PdfEditor/catalog";
import type { AppId } from "@/store/useWorkspaceStore";

const PDF_BASE = "/pdfeditor";
const IMAGE_BASE = "/image";

/** Derive the app + PDF section from a path. */
function parsePath(pathname: string): { app: AppId; tool: string | null } {
  if (pathname === PDF_BASE || pathname === PDF_BASE + "/") return { app: "pdf", tool: null };
  if (pathname.startsWith(PDF_BASE + "/")) {
    const t = pathname.slice(PDF_BASE.length + 1).replace(/\/+$/, "");
    return { app: "pdf", tool: t && TOOL_IDS.includes(t) ? t : null };
  }
  if (pathname === IMAGE_BASE || pathname === IMAGE_BASE + "/") return { app: "image", tool: null };
  return { app: "sketchnotes", tool: null };
}
const pdfPath = (tool: string | null) => (tool ? `${PDF_BASE}/${tool}` : PDF_BASE);
const pathForApp = (app: AppId, tool: string | null) =>
  app === "pdf" ? pdfPath(tool) : app === "image" ? IMAGE_BASE : "/";

/**
 * Top-level workspace hosting both apps natively (no iframe) and keeping the
 * browser URL in sync: Sketchnotes at `/`, the PDF editor at `/pdfeditor` and
 * `/pdfeditor/<section>`. Sketchnotes stays mounted so its canvas survives an
 * app switch.
 */
export function Workspace() {
  const activeApp = useWorkspaceStore((s) => s.activeApp);
  const pdfTool = useWorkspaceStore((s) => s.pdfTool);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);

  const activeRef = useRef(activeApp);
  activeRef.current = activeApp;
  const appSynced = useRef(false);

  const setUrl = useCallback((path: string) => {
    if (typeof window === "undefined" || window.location.pathname === path) return;
    window.history.pushState(null, "", path);
  }, []);

  // Adopt the app/section encoded in the URL on first load.
  useEffect(() => {
    const { app, tool } = parsePath(window.location.pathname);
    if (app !== "sketchnotes") {
      setActiveApp(app);
      if (app === "pdf") setPdfTool(tool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect app/section changes into the URL (skip the first pass so a deep
  // link isn't overwritten before init adopts it).
  useEffect(() => {
    if (!appSynced.current) {
      appSynced.current = true;
      return;
    }
    setUrl(pathForApp(activeApp, pdfTool));
  }, [activeApp, pdfTool, setUrl]);

  // Browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const { app, tool } = parsePath(window.location.pathname);
      if (activeRef.current !== app) setActiveApp(app);
      if (app === "pdf") setPdfTool(tool);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActiveApp, setPdfTool]);

  const pdfActive = activeApp === "pdf";
  const imageActive = activeApp === "image";

  return (
    <>
      {/* Sketchnotes — always mounted, hidden while another app is active. */}
      <div hidden={pdfActive || imageActive}>
        <EditorShell />
      </div>

      {/* PDF editor — native React, its own scroll container. */}
      <div hidden={!pdfActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {pdfActive && <PdfApp />}
      </div>

      {/* Image Studio. */}
      <div hidden={!imageActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {imageActive && <ImageStudio />}
      </div>

      <AppLauncher />
      <SettingsPanel />
    </>
  );
}
