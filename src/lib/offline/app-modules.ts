"use client";

import type { ComponentType } from "react";
import type { AppId } from "@/store/useWorkspaceStore";

/**
 * The one place every code-split app is imported from.
 *
 * Sketchnotes (`EditorShell`) is the default route and stays statically
 * imported; every other app is loaded on demand. {@link Workspace} feeds these
 * loaders to `next/dynamic`, and the offline warm-up
 * (`src/lib/offline/warmup.ts`) calls the very same loaders so the chunks it
 * caches are byte-for-byte the ones the workspace will later ask for. Declaring
 * the `import()` calls twice would risk warming a different chunk than the app
 * uses, which is exactly the bug that makes an "offline-ready" app fail offline.
 */

/** Every app except the statically-imported Sketchnotes canvas. */
export type LazyAppId = Exclude<AppId, "sketchnotes">;

/** All lazy apps take no props — the workspace renders them bare. */
export type AppLoader = () => Promise<ComponentType>;

export const APP_LOADERS: Record<LazyAppId, AppLoader> = {
  pdf: () => import("@/components/PdfEditor/PdfApp").then((m) => m.PdfApp),
  image: () => import("@/components/ImageStudio/ImageStudio").then((m) => m.ImageStudio),
  board: () => import("@/components/Board/BoardApp").then((m) => m.BoardApp),
  todos: () => import("@/components/Todos/TodoApp").then((m) => m.TodoApp),
  reminders: () => import("@/components/Reminders/ReminderApp").then((m) => m.ReminderApp),
  timer: () => import("@/components/Timer/TimerApp").then((m) => m.TimerApp),
  system: () => import("@/components/SystemInfo/SystemInfoApp").then((m) => m.SystemInfoApp),
  resources: () =>
    import("@/components/Resources/ResourceMonitorApp").then((m) => m.ResourceMonitorApp),
  nearby: () => import("@/components/Nearby/NearbyApp").then((m) => m.NearbyApp),
  speed: () => import("@/components/NetworkSpeed/NetworkSpeedApp").then((m) => m.NetworkSpeedApp),
  news: () => import("@/components/News/NewsApp").then((m) => m.NewsApp),
  streams: () => import("@/components/Streams/StreamsApp").then((m) => m.StreamsApp),
  world: () => import("@/components/WorldClock/WorldClockApp").then((m) => m.WorldClockApp),
  malayalam: () =>
    import("@/components/MalayalamWriter/MalayalamWriterApp").then((m) => m.MalayalamWriterApp),
  translate: () => import("@/components/Translate/TranslateApp").then((m) => m.TranslateApp),
  morse: () => import("@/components/Morse/MorseApp").then((m) => m.MorseApp),
  sound: () => import("@/components/SoundMeter/SoundMeterApp").then((m) => m.SoundMeterApp),
  color: () => import("@/components/ColorLens/ColorLensApp").then((m) => m.ColorLensApp),
  assistant: () => import("@/components/Assistant/AssistantApp").then((m) => m.AssistantApp),
  qr: () => import("@/components/QrTool/QrToolApp").then((m) => m.QrToolApp),
  handoff: () => import("@/components/Handoff/HandoffApp").then((m) => m.HandoffApp),
  clone: () => import("@/components/Clone/CloneApp").then((m) => m.CloneApp),
  drop: () => import("@/components/FileDrop/FileDropApp").then((m) => m.FileDropApp),
  text: () => import("@/components/TextKit/TextKitApp").then((m) => m.TextKitApp),
  walk: () => import("@/components/Walkaround/WalkaroundApp").then((m) => m.WalkaroundApp),
  scan: () => import("@/components/Scan/ScanApp").then((m) => m.ScanApp),
  wallet: () => import("@/components/Wallet/WalletApp").then((m) => m.WalletApp),
  voice: () => import("@/components/Voice/VoiceApp").then((m) => m.VoiceApp),
  convert: () => import("@/components/Convert/ConvertApp").then((m) => m.ConvertApp),
  api: () => import("@/components/Api/ApiApp").then((m) => m.ApiApp),
  snippets: () => import("@/components/Snippets/SnippetsApp").then((m) => m.SnippetsApp),
  markdown: () => import("@/components/Markdown/MarkdownApp").then((m) => m.MarkdownApp),
  chrono: () => import("@/components/Chrono/ChronoApp").then((m) => m.ChronoApp),
  contrast: () => import("@/components/Contrast/ContrastApp").then((m) => m.ContrastApp),
  satellite: () => import("@/components/Satellite/SatelliteApp").then((m) => m.SatelliteApp),
};

/**
 * Warm-up order — cheapest and most-used apps first, so an interrupted warm-up
 * (tab closed, connection dropped) still leaves the common tools available. The
 * PDF editor is last: its pdf.js bundle is by far the largest download.
 */
export const WARMUP_ORDER: LazyAppId[] = [
  "board",
  "todos",
  "timer",
  "reminders",
  "assistant",
  "walk",
  "morse",
  "sound",
  "color",
  "qr",
  "handoff",
  "clone",
  "drop",
  "text",
  // Light, entirely-local tools — cheap to warm and among the most used.
  "convert",
  "chrono",
  "contrast",
  "snippets",
  "wallet",
  "markdown",
  "voice",
  "api",
  "translate",
  "malayalam",
  "image",
  "system",
  "resources",
  "nearby",
  "speed",
  "news",
  "streams",
  "world",
  // Warmed late and honestly: the app's chunk caches, but a map is its tiles,
  // and third-party imagery is not something this worker precaches. Offline it
  // opens and says so rather than pretending to have the world on disk.
  "satellite",
  // Late, with the PDF editor: Scan shares its pdf-lib bundle.
  "scan",
  "pdf",
];

/** Human labels for warm-up progress. */
export const APP_LABELS: Record<LazyAppId, string> = {
  pdf: "PDF Editor",
  image: "Image Studio",
  board: "Board",
  todos: "Todos",
  reminders: "Reminders",
  timer: "Timer",
  system: "System Info",
  resources: "Resource Monitor",
  nearby: "Nearby Devices",
  speed: "Speed Test",
  news: "News",
  streams: "Streams",
  world: "World Clock",
  malayalam: "Malayalam Writer",
  translate: "Translate",
  morse: "Morse Code",
  sound: "Sound Meter",
  color: "Color Lens",
  qr: "QR Codes",
  handoff: "Handoff",
  clone: "Clone",
  drop: "File Drop",
  text: "Text Kit",
  assistant: "Assistant",
  walk: "Walkaround",
  scan: "Scan",
  wallet: "Wallet",
  voice: "Voice Memos",
  convert: "Convert",
  api: "API Client",
  snippets: "Snippets",
  markdown: "Markdown",
  chrono: "Chrono",
  satellite: "Satellite Map",
  contrast: "Contrast",
};
