/**
 * Single source of truth for site-wide SEO metadata: the canonical origin, the
 * brand name (and its search aliases), and the catalog of apps in the workspace.
 * Consumed by the root layout, sitemap, robots, per-route metadata and the
 * server-rendered SEO landing content so the domain/name live in exactly one place.
 */

// The production origin. Override per-environment via NEXT_PUBLIC_SITE_URL.
// Falls back to the live Vercel deployment so canonical/sitemap/robots are
// correct even when the env var is missing at build time.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://oneappready.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "OneApp";

// Search aliases people actually type. Surfaced in JSON-LD `alternateName` so
// Google associates all these spellings with the brand.
export const SITE_ALIASES = ["One App", "OneApp Workspace", "One App Online"];

export const SITE_TAGLINE = "Every tool in one place";

export const SITE_DESCRIPTION =
  "OneApp — every tool in one place. Sketch notes, a full PDF editor, image studio, todos, reminders, timer and more, in a single free offline-first web workspace. No sign-up, all data stays in your browser.";

/** One entry per app/deep-link. Drives the sitemap, the crawlable landing list
 * and per-route <title>/description/canonical. */
export type AppEntry = {
  path: string;
  name: string;
  /** Short marketing line used in metadata + the landing list. */
  blurb: string;
};

export const APPS: AppEntry[] = [
  { path: "/", name: "Sketch Notes", blurb: "freehand drawing and infinite note canvas" },
  { path: "/pdfeditor", name: "PDF Editor", blurb: "view, edit, annotate, merge and organize PDF files" },
  { path: "/image", name: "Image Studio", blurb: "crop, adjust and edit images in the browser" },
  {
    path: "/board",
    name: "Board",
    blurb:
      "build your own page in plain English — add, rename, reorder and remove note, checklist, counter, links and habit sections by typing what you want",
  },
  {
    path: "/todos",
    name: "Todos",
    blurb:
      "task list and planner framed by agenda, day, week, month and year — the agenda gathers tasks and reminders together into what is overdue, due today and coming up",
  },
  { path: "/reminders", name: "Reminders", blurb: "scheduled reminders with notifications" },
  { path: "/timer", name: "Timer", blurb: "pomodoro and countdown timer" },
  {
    path: "/system",
    name: "System Info",
    blurb: "live device and system dashboard — processor, memory, graphics, display and battery",
  },
  {
    path: "/resources",
    name: "Resource Monitor",
    blurb:
      "see what uses your camera, microphone, screen recording, location, memory, storage and data — live, per app, with every browser permission and tracking signal in one place",
  },
  {
    path: "/nearby",
    name: "Nearby Devices",
    blurb:
      "scan for nearby Bluetooth, USB, HID and serial devices, connect to them, and read each one's features — descriptors, services, capabilities and live input",
  },
  { path: "/speedtest", name: "Speed Test", blurb: "measure your network speed" },
  {
    path: "/news",
    name: "News",
    blurb: "latest headlines by category — tech, software engineering, sports and more",
  },
  {
    path: "/streams",
    name: "Streams",
    blurb:
      "play music and live channels from YouTube — genre and language stations, live radio and news, search and a saved library",
  },
  {
    path: "/worldclock",
    name: "World Clock",
    blurb:
      "live time in cities worldwide, with each country's key facts, specialities and latest news",
  },
  {
    path: "/malayalam",
    name: "Malayalam Writer",
    blurb: "write Malayalam by transliteration, on-screen keyboard or handwriting",
  },
  {
    path: "/translate",
    name: "Translate",
    blurb: "translate text between languages online or fully offline on-device",
  },
  {
    path: "/morse",
    name: "Morse Code",
    blurb: "learn, practise and send Morse code with a chart, drills and a tap key",
  },
  {
    path: "/soundmeter",
    name: "Sound Meter",
    blurb:
      "measure sound frequency, musical pitch and loudness from your microphone, with a live spectrum analyzer",
  },
  {
    path: "/color",
    name: "Color Lens",
    blurb:
      "pick any colour from a photo or your camera and get its hex, RGB, HSL, CMYK and LAB codes, colour name, contrast grades and image palette",
  },
  {
    path: "/qr",
    name: "QR Codes",
    blurb:
      "scan a QR code with your camera or from a picture, and create codes for links, Wi-Fi, contacts, email and locations",
  },
  {
    path: "/handoff",
    name: "Handoff",
    blurb:
      "move your notes, tasks and boards to another device by camera — no account, no upload, no cable",
  },
  {
    path: "/clone",
    name: "Clone",
    blurb:
      "copy an entire device's workspace onto another one — over a USB cable, across a network, or with no network at all",
  },
  {
    path: "/drop",
    name: "File Drop",
    blurb:
      "send files of any size from any device to any device — peer-to-peer, with no upload and no account",
  },
  {
    path: "/text",
    name: "Text Kit",
    blurb:
      "text tools that run in your browser — case converter, line sorter, word count, base64 and URL encoder, JSON formatter, text diff, regex tester and SHA/CRC checksums",
  },
  {
    path: "/assistant",
    name: "Assistant",
    blurb: "a free AI guide that answers what every app in the workspace can do",
  },
  {
    path: "/walkaround",
    name: "Walkaround",
    blurb:
      "a guided tour of any app in the workspace — a schematic of its screen with a tooltip on each control in turn, saying where it is, what it does and what is worth trying",
  },
  {
    path: "/scan",
    name: "Scan",
    blurb:
      "turn a photo of a page into a PDF — mark the four corners and the page is flattened with a perspective correction, not merely cropped, then enhanced and saved as a multi-page PDF entirely in your browser",
  },
  {
    path: "/wallet",
    name: "Wallet",
    blurb:
      "an expense tracker that takes seconds to use — log what you spent, see where the month went by category, set a monthly target, export a CSV, and split a bill fairly to the last minor unit",
  },
  {
    path: "/voice",
    name: "Voice Memos",
    blurb:
      "record voice memos and transcribe them as you speak, so you can search months of recordings by what was said — the audio never leaves your device",
  },
  {
    path: "/convert",
    name: "Convert",
    blurb:
      "convert units of length, weight, temperature, volume, area, speed, data, time, pressure, energy, fuel and angle, plus currency at the latest European Central Bank rates",
  },
  {
    path: "/apiclient",
    name: "API Client",
    blurb:
      "build and send HTTP requests in the browser — methods, headers, JSON bodies, a saved collection, a pretty-printed response viewer and the equivalent curl command",
  },
  {
    path: "/snippets",
    name: "Snippets",
    blurb:
      "a searchable library for the code you keep looking up — tagged, syntax-highlighted, copy on every card, and stored only on your own device",
  },
  {
    path: "/markdown",
    name: "Markdown",
    blurb:
      "a markdown editor with a live preview, Mermaid diagrams, tables, task lists, a table of contents and word count, exporting to .md or a standalone HTML file",
  },
  {
    path: "/chrono",
    name: "Chrono",
    blurb:
      "explain any cron expression in plain English and list its next runs, convert Unix timestamps and dates into every form, and do arithmetic on durations",
  },
  {
    path: "/contrast",
    name: "Contrast",
    blurb:
      "check colour contrast against every WCAG level and get the nearest passing shade, build a 50–950 tonal ramp as CSS, Tailwind, SCSS or JSON tokens, and preview a palette under colour-vision deficiency",
  },
  {
    path: "/satellite",
    name: "Satellite Map",
    blurb:
      "see any place on Earth from above — satellite imagery, street and terrain maps, live rain radar and NASA's daily global pass animated frame by frame, place search and your own live position",
  },
];

/** Keywords targeting the brand plus each tool's search intent. */
export const SITE_KEYWORDS = [
  "OneApp",
  "One App",
  "one app",
  "all in one app",
  "all-in-one web app",
  "online tools",
  "sketch notes",
  "PDF editor",
  "image studio",
  "todo app",
  "custom dashboard builder",
  "build a page by prompting",
  "no-code personal dashboard",
  "habit tracker online",
  "counter app online",
  "checklist maker",
  "reminders app",
  "pomodoro timer",
  "malayalam typing",
  "manglish to malayalam",
  "malayalam keyboard online",
  "malayalam handwriting",
  "language translator",
  "offline translator",
  "translate text online",
  "on-device translation",
  "morse code",
  "learn morse code",
  "morse code translator",
  "morse code chart",
  "morse code practice",
  "sound frequency meter",
  "frequency measurement online",
  "hz meter",
  "online tuner",
  "pitch detector",
  "spectrum analyzer online",
  "decibel meter",
  "sound level meter",
  "color picker from image",
  "image color picker online",
  "photo color picker",
  "hex color from picture",
  "eyedropper tool online",
  "color palette generator from image",
  "rgb to hex converter",
  "cmyk color code",
  "color contrast checker",
  "what color is this",
  "youtube music online",
  "listen to music online free",
  "youtube live streaming",
  "live tv online",
  "lofi radio online",
  "online music player",
  "watch youtube in one app",
  "world clock",
  "world time",
  "time zone converter",
  "what time is it in",
  "current time in another country",
  "country information",
  "country facts",
  "meeting time planner",
  "what apps use my camera",
  "which apps use my microphone",
  "app permissions checker",
  "browser permissions manager",
  "camera and microphone monitor",
  "screen recording detector",
  "is my camera on",
  "location tracking check",
  "ram and storage usage",
  "browser storage usage",
  "website tracking checker",
  "browser fingerprint check",
  "privacy dashboard online",
  "nearby device scanner",
  "scan for bluetooth devices",
  "find nearby devices online",
  "devices available to connect",
  "connect to a bluetooth device from the browser",
  "open a serial port in the browser",
  "bluetooth device info",
  "usb device information",
  "what device is this",
  "ble scanner web",
  "gamepad tester",
  "controller tester online",
  "offline PWA",
  "free online tools no signup",
  "qr code scanner online",
  "qr code generator free",
  "scan qr from image",
  "wifi qr code generator",
  "vcard qr code",
  "read qr code on my screen",
  "transfer data between devices offline",
  "send notes to my phone",
  "share data without internet",
  "qr file transfer",
  "send large files without uploading",
  "peer to peer file transfer browser",
  "share files between devices offline",
  "send a file to another device",
  "webrtc file transfer",
  "no upload file sharing",
  "json formatter online",
  "text diff tool",
  "compare two texts",
  "base64 encode decode",
  "regex tester online",
  "sha256 hash online",
  "file checksum in browser",
  "word and character count",
  "case converter online",
  "sort lines remove duplicates",
  "clone device data",
  "copy everything to a new phone",
  "move data to a new laptop",
  "transfer data over a usb cable",
  "usb tethering data transfer",
  "migrate to a new device",
  "switch phones keep my data",
  "copy browser data to another computer",
  "device migration without cloud",
  "transfer data with no internet",
  "free ai assistant",
  "in-app ai guide",
  "on-device ai chat",
  "ai agent no api key",
  "document scanner online",
  "scan to pdf in browser",
  "scan a receipt to pdf",
  "photo to pdf",
  "deskew a scanned page",
  "expense tracker no account",
  "spending tracker offline",
  "split a bill calculator",
  "who owes what",
  "monthly budget tracker",
  "voice recorder online",
  "voice memo with transcript",
  "transcribe speech in browser",
  "searchable voice notes",
  "unit converter online",
  "currency converter",
  "kg to pounds",
  "celsius to fahrenheit",
  "litres per 100km to mpg",
  "api client in browser",
  "rest client online",
  "postman alternative online",
  "send an http request online",
  "convert request to curl",
  "code snippet manager",
  "save code snippets online",
  "markdown editor online",
  "markdown preview",
  "mermaid diagram editor",
  "markdown to html",
  "cron expression explained",
  "cron next run time",
  "crontab generator",
  "unix timestamp converter",
  "epoch to date",
  "duration calculator",
  "contrast checker wcag",
  "colour contrast ratio",
  "colour ramp generator",
  "tailwind colour tokens",
  "colour blindness simulator",
  "accessible colour palette",
];
