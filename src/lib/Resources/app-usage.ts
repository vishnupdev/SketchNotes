import type { AppId } from "@/store/useWorkspaceStore";
import { ACCESS_ITEMS, type AccessId } from "./catalog";

/**
 * What each app in the workspace does with the device — the answer a browser's
 * site-settings screen can never give, because it sees one origin where there
 * are two dozen apps.
 *
 * The permission-gated half is *derived* from `usedBy` in the catalog rather
 * than written twice, so the Access tab and the Apps tab can never disagree.
 * This file adds the two facts the catalog has no place for: whether an app
 * touches the network, and what it keeps on the device.
 */

/** What an app sends over the network, or null when it never does. */
export const APP_NETWORK: Partial<Record<AppId, string>> = {
  news: "Fetches headlines through this site's own server route.",
  streams:
    "Searches YouTube through this site's own server route, then hands playback to YouTube's embed — the video itself is streamed from YouTube to your browser.",
  world: "Fetches a country's headlines; clocks and facts are bundled offline.",
  translate: "Online mode posts your text to this site's translate route. On-device mode sends nothing.",
  malayalam: "Handwriting recognition posts the strokes you draw. Typing and the keyboard stay local.",
  speed: "Downloads and uploads test payloads — that is the measurement.",
  system: "Looks up your public IP address.",
  convert:
    "Fetches published exchange rates through this site's own server route. The unit side never touches the network.",
  api: "Every request you send goes out through this site's own server route — a browser cannot call an API that has not allowed it. Private addresses are refused, and nothing sent is written to disk.",
  voice:
    "Recording is local. Transcription, when switched on, uses the browser's own speech service — in Chrome that means the audio is sent to Google. It is off by default.",
  markdown:
    "Nothing. Mermaid diagrams are drawn on the device; the diagram engine is downloaded once, the first time a document contains one.",
  clone: "The copy runs device to device. Over a cable or on “this network only” nothing outside the two devices is contacted at all; “anywhere” asks a public STUN server for this device's address, and it never sees your data.",
  satellite:
    "Map tiles are fetched from Esri as you pan, the live layers from RainViewer and NASA, and a place search from OpenStreetMap's geocoder — each of which therefore sees the area you are looking at. Street View is a link you choose to follow, carrying only the coordinates, and contacts nobody until you tap it. Your GPS position is never sent anywhere; it is read on the device and drawn on the map.",
  drop: "Files go straight to the other device. In “anywhere” mode a public STUN server is asked for this device's public address — it never sees the files; in “this network only” mode nothing outside the network is contacted at all.",
};

/** One line on what the app keeps in this browser. */
export const APP_STORAGE_NOTE: Record<AppId, string> = {
  sketchnotes: "Every note and the note index.",
  assistant: "Your chat history with the guide.",
  walk: "Which app you last toured, and which tours you have finished.",
  scan: "Nothing — pages are held in memory until you save the PDF, then dropped.",
  wallet: "Your spending log, currency and monthly target. Bill splits are not kept.",
  voice: "Your memos: the recordings and their transcripts.",
  convert: "Your unit and currency choices, plus the last exchange-rate table for offline use.",
  api: "Saved requests and the one request you are editing. Never the history — see below.",
  snippets: "Your snippet library.",
  markdown: "The document you are writing.",
  chrono: "The expression, timestamp and duration you last worked on.",
  contrast: "The colours you last checked, your ramp, and your palette.",
  satellite:
    "Your last view and layer choices, and any places you kept — names and coordinates only. Never your own position.",
  pdf: "Nothing — files are opened, edited and saved back without being stored.",
  image: "Nothing — pictures are processed in memory only.",
  board: "The board and all its sections.",
  todos: "Your tasks.",
  reminders: "Your reminders and their sounds.",
  timer: "Running timers and pomodoro settings.",
  system: "Nothing.",
  nearby: "Nothing — device grants are held by the browser, not by the page.",
  speed: "Your past speed-test results.",
  news: "Nothing beyond the cached responses the offline worker keeps.",
  streams: "The videos you saved, and a short trail of what you played.",
  world: "Pinned cities and clock preferences.",
  malayalam: "The document you are writing and its formatting.",
  translate: "Your language choices.",
  morse: "Speed, pitch and per-character progress.",
  sound: "Reference pitch, view and dB offset.",
  color: "Recently picked colours.",
  qr: "Codes you have scanned or made on this device.",
  qrfiles: "The names and sizes of files you converted — never the files themselves.",
  text: "The text you are working on, kept so a refresh doesn't lose it.",
  drop: "Nothing — files stream through and are written where you choose.",
  handoff: "Nothing — a transfer is held in memory only until you accept it.",
  clone: "Nothing of its own — it reads this device's saved data to copy it, and writes the incoming copy into the apps it belongs to.",
  resources: "Nothing — this app only reads.",
};

/**
 * Resources → apps, inverted to apps → resources. Built once at module load
 * from the single `usedBy` source in the catalog.
 */
const ACCESS_BY_APP: Partial<Record<AppId, AccessId[]>> = (() => {
  const map: Partial<Record<AppId, AccessId[]>> = {};
  for (const item of ACCESS_ITEMS) {
    if (item.usedBy === "all") continue; // true of everything, so it says nothing
    for (const app of item.usedBy) {
      (map[app] ??= []).push(item.id);
    }
  }
  return map;
})();

/** The permission-gated resources one app can reach for. */
export const accessForApp = (app: AppId): AccessId[] => ACCESS_BY_APP[app] ?? [];

/** Apps that can reach for a given resource, in catalog order. */
export const appsForAccess = (id: AccessId): AppId[] => {
  const item = ACCESS_ITEMS.find((i) => i.id === id);
  return !item || item.usedBy === "all" ? [] : item.usedBy;
};
