"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { EditorShell } from "@/components/SketchNotes/EditorShell";
import { AppLauncher } from "@/components/AppLauncher";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { ReminderScheduler } from "@/components/Reminders/organisms/ReminderScheduler";
import { ReminderAlert } from "@/components/Reminders/organisms/ReminderAlert";
import { TOOL_IDS } from "@/components/PdfEditor/catalog";
import type { AppId } from "@/store/useWorkspaceStore";

// Sketchnotes (EditorShell) is the default `/` route and stays statically
// imported. Every other app is code-split with next/dynamic so its JS — most
// notably the PDF editor's pdf.js bundle — is kept out of the initial payload
// and fetched only when that app is first opened. They're client-only, so SSR
// is skipped; each renders inside a `hidden` div, so lazy mounting causes no
// layout shift on first paint.
const PdfApp = dynamic(() => import("@/components/PdfEditor/PdfApp").then((m) => m.PdfApp), { ssr: false });
const ImageStudio = dynamic(() => import("@/components/ImageStudio/ImageStudio").then((m) => m.ImageStudio), { ssr: false });
const TodoApp = dynamic(() => import("@/components/Todos/TodoApp").then((m) => m.TodoApp), { ssr: false });
const ReminderApp = dynamic(() => import("@/components/Reminders/ReminderApp").then((m) => m.ReminderApp), { ssr: false });
const TimerApp = dynamic(() => import("@/components/Timer/TimerApp").then((m) => m.TimerApp), { ssr: false });
const SystemInfoApp = dynamic(() => import("@/components/SystemInfo/SystemInfoApp").then((m) => m.SystemInfoApp), { ssr: false });
const NetworkSpeedApp = dynamic(() => import("@/components/NetworkSpeed/NetworkSpeedApp").then((m) => m.NetworkSpeedApp), { ssr: false });
const NewsApp = dynamic(() => import("@/components/News/NewsApp").then((m) => m.NewsApp), { ssr: false });
const MalayalamWriterApp = dynamic(() => import("@/components/MalayalamWriter/MalayalamWriterApp").then((m) => m.MalayalamWriterApp), { ssr: false });
const TranslateApp = dynamic(() => import("@/components/Translate/TranslateApp").then((m) => m.TranslateApp), { ssr: false });

const PDF_BASE = "/pdfeditor";
const IMAGE_BASE = "/image";
const TODOS_BASE = "/todos";
const REMINDERS_BASE = "/reminders";
const TIMER_BASE = "/timer";
const SYSTEM_BASE = "/system";
const SPEED_BASE = "/speedtest";
const NEWS_BASE = "/news";
const MALAYALAM_BASE = "/malayalam";
const TRANSLATE_BASE = "/translate";

/** Derive the app + PDF section from a path. */
function parsePath(pathname: string): { app: AppId; tool: string | null } {
  if (pathname === PDF_BASE || pathname === PDF_BASE + "/") return { app: "pdf", tool: null };
  if (pathname.startsWith(PDF_BASE + "/")) {
    const t = pathname.slice(PDF_BASE.length + 1).replace(/\/+$/, "");
    return { app: "pdf", tool: t && TOOL_IDS.includes(t) ? t : null };
  }
  if (pathname === IMAGE_BASE || pathname === IMAGE_BASE + "/") return { app: "image", tool: null };
  if (pathname === TODOS_BASE || pathname === TODOS_BASE + "/") return { app: "todos", tool: null };
  if (pathname === REMINDERS_BASE || pathname === REMINDERS_BASE + "/") return { app: "reminders", tool: null };
  if (pathname === TIMER_BASE || pathname === TIMER_BASE + "/") return { app: "timer", tool: null };
  if (pathname === SYSTEM_BASE || pathname === SYSTEM_BASE + "/") return { app: "system", tool: null };
  if (pathname === SPEED_BASE || pathname === SPEED_BASE + "/") return { app: "speed", tool: null };
  if (pathname === NEWS_BASE || pathname === NEWS_BASE + "/") return { app: "news", tool: null };
  if (pathname === MALAYALAM_BASE || pathname === MALAYALAM_BASE + "/") return { app: "malayalam", tool: null };
  if (pathname === TRANSLATE_BASE || pathname === TRANSLATE_BASE + "/") return { app: "translate", tool: null };
  return { app: "sketchnotes", tool: null };
}
const pdfPath = (tool: string | null) => (tool ? `${PDF_BASE}/${tool}` : PDF_BASE);
const pathForApp = (app: AppId, tool: string | null) =>
  app === "pdf"
    ? pdfPath(tool)
    : app === "image"
      ? IMAGE_BASE
      : app === "todos"
        ? TODOS_BASE
        : app === "reminders"
          ? REMINDERS_BASE
          : app === "timer"
            ? TIMER_BASE
            : app === "system"
              ? SYSTEM_BASE
              : app === "speed"
                ? SPEED_BASE
                : app === "news"
                  ? NEWS_BASE
                  : app === "malayalam"
                    ? MALAYALAM_BASE
                    : app === "translate"
                      ? TRANSLATE_BASE
                      : "/";

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
  const todosActive = activeApp === "todos";
  const remindersActive = activeApp === "reminders";
  const timerActive = activeApp === "timer";
  const systemActive = activeApp === "system";
  const speedActive = activeApp === "speed";
  const newsActive = activeApp === "news";
  const malayalamActive = activeApp === "malayalam";
  const translateActive = activeApp === "translate";

  return (
    <>
      {/* Sketchnotes — always mounted, hidden while another app is active. */}
      <div hidden={pdfActive || imageActive || todosActive || remindersActive || timerActive || systemActive || speedActive || newsActive || malayalamActive || translateActive}>
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

      {/* Todos. */}
      <div hidden={!todosActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {todosActive && <TodoApp />}
      </div>

      {/* Reminders. */}
      <div hidden={!remindersActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {remindersActive && <ReminderApp />}
      </div>

      {/* Timer. */}
      <div hidden={!timerActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {timerActive && <TimerApp />}
      </div>

      {/* System Info. */}
      <div hidden={!systemActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {systemActive && <SystemInfoApp />}
      </div>

      {/* Network Speed. */}
      <div hidden={!speedActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {speedActive && <NetworkSpeedApp />}
      </div>

      {/* News. */}
      <div hidden={!newsActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {newsActive && <NewsApp />}
      </div>

      {/* Malayalam Writer. */}
      <div hidden={!malayalamActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {malayalamActive && <MalayalamWriterApp />}
      </div>

      {/* Translate. */}
      <div hidden={!translateActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {translateActive && <TranslateApp />}
      </div>

      <AppLauncher />
      <SettingsPanel />

      {/* Reminders fire app-wide, regardless of which app is on screen. */}
      <ReminderScheduler />
      <ReminderAlert />
    </>
  );
}
