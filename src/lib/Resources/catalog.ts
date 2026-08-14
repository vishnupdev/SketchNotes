import type { AppId } from "@/store/useWorkspaceStore";

/**
 * The catalog of system resources a web page can be granted access to, and — the
 * part no browser settings screen can tell you — which apps in *this* workspace
 * actually ask for each one.
 *
 * The `usedBy` lists are hand-verified against the code, not guessed: they are
 * the app's central claim, so a wrong entry would be worse than no entry at all.
 * When an app starts using a new resource, add it here.
 */

/** Every resource the monitor reports on. */
export type AccessId =
  | "camera"
  | "microphone"
  | "screen"
  | "speakers"
  | "location"
  | "notifications"
  | "clipboard-read"
  | "clipboard-write"
  | "wake-lock"
  | "idle"
  | "windows"
  | "fonts"
  | "sensors"
  | "midi"
  | "bluetooth"
  | "usb"
  | "hid"
  | "serial"
  | "storage"
  | "storage-access";

/** How the browser currently answers for a resource. */
export type AccessState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

/** Section a resource is listed under. */
export type AccessGroup = "capture" | "location" | "system" | "hardware" | "data";

/** Which glyph draws the resource. Resolved to an icon by `<ResourceGlyph />`. */
export type GlyphKey =
  | "camera"
  | "mic"
  | "screen"
  | "speaker"
  | "location"
  | "bell"
  | "clipboard"
  | "lock"
  | "idle"
  | "window"
  | "font"
  | "sensor"
  | "midi"
  | "bluetooth"
  | "usb"
  | "hid"
  | "serial"
  | "drive"
  | "cookie";

/**
 * The action a resource's button offers.
 * - `live` — the monitor can hold this one open and watch it, on the Live tab.
 * - `ask` — a one-shot request that is released again immediately.
 * - `none` — nothing to trigger from here (the browser's own chooser owns it).
 */
export type AccessAction = "live" | "ask" | "none";

export interface AccessItem {
  id: AccessId;
  name: string;
  group: AccessGroup;
  glyph: GlyphKey;
  /** What a page can do once this is allowed — plain language, no jargon. */
  what: string;
  /** Permissions API descriptor, where the browser exposes one. */
  permission?: string;
  /** Does the underlying API exist in this browser at all? */
  probe: () => boolean;
  /** Apps in this workspace that can use it — `"all"` where every app does. */
  usedBy: AppId[] | "all";
  action: AccessAction;
}

const hasNav = (): boolean => typeof navigator !== "undefined";
const hasWin = (): boolean => typeof window !== "undefined";

/** True when `key` exists on `navigator` — the standard feature test. */
const inNav = (key: string): boolean => hasNav() && key in navigator;

const hasMedia = (fn: "getUserMedia" | "getDisplayMedia"): boolean =>
  hasNav() && typeof navigator.mediaDevices?.[fn] === "function";

export const ACCESS_ITEMS: AccessItem[] = [
  /* ── Capture — the resources that can watch or listen ─────────────────── */
  {
    id: "camera",
    name: "Camera",
    group: "capture",
    glyph: "camera",
    what: "See through the camera and record video.",
    permission: "camera",
    probe: () => hasMedia("getUserMedia"),
    usedBy: ["color", "nearby"],
    action: "live",
  },
  {
    id: "microphone",
    name: "Microphone",
    group: "capture",
    glyph: "mic",
    what: "Hear the microphone and record your voice.",
    permission: "microphone",
    probe: () => hasMedia("getUserMedia"),
    usedBy: ["sound", "nearby"],
    action: "live",
  },
  {
    id: "screen",
    name: "Screen recording",
    group: "capture",
    glyph: "screen",
    what: "Record a screen, a window or a browser tab.",
    // There is no `display-capture` entry in the Permissions API: the browser
    // asks every time, from a click, and nothing is remembered.
    probe: () => hasMedia("getDisplayMedia"),
    usedBy: [],
    action: "live",
  },
  {
    id: "speakers",
    name: "Speaker choice",
    group: "capture",
    glyph: "speaker",
    what: "Send audio to a specific speaker or headset.",
    permission: "speaker-selection",
    probe: () => hasNav() && typeof navigator.mediaDevices?.enumerateDevices === "function",
    usedBy: [],
    action: "ask",
  },

  /* ── Location ─────────────────────────────────────────────────────────── */
  {
    id: "location",
    name: "Location",
    group: "location",
    glyph: "location",
    what: "Read where you are, and follow you as you move.",
    permission: "geolocation",
    probe: () => inNav("geolocation"),
    usedBy: [],
    action: "live",
  },

  /* ── System ───────────────────────────────────────────────────────────── */
  {
    id: "notifications",
    name: "Notifications",
    group: "system",
    glyph: "bell",
    what: "Show system alerts, even when the tab is in the background.",
    permission: "notifications",
    probe: () => hasWin() && "Notification" in window,
    usedBy: ["reminders", "timer"],
    action: "ask",
  },
  {
    id: "clipboard-read",
    name: "Clipboard — read",
    group: "system",
    glyph: "clipboard",
    what: "Read whatever you last copied.",
    permission: "clipboard-read",
    probe: () => hasNav() && typeof navigator.clipboard?.readText === "function",
    usedBy: [],
    action: "ask",
  },
  {
    id: "clipboard-write",
    name: "Clipboard — write",
    group: "system",
    glyph: "clipboard",
    what: "Put text on the clipboard when you press a copy button.",
    permission: "clipboard-write",
    probe: () => hasNav() && typeof navigator.clipboard?.writeText === "function",
    usedBy: ["color", "morse", "malayalam", "translate", "nearby", "system"],
    action: "none",
  },
  {
    id: "wake-lock",
    name: "Keep screen awake",
    group: "system",
    glyph: "lock",
    what: "Stop the display dimming or locking while the tab is open.",
    permission: "screen-wake-lock",
    probe: () => inNav("wakeLock"),
    usedBy: [],
    action: "ask",
  },
  {
    id: "idle",
    name: "Idle detection",
    group: "system",
    glyph: "idle",
    what: "Tell whether you have walked away from the machine.",
    permission: "idle-detection",
    probe: () => hasWin() && "IdleDetector" in window,
    usedBy: [],
    action: "ask",
  },
  {
    id: "windows",
    name: "Window placement",
    group: "system",
    glyph: "window",
    what: "See every display attached and place windows on them.",
    permission: "window-management",
    probe: () => hasWin() && "getScreenDetails" in window,
    usedBy: [],
    action: "ask",
  },
  {
    id: "fonts",
    name: "Installed fonts",
    group: "system",
    glyph: "font",
    what: "List the fonts on this machine — a strong fingerprint.",
    permission: "local-fonts",
    probe: () => hasWin() && "queryLocalFonts" in window,
    usedBy: [],
    action: "ask",
  },

  /* ── Hardware ─────────────────────────────────────────────────────────── */
  {
    id: "sensors",
    name: "Motion sensors",
    group: "hardware",
    glyph: "sensor",
    what: "Read how the device is being tilted, turned and moved.",
    permission: "accelerometer",
    probe: () => hasWin() && ("Accelerometer" in window || "DeviceMotionEvent" in window),
    usedBy: [],
    action: "none",
  },
  {
    id: "midi",
    name: "MIDI devices",
    group: "hardware",
    glyph: "midi",
    what: "Talk to attached musical instruments and controllers.",
    permission: "midi",
    probe: () => hasNav() && "requestMIDIAccess" in navigator,
    usedBy: [],
    action: "ask",
  },
  {
    id: "bluetooth",
    name: "Bluetooth",
    group: "hardware",
    glyph: "bluetooth",
    what: "Connect to a Bluetooth device you pick from the browser's chooser.",
    permission: "bluetooth",
    probe: () => inNav("bluetooth"),
    usedBy: ["nearby"],
    action: "none",
  },
  {
    id: "usb",
    name: "USB",
    group: "hardware",
    glyph: "usb",
    what: "Talk to a USB device you pick from the browser's chooser.",
    probe: () => inNav("usb"),
    usedBy: ["nearby"],
    action: "none",
  },
  {
    id: "hid",
    name: "HID devices",
    group: "hardware",
    glyph: "hid",
    what: "Read keyboards, gamepads and other input hardware directly.",
    probe: () => inNav("hid"),
    usedBy: ["nearby"],
    action: "none",
  },
  {
    id: "serial",
    name: "Serial ports",
    group: "hardware",
    glyph: "serial",
    what: "Open a serial port to a board or instrument you pick.",
    probe: () => inNav("serial"),
    usedBy: ["nearby"],
    action: "none",
  },

  /* ── Data ─────────────────────────────────────────────────────────────── */
  {
    id: "storage",
    name: "Persistent storage",
    group: "data",
    glyph: "drive",
    what: "Keep saved data on this device instead of letting it be evicted.",
    permission: "persistent-storage",
    probe: () => hasNav() && typeof navigator.storage?.persist === "function",
    usedBy: "all",
    action: "ask",
  },
  {
    id: "storage-access",
    name: "Cross-site cookies",
    group: "data",
    glyph: "cookie",
    what: "Read cookies set by another site — the classic tracking route.",
    permission: "storage-access",
    probe: () => typeof document !== "undefined" && "hasStorageAccess" in document,
    usedBy: [],
    action: "none",
  },
];

/** Group headings and the order the Access tab lists them in. */
export const ACCESS_GROUPS: { id: AccessGroup; title: string; blurb: string }[] = [
  {
    id: "capture",
    title: "Camera, mic & screen",
    blurb: "The resources that can watch, listen or record.",
  },
  { id: "location", title: "Location", blurb: "Where this device is, now and over time." },
  { id: "system", title: "System", blurb: "Alerts, the clipboard, the display and your fonts." },
  { id: "hardware", title: "Hardware", blurb: "Devices attached to or paired with this machine." },
  { id: "data", title: "Data & tracking", blurb: "What may be stored, and what may be shared." },
];

/** id → item, for the app rows that look a resource up by id. */
export const ACCESS_MAP: Record<AccessId, AccessItem> = Object.fromEntries(
  ACCESS_ITEMS.map((i) => [i.id, i]),
) as Record<AccessId, AccessItem>;

/** Human label per state, and whether it counts as "this is open". */
export const STATE_LABEL: Record<AccessState, string> = {
  granted: "Allowed",
  denied: "Blocked",
  prompt: "Asks first",
  unsupported: "Not available",
  unknown: "Unknown",
};
