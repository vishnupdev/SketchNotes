"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { EditorShell } from "@/components/SketchNotes/EditorShell";
import { AppLauncher } from "@/components/AppLauncher";
import { AppIntro } from "@/components/AppIntro";
import { BootSplash } from "@/components/BootSplash";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { CommandPalette } from "@/components/Palette/organisms/CommandPalette";
import { IntakeBridge } from "@/components/Intake/IntakeBridge";
import { CursorEffect } from "@/components/Settings/CursorEffect";
import { ReminderScheduler } from "@/components/Reminders/organisms/ReminderScheduler";
import { ReminderAlert } from "@/components/Reminders/organisms/ReminderAlert";
import { OfflineBanner } from "@/components/Offline/OfflineBanner";
import { AppLoadBoundary } from "@/components/Offline/AppLoadBoundary";
import { TOOL_IDS } from "@/components/PdfEditor/catalog";
import { APP_LOADERS } from "@/lib/offline/app-modules";
import { useWorkspaceKeys } from "@/hooks/useWorkspaceKeys";
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
const ResourceMonitorApp = dynamic(APP_LOADERS.resources, { ssr: false });
const NearbyApp = dynamic(APP_LOADERS.nearby, { ssr: false });
const NetworkSpeedApp = dynamic(APP_LOADERS.speed, { ssr: false });
const NewsApp = dynamic(APP_LOADERS.news, { ssr: false });
const StreamsApp = dynamic(APP_LOADERS.streams, { ssr: false });
const WorldClockApp = dynamic(APP_LOADERS.world, { ssr: false });
const MalayalamWriterApp = dynamic(APP_LOADERS.malayalam, { ssr: false });
const TranslateApp = dynamic(APP_LOADERS.translate, { ssr: false });
const MorseApp = dynamic(APP_LOADERS.morse, { ssr: false });
const SoundMeterApp = dynamic(APP_LOADERS.sound, { ssr: false });
const ColorLensApp = dynamic(APP_LOADERS.color, { ssr: false });
const AssistantApp = dynamic(APP_LOADERS.assistant, { ssr: false });
const QrToolApp = dynamic(APP_LOADERS.qr, { ssr: false });
const QrFilesApp = dynamic(APP_LOADERS.qrfiles, { ssr: false });
const HandoffApp = dynamic(APP_LOADERS.handoff, { ssr: false });
const CloneApp = dynamic(APP_LOADERS.clone, { ssr: false });
const FileDropApp = dynamic(APP_LOADERS.drop, { ssr: false });
const TextKitApp = dynamic(APP_LOADERS.text, { ssr: false });
const WalkaroundApp = dynamic(APP_LOADERS.walk, { ssr: false });
const ScanApp = dynamic(APP_LOADERS.scan, { ssr: false });
const WalletApp = dynamic(APP_LOADERS.wallet, { ssr: false });
const VoiceApp = dynamic(APP_LOADERS.voice, { ssr: false });
const ConvertApp = dynamic(APP_LOADERS.convert, { ssr: false });
const ApiApp = dynamic(APP_LOADERS.api, { ssr: false });
const SnippetsApp = dynamic(APP_LOADERS.snippets, { ssr: false });
const MarkdownApp = dynamic(APP_LOADERS.markdown, { ssr: false });
const ChronoApp = dynamic(APP_LOADERS.chrono, { ssr: false });
const ContrastApp = dynamic(APP_LOADERS.contrast, { ssr: false });
const SatelliteApp = dynamic(APP_LOADERS.satellite, { ssr: false });

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
  resources: "/resources",
  nearby: "/nearby",
  speed: "/speedtest",
  news: "/news",
  streams: "/streams",
  world: "/worldclock",
  malayalam: "/malayalam",
  translate: "/translate",
  morse: "/morse",
  sound: "/soundmeter",
  color: "/color",
  qr: "/qr",
  qrfiles: "/qrfiles",
  handoff: "/handoff",
  clone: "/clone",
  drop: "/drop",
  text: "/text",
  assistant: "/assistant",
  walk: "/walkaround",
  scan: "/scan",
  wallet: "/wallet",
  voice: "/voice",
  convert: "/convert",
  // Not "/api" — that prefix belongs to this app's own route handlers.
  api: "/apiclient",
  snippets: "/snippets",
  markdown: "/markdown",
  chrono: "/chrono",
  contrast: "/contrast",
  satellite: "/satellite",
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
 * One code-split app's slot: a full-screen scroll container that is `hidden`
 * unless the app is active, and mounts the app only while it is.
 *
 * The {@link AppLoadBoundary} is the point of the wrapper. Mounting a lazy app
 * downloads its chunk, and a chunk that fails to load throws during render — so
 * without a boundary here, opening an app whose chunk isn't cached yet (the
 * normal case offline before the worker has saved the build) would tear down the
 * entire workspace instead of just that panel.
 *
 * Arriving here isn't animated from this end: {@link AppIntro} already plays
 * over the top of an app switch, and its veil is opaque for most of a second.
 * The animation that matters inside the frame is the app's own navigation
 * between its tabs or tools — see `NavView`.
 */
function AppFrame({
  active,
  name,
  children,
}: {
  active: boolean;
  name: string;
  children: ReactNode;
}) {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  return (
    <div
      hidden={!active}
      /* overflow-x-hidden because the apps inside animate a full-width panel in
         from the side when their tabs change: without it the frame would grow a
         horizontal scrollbar for the length of every tab switch. Nothing in an
         app scrolls the page sideways by design (rule #3), so there is nothing
         to lose. */
      className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden bg-paper text-text"
    >
      {active && (
        <AppLoadBoundary name={name} onBrowseApps={openLauncher}>
          {children}
        </AppLoadBoundary>
      )}
    </div>
  );
}

/**
 * Top-level workspace hosting both apps natively (no iframe) and keeping the
 * browser URL in sync: Sketchnotes at `/`, the PDF editor at `/pdfeditor` and
 * `/pdfeditor/<section>`. Sketchnotes stays mounted so its canvas survives an
 * app switch.
 */
export function Workspace() {
  // Shell-wide shortcuts (Ctrl/⌘ + K). Mounted here so they work in every app.
  useWorkspaceKeys();

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
      // `intro: false` because the logo animation announces an app
      // *opening*, and on a cold load the app is simply already here.
      setActiveApp(app, { intro: false });
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

  return (
    <>
      {/* Sketchnotes — always mounted, hidden while another app is active. */}
      <div hidden={activeApp !== "sketchnotes"}>
        <EditorShell />
      </div>

      {/* PDF editor — native React, its own scroll container. */}
      <AppFrame active={activeApp === "pdf"} name="PDF Editor">
        <PdfApp />
      </AppFrame>

      <AppFrame active={activeApp === "image"} name="Image Studio">
        <ImageStudio />
      </AppFrame>

      {/* Board — the prompt-composed page of sections. */}
      <AppFrame active={activeApp === "board"} name="Board">
        <BoardApp />
      </AppFrame>

      <AppFrame active={activeApp === "todos"} name="Todos">
        <TodoApp />
      </AppFrame>

      <AppFrame active={activeApp === "reminders"} name="Reminders">
        <ReminderApp />
      </AppFrame>

      <AppFrame active={activeApp === "timer"} name="Timer">
        <TimerApp />
      </AppFrame>

      <AppFrame active={activeApp === "system"} name="System Info">
        <SystemInfoApp />
      </AppFrame>

      {/* Resource Monitor. Unmounted on an app switch — which is what hands
          back any camera, microphone, screen share or location watch it was
          holding, so the monitor can never become the thing being monitored. */}
      <AppFrame active={activeApp === "resources"} name="Resource Monitor">
        <ResourceMonitorApp />
      </AppFrame>

      {/* Nearby Devices. Unmounted on an app switch, which is what stops the
          live BLE scan and the controller polling following the user out. */}
      <AppFrame active={activeApp === "nearby"} name="Nearby Devices">
        <NearbyApp />
      </AppFrame>

      <AppFrame active={activeApp === "speed"} name="Speed Test">
        <NetworkSpeedApp />
      </AppFrame>

      <AppFrame active={activeApp === "news"} name="News">
        <NewsApp />
      </AppFrame>

      {/* Streams. Unmounted on an app switch (AppFrame mounts only while
          active), which is what stops the player: music never follows the user
          into another app. */}
      <AppFrame active={activeApp === "streams"} name="Streams">
        <StreamsApp />
      </AppFrame>

      {/* World Clock. Unmounted on an app switch (AppFrame mounts only while
          active), which is what stops its per-second tick running behind
          another app. */}
      <AppFrame active={activeApp === "world"} name="World Clock">
        <WorldClockApp />
      </AppFrame>

      <AppFrame active={activeApp === "malayalam"} name="Malayalam Writer">
        <MalayalamWriterApp />
      </AppFrame>

      <AppFrame active={activeApp === "translate"} name="Translate">
        <TranslateApp />
      </AppFrame>

      <AppFrame active={activeApp === "morse"} name="Morse Code">
        <MorseApp />
      </AppFrame>

      {/* Sound Meter. Unmounting on an app switch is what releases the
          microphone, so the recording indicator never follows the user out. */}
      <AppFrame active={activeApp === "sound"} name="Sound Meter">
        <SoundMeterApp />
      </AppFrame>

      {/* Color Lens. Unmounted on an app switch, which is what stops the camera
          if the viewfinder was left open. */}
      <AppFrame active={activeApp === "color"} name="Color Lens">
        <ColorLensApp />
      </AppFrame>

      {/* QR Codes. Unmounted on an app switch, which is what releases the
          camera if the scanner was left running. */}
      <AppFrame active={activeApp === "qr"} name="QR Codes">
        <QrToolApp />
      </AppFrame>

      {/* QR Files. Unmounted on an app switch, which releases the camera if
          the rebuild scanner was left running — and discards a half-collected
          set of codes, which is deliberate: an incomplete file is not a file. */}
      <AppFrame active={activeApp === "qrfiles"} name="QR Files">
        <QrFilesApp />
      </AppFrame>

      {/* Handoff. Unmounting is what ends both the camera and any open
          device-to-device connection, so neither follows the user out. */}
      <AppFrame active={activeApp === "handoff"} name="Handoff">
        <HandoffApp />
      </AppFrame>

      {/* Clone. Unmounting closes any open link and stops the camera — and
          since a clone is written only from the panel that received it, leaving
          the app is also what discards one that was never applied. */}
      <AppFrame active={activeApp === "clone"} name="Clone">
        <CloneApp />
      </AppFrame>

      {/* File Drop. Unmounting is what closes an open peer connection and
          releases the camera, so neither survives leaving the app. */}
      <AppFrame active={activeApp === "drop"} name="File Drop">
        <FileDropApp />
      </AppFrame>

      {/* Text Kit — pure local text operations, nothing to release on exit. */}
      <AppFrame active={activeApp === "text"} name="Text Kit">
        <TextKitApp />
      </AppFrame>

      {/* Walkaround — the guided tour of whichever app you pick. Pure reading:
          it draws a schematic of another app rather than reaching into it. */}
      <AppFrame active={activeApp === "walk"} name="Walkaround">
        <WalkaroundApp />
      </AppFrame>

      {/* Scan. Unmounted on an app switch, which is what releases the camera if
          the viewfinder was left open — and discards an unexported scan, which is
          deliberate: its pages are held in memory only (see useScanStore). */}
      <AppFrame active={activeApp === "scan"} name="Scan">
        <ScanApp />
      </AppFrame>

      <AppFrame active={activeApp === "wallet"} name="Wallet">
        <WalletApp />
      </AppFrame>

      {/* Voice Memos. Unmounting is what releases the microphone and stops any
          transcription, so neither follows the user into another app. */}
      <AppFrame active={activeApp === "voice"} name="Voice Memos">
        <VoiceApp />
      </AppFrame>

      <AppFrame active={activeApp === "convert"} name="Convert">
        <ConvertApp />
      </AppFrame>

      <AppFrame active={activeApp === "api"} name="API Client">
        <ApiApp />
      </AppFrame>

      <AppFrame active={activeApp === "snippets"} name="Snippets">
        <SnippetsApp />
      </AppFrame>

      <AppFrame active={activeApp === "markdown"} name="Markdown">
        <MarkdownApp />
      </AppFrame>

      <AppFrame active={activeApp === "chrono"} name="Chrono">
        <ChronoApp />
      </AppFrame>

      <AppFrame active={activeApp === "contrast"} name="Contrast">
        <ContrastApp />
      </AppFrame>

      {/* Satellite Map. Unmounted on an app switch, which is what ends the
          location watch and stops the live weather frames being fetched — a map
          nobody is looking at has no business holding the GPS. */}
      <AppFrame active={activeApp === "satellite"} name="Satellite Map">
        <SatelliteApp />
      </AppFrame>

      {/* Assistant — the in-app AI guide. */}
      <AppFrame active={activeApp === "assistant"} name="Assistant">
        <AssistantApp />
      </AppFrame>

      <AppLauncher />
      <SettingsPanel />

      {/* Ctrl/⌘ + K from anywhere — the keyboard route into every app, PDF
          section, theme and setting. Above the two overlays it can open. */}
      <CommandPalette />

      {/* Files the operating system hands us — a double-clicked PDF, a photo
          from the share sheet — routed to the app that can open them. */}
      <IntakeBridge />

      {/* The app's logo, played over the top whenever one opens. Sits above the
          launcher it was picked from and above the frame rising underneath. */}
      <AppIntro />

      {/* The "One App" wordmark, played once over the whole workspace as it
          boots. Above <AppIntro /> — a deep-linked cold load plays neither (see
          the `intro: false` on init above), but the boot veil is the top layer
          whenever both could exist. */}
      <BootSplash />

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
