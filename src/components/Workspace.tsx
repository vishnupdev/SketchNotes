"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { EditorShell } from "@/components/SketchNotes/EditorShell";
import { AppLauncher } from "@/components/AppLauncher";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { CursorEffect } from "@/components/Settings/CursorEffect";
import { ReminderScheduler } from "@/components/Reminders/organisms/ReminderScheduler";
import { ReminderAlert } from "@/components/Reminders/organisms/ReminderAlert";
import { OfflineBanner } from "@/components/Offline/OfflineBanner";
import { TOOL_IDS } from "@/components/PdfEditor/catalog";
import { APP_LOADERS } from "@/lib/offline/app-modules";
import type { AppId } from "@/store/useWorkspaceStore";

// Sketchnotes (EditorShell) is the default `/` route and stays statically
// imported. Every other app is code-split with next/dynamic so its JS — most
// notably the PDF editor's pdf.js bundle — is kept out of the initial payload
// and fetched only when that app is first opened. They're client-only, so SSR
// is skipped; each renders inside a `hidden` div, so lazy mounting causes no
// layout shift on first paint.
//
// The loaders come from APP_LOADERS rather than being written inline, so the
// offline warm-up caches the exact same chunks these components request.
const PdfApp = dynamic(APP_LOADERS.pdf, { ssr: false });
const ImageStudio = dynamic(APP_LOADERS.image, { ssr: false });
const BoardApp = dynamic(APP_LOADERS.board, { ssr: false });
const TodoApp = dynamic(APP_LOADERS.todos, { ssr: false });
const ReminderApp = dynamic(APP_LOADERS.reminders, { ssr: false });
const TimerApp = dynamic(APP_LOADERS.timer, { ssr: false });
const SystemInfoApp = dynamic(APP_LOADERS.system, { ssr: false });
const NetworkSpeedApp = dynamic(APP_LOADERS.speed, { ssr: false });
const NewsApp = dynamic(APP_LOADERS.news, { ssr: false });
const WorldClockApp = dynamic(APP_LOADERS.world, { ssr: false });
const MalayalamWriterApp = dynamic(APP_LOADERS.malayalam, { ssr: false });
const TranslateApp = dynamic(APP_LOADERS.translate, { ssr: false });
const MorseApp = dynamic(APP_LOADERS.morse, { ssr: false });
const SoundMeterApp = dynamic(APP_LOADERS.sound, { ssr: false });
const ColorLensApp = dynamic(APP_LOADERS.color, { ssr: false });
const AssistantApp = dynamic(APP_LOADERS.assistant, { ssr: false });

/**
 * Every app's deep-link path — the one place a route is declared, read in both
 * directions by {@link parsePath} and {@link pathForApp}. Sketchnotes is the
 * root; the PDF editor appends its section below its base. Keep in sync with
 * APPS in `src/lib/site.ts` and SHELL_URLS in `public/sw.js`.
 *
 * `Record<AppId, string>` is doing real work here: adding an app to `AppId`
 * without giving it a path is a type error rather than a route that silently
 * resolves to Sketchnotes.
 */
const APP_PATHS: Record<AppId, string> = {
  sketchnotes: "/",
  pdf: "/pdfeditor",
  image: "/image",
  board: "/board",
  todos: "/todos",
  reminders: "/reminders",
  timer: "/timer",
  system: "/system",
  speed: "/speedtest",
  news: "/news",
  world: "/worldclock",
  malayalam: "/malayalam",
  translate: "/translate",
  morse: "/morse",
  sound: "/soundmeter",
  color: "/color",
  assistant: "/assistant",
};

const PDF_BASE = APP_PATHS.pdf;

/** The same table inverted, so a path resolves in one lookup. */
const APP_BY_PATH = new Map<string, AppId>(
  Object.entries(APP_PATHS).map(([app, path]) => [path, app as AppId]),
);

/** Derive the app + PDF section from a path. */
function parsePath(pathname: string): { app: AppId; tool: string | null } {
  // Normalise a trailing slash once, so "/todos/" and "/todos" are one case.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;

  if (path.startsWith(PDF_BASE + "/")) {
    const tool = path.slice(PDF_BASE.length + 1);
    return { app: "pdf", tool: tool && TOOL_IDS.includes(tool) ? tool : null };
  }

  return { app: APP_BY_PATH.get(path) ?? "sketchnotes", tool: null };
}

const pathForApp = (app: AppId, tool: string | null): string =>
  app === "pdf" && tool ? `${PDF_BASE}/${tool}` : APP_PATHS[app];

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
  const boardActive = activeApp === "board";
  const todosActive = activeApp === "todos";
  const remindersActive = activeApp === "reminders";
  const timerActive = activeApp === "timer";
  const systemActive = activeApp === "system";
  const speedActive = activeApp === "speed";
  const newsActive = activeApp === "news";
  const worldActive = activeApp === "world";
  const malayalamActive = activeApp === "malayalam";
  const translateActive = activeApp === "translate";
  const morseActive = activeApp === "morse";
  const soundActive = activeApp === "sound";
  const colorActive = activeApp === "color";
  const assistantActive = activeApp === "assistant";

  return (
    <>
      {/* Sketchnotes — always mounted, hidden while another app is active. */}
      <div hidden={activeApp !== "sketchnotes"}>
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

      {/* Board — the prompt-composed page of sections. */}
      <div hidden={!boardActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {boardActive && <BoardApp />}
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

      {/* World Clock. Unmounted on an app switch, which is what stops its
          per-second tick from running behind another app. */}
      <div hidden={!worldActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {worldActive && <WorldClockApp />}
      </div>

      {/* Malayalam Writer. */}
      <div hidden={!malayalamActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {malayalamActive && <MalayalamWriterApp />}
      </div>

      {/* Translate. */}
      <div hidden={!translateActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {translateActive && <TranslateApp />}
      </div>

      {/* Morse Code. */}
      <div hidden={!morseActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {morseActive && <MorseApp />}
      </div>

      {/* Sound Meter. Unmounting on an app switch is what releases the
          microphone, so the recording indicator never follows the user out. */}
      <div hidden={!soundActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {soundActive && <SoundMeterApp />}
      </div>

      {/* Color Lens. Unmounted on an app switch, which is what stops the camera
          if the viewfinder was left open. */}
      <div hidden={!colorActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {colorActive && <ColorLensApp />}
      </div>

      {/* Assistant — the in-app AI guide. */}
      <div hidden={!assistantActive} className="fixed inset-0 z-40 overflow-y-auto bg-paper text-text">
        {assistantActive && <AssistantApp />}
      </div>

      <AppLauncher />
      <SettingsPanel />

      {/* Paints the chosen mouse pointer onto <body> for every app. */}
      <CursorEffect />

      {/* Connection status — app-wide, since losing the network changes what a
          few features can do (and nothing else). */}
      <OfflineBanner />

      {/* Reminders fire app-wide, regardless of which app is on screen. */}
      <ReminderScheduler />
      <ReminderAlert />
    </>
  );
}
