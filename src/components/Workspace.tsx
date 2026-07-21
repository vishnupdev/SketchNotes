"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { EditorShell } from "@/components/SketchNotes/EditorShell";
import { AppLauncher } from "@/components/AppLauncher";
import { PdfApp } from "@/components/PdfEditor/PdfApp";
import { TOOL_IDS } from "@/components/PdfEditor/catalog";

const PDF_BASE = "/pdfeditor";

/** Split the path into { isPdf, tool }. `tool` is null for the PDF home. */
function parsePath(pathname: string): { isPdf: boolean; tool: string | null } {
  if (pathname === PDF_BASE || pathname === PDF_BASE + "/") return { isPdf: true, tool: null };
  if (pathname.startsWith(PDF_BASE + "/")) {
    const t = pathname.slice(PDF_BASE.length + 1).replace(/\/+$/, "");
    return { isPdf: true, tool: t && TOOL_IDS.includes(t) ? t : null };
  }
  return { isPdf: false, tool: null };
}
const pdfPath = (tool: string | null) => (tool ? `${PDF_BASE}/${tool}` : PDF_BASE);

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
    const { isPdf, tool } = parsePath(window.location.pathname);
    if (isPdf) {
      setActiveApp("pdf");
      setPdfTool(tool);
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
    setUrl(activeApp === "pdf" ? pdfPath(pdfTool) : "/");
  }, [activeApp, pdfTool, setUrl]);

  // Browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const { isPdf, tool } = parsePath(window.location.pathname);
      if (isPdf) {
        if (activeRef.current !== "pdf") setActiveApp("pdf");
        setPdfTool(tool);
      } else if (activeRef.current !== "sketchnotes") {
        setActiveApp("sketchnotes");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActiveApp, setPdfTool]);

  const pdfActive = activeApp === "pdf";

  return (
    <>
      {/* Sketchnotes — always mounted, hidden while another app is active. */}
      <div hidden={pdfActive}>
        <EditorShell />
      </div>

      {/* PDF editor — native React, its own scroll container. */}
      <div
        hidden={!pdfActive}
        className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text"
      >
        {pdfActive && <PdfApp />}
      </div>

      <AppLauncher />
    </>
  );
}
