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
  drop: () => import("@/components/FileDrop/FileDropApp").then((m) => m.FileDropApp),
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
  "morse",
  "sound",
  "color",
  "qr",
  "handoff",
  "drop",
  "translate",
  "malayalam",
  "image",
  "system",
  "resources",
  "nearby",
  "speed",
  "news",
  "world",
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
  world: "World Clock",
  malayalam: "Malayalam Writer",
  translate: "Translate",
  morse: "Morse Code",
  sound: "Sound Meter",
  color: "Color Lens",
  qr: "QR Codes",
  handoff: "Handoff",
  drop: "File Drop",
  assistant: "Assistant",
};
