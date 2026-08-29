import type { AppId } from "@/store/useWorkspaceStore";
import type { KnowledgeEntry } from "./types";

/**
 * The assistant's knowledge base — a hand-written, verified description of every
 * app and cross-cutting behaviour in the workspace. This is the *only* source
 * the agent answers from: the local retrieval engine quotes these entries
 * directly, and the on-device language model is given the top matches as its
 * sole context (so it can rephrase, never invent).
 *
 * Keeping the facts here — rather than in prompts or components — means one
 * place to update when an app gains a feature.
 */

/** Display names, keyed by app id. Used for action labels and app lists. */
export const APP_LABELS: Record<AppId, string> = {
  sketchnotes: "Sketchnotes",
  pdf: "PDF Editor",
  image: "Image Studio",
  board: "Board",
  todos: "Todos",
  reminders: "Reminders",
  timer: "Timer",
  system: "System Info",
  resources: "Resource Monitor",
  nearby: "Nearby Devices",
  speed: "Network Speed",
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

/**
 * Ways a person might name each app in a question ("open the pdf thing").
 * Matched as whole words, longest first, so "pdf editor" wins over "pdf".
 */
export const APP_ALIASES: Record<AppId, string[]> = {
  sketchnotes: ["sketchnotes", "sketch notes", "sketch", "canvas", "draw", "drawing", "notes", "whiteboard", "doodle"],
  pdf: ["pdf editor", "pdf", "pdfs", "document editor"],
  image: ["image studio", "image", "images", "photo", "photos", "picture", "pictures"],
  // "board" and "sections" only — the generic words ("dashboard", "page") are
  // left out so they can't outrank a question about the workspace itself.
  board: ["board", "my board", "sections", "custom dashboard", "prompt board", "habit tracker", "counter"],
  todos: ["todos", "todo", "to-do", "tasks", "task list", "planner"],
  reminders: ["reminders", "reminder", "alerts", "alarm", "alarms"],
  timer: ["timer", "timers", "stopwatch", "pomodoro", "countdown"],
  system: ["system info", "system", "device info", "hardware", "specs"],
  // Deliberately narrow on the bare words: "camera" and "microphone" alone
  // belong to Color Lens and Sound Meter, which *use* them. This app is asked
  // for by the question "what is using them".
  resources: [
    "resource monitor",
    "resources",
    "permissions",
    "app permissions",
    "site permissions",
    "camera permission",
    "microphone permission",
    "privacy monitor",
    "privacy dashboard",
    "what uses my camera",
    "what is using my microphone",
    "screen recording",
    "location access",
    "tracking",
    "trackers",
    "fingerprint",
    "storage usage",
    "ram usage",
    "memory usage",
  ],
  nearby: [
    "nearby devices",
    "nearby",
    "device scanner",
    "scan for devices",
    "bluetooth scanner",
    "bluetooth devices",
    "ble",
    "usb devices",
    "peripherals",
    "connected devices",
    "gamepad tester",
    "controller tester",
  ],
  speed: ["network speed", "speed test", "speedtest", "internet speed", "bandwidth"],
  news: ["news", "headlines", "newspaper"],
  streams: [
    "streams",
    "youtube",
    "youtube music",
    "music",
    "songs",
    "play music",
    "listen to music",
    "radio",
    "live tv",
    "live stream",
    "live streaming",
    "lofi",
  ],
  world: [
    "world clock",
    "world time",
    "worldclock",
    "time zone",
    "time zones",
    "timezone",
    "timezones",
    "utc",
    "gmt",
    "what time is it",
    "time in",
    "country info",
    "country details",
    "country facts",
    "countries",
  ],
  malayalam: ["malayalam writer", "malayalam", "manglish", "മലയാളം"],
  translate: ["translate", "translator", "translation"],
  morse: ["morse code", "morse", "sos", "dots and dashes", "telegraph", "cw"],
  sound: [
    "sound meter",
    "sound frequency",
    "frequency meter",
    "frequency",
    "hz",
    "hertz",
    "pitch",
    "tuner",
    "decibel",
    "decibels",
    "db meter",
    "spectrum analyzer",
    "spectrum analyser",
    "microphone",
    "mic",
    "noise level",
  ],
  color: [
    "color lens",
    "colour lens",
    "color picker",
    "colour picker",
    "eyedropper",
    "eye dropper",
    "color code",
    "colour code",
    "hex code",
    "hex colour",
    "hex color",
    "rgb",
    "hsl",
    "cmyk",
    "color palette",
    "colour palette",
    "color from image",
    "colour from image",
    "contrast checker",
  ],
  qr: [
    "qr codes",
    "qr code",
    "qr",
    "barcode",
    "scan a code",
    "scanner",
    "wifi code",
    "vcard",
  ],
  handoff: [
    "handoff",
    "send to my phone",
    "send to another device",
    "transfer data",
    "move my data",
    "device transfer",
  ],
  // "clone" and the phrases people use when they've bought a new machine. The
  // bare word "copy" is left out: it belongs to copying text, not devices.
  clone: [
    "clone",
    "clone my device",
    "system clone",
    "copy everything",
    "new phone",
    "new laptop",
    "switching devices",
    "switching phones",
    "migrate",
    "migration",
    "move everything",
    "set up my new device",
    "transfer over a cable",
    "usb transfer",
    "copy without internet",
  ],
  text: [
    "text kit",
    "text tools",
    "diff",
    "compare two texts",
    "base64",
    "encode",
    "decode",
    "format json",
    "json formatter",
    "regex tester",
    "word count",
    "character count",
    "checksum",
    "sha256",
    "hash a file",
    "change case",
  ],
  drop: [
    "file drop",
    "send a file",
    "send files",
    "share a file",
    "send a big file",
    "large file transfer",
    "file transfer",
    "airdrop",
    "send a video",
  ],
  assistant: ["assistant", "guide", "ai agent", "helper", "chatbot"],
  walk: [
    "walkaround",
    "walk around",
    "guided tour",
    "tour",
    "show me around",
    "show me how",
    "take me round",
    "walkthrough",
    "walk through",
    "tutorial",
    "onboarding",
    "how do i use this",
    "tooltips",
  ],
  scan: [
    "scan",
    "scanner",
    "document scanner",
    "scan a document",
    "scan to pdf",
    "scan a receipt",
    "photograph a page",
    "straighten a page",
    "deskew",
  ],
  wallet: [
    "wallet",
    "expenses",
    "expense tracker",
    "spending",
    "spend tracker",
    "budget",
    "my money",
    "track my spending",
    "split the bill",
    "split a bill",
    "who owes what",
  ],
  voice: [
    "voice memos",
    "voice memo",
    "voice recorder",
    "record my voice",
    "record audio",
    "dictate",
    "dictation",
    "transcribe",
    "transcription",
    "speech to text",
  ],
  convert: [
    "convert",
    "converter",
    "unit converter",
    "convert units",
    "currency converter",
    "exchange rate",
    "kg to pounds",
    "celsius to fahrenheit",
    "how many",
  ],
  api: [
    "api client",
    "api tester",
    "rest client",
    "http request",
    "send a request",
    "postman",
    "curl",
    "test an endpoint",
    "call an api",
  ],
  snippets: [
    "snippets",
    "snippet",
    "code snippets",
    "save some code",
    "my snippets",
    "boilerplate",
    "code library",
  ],
  markdown: [
    "markdown",
    "markdown editor",
    "write markdown",
    "readme",
    "mermaid",
    "mermaid diagram",
    "preview markdown",
  ],
  chrono: [
    "chrono",
    "cron",
    "crontab",
    "cron expression",
    "explain a cron",
    "when does this run",
    "timestamp",
    "unix timestamp",
    "epoch",
    "epoch time",
    "duration",
    "how long is",
  ],
  contrast: [
    "contrast",
    "contrast checker",
    "wcag",
    "accessibility check",
    "a11y",
    "colour ramp",
    "color ramp",
    "design tokens",
    "colour blind",
    "color blind",
    "colour blindness",
    "is this readable",
  ],
  // "map" and "satellite" are safe to claim outright — no other app here draws
  // one. The weather phrasings are included because "is it raining" is how
  // people actually ask for the live overlay, not "show me radar tiles".
  satellite: [
    "satellite map",
    "satellite",
    "satellite view",
    "map",
    "maps",
    "world map",
    "aerial view",
    "aerial photo",
    "from above",
    "birds eye view",
    "see my house",
    "street map",
    "terrain map",
    "topographic map",
    "coordinates",
    "latitude and longitude",
    "gps",
    "where am i",
    "my location",
    "find a place",
    "geocode",
    "rain radar",
    "weather radar",
    "is it raining",
    "todays satellite image",
    "street view",
    "streetview",
    "locate me",
    "weather map",
    "live weather",
  ],
};

/**
 * Names of the PDF-editor sections the assistant can deep-link into. Duplicated
 * here rather than imported from the PDF app so the two apps stay independent
 * (see rule 5) — the ids match `components/PdfEditor/catalog.ts`.
 */
export const PDF_TOOL_LABELS: Record<string, string> = {
  edit: "Edit & annotate",
  merge: "Merge PDFs",
  split: "Split PDF",
  organize: "Organize pages",
  create: "Text → PDF",
  img: "Images → PDF",
  toimg: "PDF → Images",
  wm: "Watermark",
  num: "Page numbers",
  meta: "Metadata",
};

/** Deep-link path per app, mirroring the routing in components/Workspace.tsx. */
export const APP_PATHS: Record<AppId, string> = {
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
  api: "/apiclient",
  snippets: "/snippets",
  markdown: "/markdown",
  chrono: "/chrono",
  satellite: "/satellite",
  contrast: "/contrast",
};

/** One-line summary per app, used when listing the whole workspace. */
export const APP_SUMMARIES: Record<AppId, string> = {
  sketchnotes: "draw and write on an infinite canvas, with many saved notes",
  pdf: "ten PDF tools — edit, merge, split, organise, convert, watermark and more",
  image: "crop, resize, compress and convert images to any upload limit",
  board: "a page you build by typing — add, edit and remove sections in plain English",
  todos:
    "tasks framed by day, week, month and year — plus an agenda that gathers tasks and reminders together into overdue, today and coming up",
  reminders: "timed alerts that ring with a sound you pick",
  timer: "countdown timers, a lap stopwatch and pomodoro cycles",
  system: "a live report on this device, browser and hardware",
  resources:
    "what uses your camera, mic, screen, location, memory and storage — live, and app by app",
  nearby:
    "find the devices around this machine, read what each one is and can do, and connect to them",
  speed: "download, upload, ping and jitter measurement",
  news: "headlines by category — tech, software engineering, sports, national, state, local, world",
  streams:
    "music stations and live channels from YouTube, played in a workspace tab",
  world: "live time in cities worldwide, with each country's facts, specialities and news",
  malayalam: "type Malayalam by Manglish, on-screen keyboard or handwriting",
  translate: "translate text online, or fully offline on-device",
  morse: "learn, practise and send Morse code — chart, drills, translator and a key",
  sound: "measure sound frequency, musical pitch and loudness from the microphone",
  color: "read any colour out of a photo — every code, its name, contrast and palette",
  qr: "scan a QR code with the camera or from a picture, and make codes for links, Wi-Fi, contacts and more",
  handoff: "move this browser's data to another device by camera — no account, no upload, no cable",
  clone: "copy this whole device onto another one — by cable, over a network, or with no network at all",
  drop: "send files of any size straight from one device to another, on the same network with no internet at all, or across the internet",
  text: "the small jobs on text — case, lines, counts, base64, JSON, diff, regex and checksums, all done on this device",
  assistant: "this guide — ask what the workspace can do",
  walk:
    "a guided tour of any app here — a drawing of its screen, with a tooltip on each control saying what it does and what to try",
  scan:
    "photograph a page and get a PDF — you mark the four corners and it is flattened, not just cropped",
  wallet:
    "log what you spent in a few seconds, see where the month went, and split a bill fairly down to the last paisa",
  voice:
    "record a memo and, optionally, transcribe it as you speak — so you can search what you said months later",
  convert:
    "units of every kind — length, weight, temperature, data, fuel — plus currency at the latest published rate",
  api: "build an HTTP request, send it, and read the reply, with the equivalent curl command beside it",
  snippets: "the code you keep looking up, tagged and searchable, with copy on every card",
  markdown:
    "write markdown with a live preview, Mermaid diagrams and a table of contents, then export it as .md or a standalone HTML file",
  chrono:
    "explain a cron expression and show when it next fires, read any timestamp in every form, and do arithmetic on durations",
  contrast:
    "grade a colour pair against every WCAG level, build a 50–950 token ramp, and preview a palette under colour-vision deficiency",
  satellite:
    "see any place on Earth from above, find where you are, drop to Street View, and watch live rain radar or today's satellite pass animated over it",
};

export const KNOWLEDGE: KnowledgeEntry[] = [
  // ── Workspace-level ──────────────────────────────────────────────────────
  {
    id: "overview",
    title: "What OneApp is",
    keywords: ["oneapp", "one app", "overview", "about", "what is this", "workspace", "summary", "purpose", "intro"],
    answer:
      "OneApp is a single web workspace holding thirty-six tools, so you never install thirty-six apps.\n" +
      "• Creative: Sketchnotes canvas, Image Studio, PDF Editor, Scan, Markdown\n" +
      "• Planning: Board, Todos, Reminders, Timer, Wallet, Voice Memos\n" +
      "• Info: News, World Clock, Satellite Map, System Info, Resource Monitor, Nearby Devices, Network Speed, Sound Meter, Color Lens, Convert\n" +
      "• Making things: Snippets, Chrono, Contrast, API Client, Text Kit, QR Codes\n" +
      "• Moving things: Handoff, Clone, File Drop, Streams\n" +
      "• Language: Translate, Malayalam Writer, Morse Code, and me — the Assistant, alongside Walkaround\n" +
      "Everything is free, needs no account, and keeps your data in your own browser.",
    followUps: ["List all the apps", "Is my data private?", "Does it work offline?"],
  },
  {
    id: "privacy",
    title: "Privacy and where data is stored",
    keywords: ["privacy", "private", "data", "stored", "storage", "server", "upload", "cloud", "account", "sign up", "login", "tracking", "safe", "security", "localstorage"],
    answer:
      "Your work stays on your machine. There is no account and no sign-up.\n" +
      "• Notes, tasks, reminders, timers and preferences live in this browser's localStorage\n" +
      "• PDFs and images are processed in the browser — the files are never uploaded\n" +
      "• Only three features touch the network: news headlines, online translation and handwriting recognition\n" +
      "Clearing your browser data for this site erases everything, so export anything you want to keep.",
    followUps: ["How do I back up my notes?", "Does it work offline?", "Is it free?"],
  },
  {
    id: "offline",
    title: "Work offline and install the app",
    keywords: ["offline", "offline mode", "work offline", "works offline", "use it offline", "use offline", "no internet", "no connection", "without internet", "airplane mode", "slow internet", "weak connection", "save data", "data saver", "install", "pwa", "home screen", "app icon", "service worker", "download app", "save for offline"],
    answer:
      "OneApp is a PWA: after your first visit it saves itself on your device, so every app opens with no connection — including a fresh reload of any app's link.\n" +
      "• Every app is downloaded in the background on a healthy connection; to force it (before a flight, say) open Settings → Offline → Save all apps for offline\n" +
      "• Install it from your browser's Install / Add to Home Screen option to get an app icon and its own window\n" +
      "• Fully offline: Sketchnotes, PDF Editor, Image Studio, Board, Todos, Reminders, Timer, System Info, Nearby Devices, Sound Meter, Color Lens, Scan, Wallet, Snippets, Markdown, Chrono, Contrast, Convert's units, Voice Memos' recording, World Clock (clocks and country details), Malayalam typing/keyboard, on-device Translate, Walkaround, and me\n" +
      "• Needs a connection: News and World Clock headlines (saved ones still open), online translation (past phrases still open), handwriting recognition, the speed test, Convert's currency rates (the last ones are kept and dated), Voice Memos' transcription, and the API Client — every request it sends is relayed by the server, so it needs the network\n" +
      "• On a weak or metered connection it serves saved content instead of stalling, and skips optional downloads like news logos",
    followUps: ["Is my data private?", "Which apps need internet?", "List all the apps"],
  },
  {
    id: "pricing",
    title: "Cost",
    keywords: ["free", "price", "pricing", "cost", "paid", "subscription", "trial", "premium", "money", "ads"],
    answer:
      "Every tool is completely free, with no trial, no subscription and no feature held back.\n" +
      "There is nothing to sign up for — open a tool and use it.",
    followUps: ["What is OneApp?", "Is my data private?"],
  },
  {
    id: "switching",
    title: "Switch and reorder apps",
    keywords: ["switch", "switching", "change app", "open app", "launcher", "apps button", "navigate", "reorder", "rearrange", "drag", "order", "url", "deep link", "bookmark"],
    answer:
      "Press the Apps button in any app's header to open the launcher, then pick a tile.\n" +
      "• Drag a tile's ⠿ handle (or focus it and press the arrow keys) to reorder the grid — your order is remembered\n" +
      "• Each app has its own address, so you can bookmark one directly, e.g. /pdfeditor, /todos, /translate\n" +
      "• Browser back and forward move between apps as you would expect\n" +
      "Fastest of all: tell me \"open the timer\" and I'll take you there.",
    followUps: ["List all the apps", "How do I change the theme?"],
  },
  {
    id: "theme",
    title: "Themes and dark mode",
    keywords: ["theme", "themes", "dark mode", "light mode", "colour", "color", "appearance", "settings", "night", "palette", "custom theme", "my own theme", "oled", "black theme"],
    answer:
      "Open Settings from the bottom of the app launcher to pick a theme. Twenty-four are built in:\n" +
      "• Light — Light, Ocean, Sky, Mint, Forest, Sunset, Clay, Sand, Olive, Rose, Grape, Lavender, Slate\n" +
      "• Dark — Dark, Midnight, Carbon, Abyss, Matrix, Nebula, Ember, Wine, Mocha, Arctic, Noir (pure black, for OLED screens)\n" +
      "You can also build your own: tap \"Custom theme\", choose a light or dark base, an accent and a background colour, and the rest of the palette is worked out from those. It shows the contrast ratio as you pick, so your theme stays readable, and you can keep up to twelve — each one editable and deletable later.\n" +
      "The choice applies to every app at once and is remembered on this device. Or just tell me — \"switch to Ocean\" — and I'll set it for you.",
    followUps: ["How do I change the interface style?", "How do I change the mouse pointer?"],
  },
  {
    id: "interface",
    title: "Interface style and density",
    keywords: ["interface", "interface style", "ui style", "component style", "design", "look", "shape", "corners", "rounded", "square", "glass", "glassmorphism", "blur", "flat", "solid", "outline", "borders", "shadow", "density", "compact", "spacing", "roomy", "layout", "appearance", "settings"],
    answer:
      "Settings → Interface changes the *shape* of the workspace, where the theme changes its colour. Five styles:\n" +
      "• Glass — frosted translucent panels over a soft ambient wash. The default\n" +
      "• Solid — opaque cards with a gentle lift; no blur or tint, quicker to read\n" +
      "• Soft — generous round corners and a wide, diffuse shadow\n" +
      "• Sharp — square corners and a tight shadow; precise and dense\n" +
      "• Outline — borders instead of shadows, for the least visual noise\n" +
      "Underneath is Density — Compact, Cosy or Roomy — which tightens or opens up padding, gaps and control sizes across every app. Style and density are separate choices, so you can mix them, and both apply everywhere at once and are remembered on this device.",
    followUps: ["How do I change the theme?", "How do I change the mouse pointer?"],
  },
  {
    id: "cursor",
    title: "Changing the mouse pointer",
    keywords: ["cursor", "mouse", "pointer", "mouse pointer", "arrow", "crosshair", "big cursor", "large cursor", "custom cursor", "emoji cursor", "settings", "appearance"],
    answer:
      "Settings → Pointer swaps the mouse cursor for the whole workspace. Thirteen shapes are drawn in, plus your device's own:\n" +
      "• Everyday — System (your device's own, the default), Arrow, Chevron, Hand, Crosshair, Dot, Ring\n" +
      "• Drawing — Pen, Pencil, Brush\n" +
      "• Playful — Sparkle, Star, Heart, Pixel (retro 8-bit)\n" +
      "Then make it yours: four sizes from Small to Huge, and a colour that follows the theme, the accent, or any shade you pick.\n" +
      "You can also bring your own — upload an image or choose an emoji and it becomes the pointer, with the point set to the top-left corner or the middle. It's drawn on your device and never uploaded.\n" +
      "Hover a tile in the picker to try a pointer before choosing it. The pointer turns accent-coloured over anything clickable, and the cursors that mean something specific — the drawing crosshair, the text caret, drag handles — are left alone. Touch and pen input are unaffected, and the choice is remembered on this device.",
    followUps: ["How do I change the theme?", "Is the app accessible?"],
  },
  {
    id: "backup",
    title: "Back up and export your work",
    keywords: ["backup", "back up", "export", "save", "download", "transfer", "move to another device", "import", "restore", "json"],
    answer:
      "Each app exports what it holds, and Sketchnotes has a full backup format:\n" +
      "• Sketchnotes — download a note as PNG, JPG, WebP, SVG, PDF, Word or a JSON backup you can re-import later\n" +
      "• Malayalam Writer — copy the text or download it as a file\n" +
      "• PDF Editor and Image Studio — every result downloads straight to your device\n" +
      "• System Info — export the device report\n" +
      "• Nearby Devices — copy the whole device inventory as text\n" +
      "Because data is per-browser, a JSON export is how you move notes to another device.",
    followUps: ["Is my data private?", "What can Sketchnotes do?"],
  },
  {
    id: "mobile",
    title: "Mobile and touch support",
    keywords: ["mobile", "phone", "tablet", "ipad", "touch", "responsive", "stylus", "pen", "finger", "small screen"],
    answer:
      "Every screen is designed mobile-first and reflows down to about 360px wide, so every tool works on a phone.\n" +
      "• Drawing, handwriting and the PDF editor accept touch and stylus input\n" +
      "• Install it to your home screen to use it like a native app\n" +
      "• Layouts widen into side-by-side panes on tablets and desktops",
    followUps: ["Does it work offline?", "What can Sketchnotes do?"],
  },

  // ── Apps ─────────────────────────────────────────────────────────────────
  {
    id: "app-sketchnotes",
    title: "Sketchnotes — infinite drawing canvas",
    app: "sketchnotes",
    keywords: ["sketchnotes", "sketch", "draw", "drawing", "canvas", "notes", "note", "pen", "eraser", "shapes", "arrow", "emoji", "sticker", "text", "handwriting", "zoom", "undo", "whiteboard", "diagram"],
    answer:
      "Sketchnotes is the home canvas — an infinite surface for sketching and jotting.\n" +
      "• Tools: select/move, pen, eraser, line, arrow, shapes, emoji stickers and text\n" +
      "• Pick stroke colour and width, plus font and size for text\n" +
      "• Pan and zoom freely, with undo/redo and single-key shortcuts (V, P, E, L, A)\n" +
      "• Keep many notes in the drawer and switch between them\n" +
      "• Export as PNG, JPG, WebP, SVG, PDF, Word, or a JSON backup you can re-import",
    followUps: ["What are the keyboard shortcuts?", "How do I back up my notes?", "What can the PDF Editor do?"],
  },
  {
    id: "app-pdf",
    title: "PDF Editor — ten PDF tools",
    app: "pdf",
    keywords: ["pdf", "pdfs", "merge", "split", "combine", "organize", "organise", "rotate", "watermark", "page numbers", "metadata", "annotate", "sign", "compress", "convert", "document"],
    answer:
      "The PDF Editor runs entirely in your browser — files are never uploaded. Ten tools:\n" +
      "• Edit & annotate — retype existing text, add text, draw, highlight or white-out\n" +
      "• Merge, Split, Organize pages (reorder, rotate, delete, extract)\n" +
      "• Text → PDF, Images → PDF, PDF → Images\n" +
      "• Watermark, Page numbers, Metadata\n" +
      "Each tool has its own address, like /pdfeditor/merge, so you can bookmark the one you use most.",
    followUps: ["How do I merge PDFs?", "How do I split a PDF?", "Can I edit text in a PDF?"],
  },
  {
    id: "pdf-merge",
    title: "Merge PDFs",
    app: "pdf",
    tool: "merge",
    keywords: ["merge", "combine", "join", "append", "one pdf", "multiple pdfs", "stitch"],
    answer:
      "Open PDF Editor → Merge PDFs, add two or more files, drag them into the order you want, then press merge and download the result. It all happens locally, so even large files stay on your device.",
    followUps: ["How do I split a PDF?", "How do I reorder pages?"],
  },
  {
    id: "pdf-split",
    title: "Split a PDF",
    app: "pdf",
    tool: "split",
    keywords: ["split", "cut", "separate", "extract pages", "burst", "page range", "one page per file"],
    answer:
      "Open PDF Editor → Split PDF. Give custom page ranges and each range downloads as its own file, or burst the document so every page becomes a separate PDF.",
    followUps: ["How do I merge PDFs?", "How do I reorder pages?"],
  },
  {
    id: "pdf-organize",
    title: "Reorder, rotate and delete PDF pages",
    app: "pdf",
    tool: "organize",
    keywords: ["organize", "organise", "reorder", "rearrange pages", "rotate", "delete page", "remove page", "extract", "page order", "thumbnails"],
    answer:
      "Open PDF Editor → Organize pages for a visual page grid: tap pages to select, drag to reorder, then rotate, delete or extract the selection and apply.",
    followUps: ["How do I split a PDF?", "Can I edit text in a PDF?"],
  },
  {
    id: "pdf-edit",
    title: "Edit text in a PDF",
    app: "pdf",
    tool: "edit",
    keywords: ["edit text", "retype", "annotate", "highlight", "white out", "whiteout", "fill form", "sign", "signature", "write on pdf"],
    answer:
      "Open PDF Editor → Edit & annotate. Tap existing text to retype it, add new text anywhere, or draw, highlight and white-out. Your changes are flattened into the PDF when you apply, so they survive anywhere the file is opened.",
    followUps: ["What can the PDF Editor do?", "How do I add a watermark?"],
  },
  {
    id: "pdf-convert",
    title: "Convert to and from PDF",
    app: "pdf",
    tool: "img",
    keywords: ["convert", "images to pdf", "jpg to pdf", "pdf to images", "pdf to jpg", "png", "scan", "text to pdf", "export pdf"],
    answer:
      "Three conversion tools live in the PDF Editor:\n" +
      "• Images → PDF — JPG, PNG, WebP or GIF, one image per page in the order you set\n" +
      "• PDF → Images — render every page to PNG or JPEG (several pages arrive zipped)\n" +
      "• Text → PDF — paste plain text and get a clean, paginated document",
    followUps: ["What can the PDF Editor do?", "What can Image Studio do?"],
  },
  {
    id: "pdf-watermark",
    title: "Watermarks, page numbers and metadata",
    app: "pdf",
    tool: "wm",
    keywords: ["watermark", "stamp", "page numbers", "numbering", "metadata", "title", "author", "properties", "draft", "confidential"],
    answer:
      "The PDF Editor can stamp a watermark across pages, add page numbers, and edit document metadata such as title and author — each is its own tool in the grid.",
    followUps: ["What can the PDF Editor do?", "Can I edit text in a PDF?"],
  },
  {
    id: "app-image",
    title: "Image Studio — resize, crop and compress",
    app: "image",
    keywords: ["image", "images", "photo", "picture", "crop", "resize", "compress", "convert", "kb", "mb", "file size", "aspect ratio", "passport", "upload limit", "webp", "jpg", "png"],
    answer:
      "Image Studio fits an image to whatever an upload form demands, all locally:\n" +
      "• Crop freely or to a fixed aspect ratio\n" +
      "• Resize to exact pixel dimensions\n" +
      "• Compress down to a target file size (handy for \"under 200 KB\" limits)\n" +
      "• Convert between JPG, PNG and WebP\n" +
      "Your photos never leave the device.",
    followUps: ["How do I compress an image to a size limit?", "How do I convert images to PDF?"],
  },
  {
    id: "app-board",
    title: "Board — a page you build by prompting",
    app: "board",
    keywords: ["board", "my board", "sections", "section", "add a section", "remove a section", "custom page", "custom dashboard", "dashboard", "build my own", "prompt", "prompting", "plain english", "natural language", "widget", "widgets", "card", "cards", "counter", "tally", "habit", "habit tracker", "streak", "checklist", "links", "bookmarks", "note"],
    answer:
      "Board is a page you compose by describing it. Type what you want and it appears:\n" +
      "• Add — \"add a checklist for groceries\", \"add a counter for water with a goal of 8\", \"add a habit for reading\", \"add a note called Ideas\"\n" +
      "• Modify — \"rename groceries to shopping\", \"set the water goal to 10\", \"turn ideas into a checklist\", \"make ideas wide\", \"move groceries to top\"\n" +
      "• Fill in — \"add milk to groceries\", \"check milk\", \"add 5 to water\", \"check today on reading\"\n" +
      "• Remove — \"remove milk from groceries\", \"remove groceries\", \"reset water\", \"clear the board\", \"undo\"\n" +
      "Five section types: Note, Checklist, Counter (with a goal, step and unit), Links and Habit (a seven-day streak). Every card also has its own buttons, so you never have to guess a phrase, and the ? button lists every wording it understands.\n" +
      "The wording is read by a small parser built into the app — no API key, no account, nothing sent anywhere — so it works offline, and your board stays in this browser.",
    followUps: ["How do Todos work?", "Is my data private?", "Does it work offline?"],
  },
  {
    id: "app-todos",
    title: "Todos — tasks by day, week, month and year",
    app: "todos",
    keywords: ["todo", "todos", "task", "tasks", "checklist", "planner", "due date", "priority", "week", "month", "year", "plan", "productivity", "search tasks"],
    answer:
      "Todos wraps one task list in four framings — Day, Week, Month and Year — so you can zoom between today and the big picture.\n" +
      "• Add tasks with due dates, tick them off, and clear completed ones in a batch\n" +
      "• Filter by status and search by text\n" +
      "• A stats bar summarises the period you're looking at\n" +
      "Tasks are saved in this browser.",
    followUps: ["How do reminders work?", "What can the Timer do?", "Is my data private?"],
  },
  {
    id: "app-reminders",
    title: "Reminders — timed alerts with sound",
    app: "reminders",
    keywords: ["reminder", "reminders", "alert", "alarm", "notification", "notify", "ring", "sound", "schedule", "wake", "remind me"],
    answer:
      "Reminders fire at a time you set and ring with a notification sound you choose from the picker.\n" +
      "• Alerts are workspace-wide — they still fire while you are in another app\n" +
      "• The alert shows on screen with the sound, so you don't need to keep the tab in front\n" +
      "• Reminders are stored locally; keep the browser open for them to ring",
    followUps: ["What can the Timer do?", "How do Todos work?"],
  },
  {
    id: "app-timer",
    title: "Timer — countdown, stopwatch and pomodoro",
    app: "timer",
    keywords: ["timer", "countdown", "stopwatch", "lap", "pomodoro", "focus", "break", "minutes", "egg timer", "interval"],
    answer:
      "Three time tools in one app:\n" +
      "• Countdown — run several timers at once\n" +
      "• Stopwatch — count up with laps\n" +
      "• Pomodoro — focus and break cycles\n" +
      "Timing runs on absolute timestamps, so timers keep counting and still alert while another app is on screen.",
    followUps: ["How do reminders work?", "How do Todos work?"],
  },
  {
    id: "app-system",
    title: "System Info — device and browser report",
    app: "system",
    keywords: ["system", "device", "hardware", "cpu", "gpu", "memory", "ram", "battery", "screen", "resolution", "browser", "specs", "diagnostics", "report", "capabilities"],
    answer:
      "System Info reads everything your browser will reveal about this machine and presents it as a live dashboard plus an exportable report.\n" +
      "• CPU, memory, GPU, screen, battery, storage and network details\n" +
      "• A feature matrix of what this browser supports\n" +
      "• Live meters that update as you watch\n" +
      "• A short nearby-devices panel; the full scanner is its own app, Nearby Devices\n" +
      "Nothing is sent anywhere — it's all read locally.",
    followUps: ["What can Nearby Devices do?", "How do I test my internet speed?", "Is my data private?"],
  },
  {
    id: "app-resources",
    title: "Resource Monitor — what uses your camera, mic, storage and data",
    app: "resources",
    keywords: ["resource monitor", "resources", "permissions", "permission", "app permissions", "site permissions", "allowed", "blocked", "camera permission", "microphone permission", "what uses my camera", "what is using my microphone", "is my camera on", "screen recording", "screen capture", "voice recording", "location", "geolocation", "location tracking", "tracking", "trackers", "fingerprint", "fingerprinting", "do not track", "cookies", "storage usage", "how much storage", "ram usage", "memory usage", "data usage", "privacy monitor", "privacy dashboard", "who is watching"],
    answer:
      "Resource Monitor shows what is using this device, and which app in the workspace is doing it. Four views:\n" +
      "• Live — open the camera, microphone, screen capture or a location watch and see exactly what a site gets: the picture, the level, the source, how long it has been held, and one button to release it. Alongside it, live meters for memory, storage, processor, battery, network and data pulled\n" +
      "• Access — every resource a site can ask for, with this browser's current answer (allowed, blocked or asks first) and which apps here would ever use it\n" +
      "• Apps — every app broken out of the single browser origin they share, each with the resources it can reach and the storage it is actually holding\n" +
      "• Privacy — the signals your browser sends, every host this page has contacted, what is stored on the device, and the long list of things any site can read with no prompt at all\n" +
      "It only reads: nothing is written, deleted or uploaded, and anything it opens is released the moment you switch apps. A web page can only see its own use of the camera, mic, screen and location, so it reports on OneApp — not on your other tabs or other applications.",
    followUps: ["Which apps use my camera?", "Is my data private?", "What does System Info show?"],
  },
  {
    id: "app-nearby",
    title: "Nearby Devices — scan around you and read what each device is",
    app: "nearby",
    keywords: ["nearby", "nearby devices", "scan devices", "scan for devices", "device scanner", "find devices", "what devices are around", "devices available to connect", "connect to device", "connect bluetooth device", "pair device", "disconnect device", "open serial port", "baud rate", "bluetooth", "bluetooth devices", "ble", "ble scan", "gatt", "usb", "usb device", "hid", "serial", "com port", "peripherals", "connected devices", "gamepad", "gamepad tester", "controller", "controller tester", "test my controller", "webcam resolution", "camera capabilities", "microphone sample rate", "cast", "chromecast", "signal strength", "rssi", "firmware version", "battery level of device"],
    answer:
      "Nearby Devices finds the hardware around this machine, tells you what each piece of it actually is, and connects to the ones that can hold a link.\n" +
      "• Scan — a button per transport (Bluetooth, USB, HID, serial) opens the browser's own picker; attached microphones, cameras, speakers and controllers appear on their own\n" +
      "• Available to connect — every Bluetooth, USB, HID and serial device you've picked, each with a Connect button, live link state, how long it has been connected, and Disconnect (serial ports let you choose the baud rate first)\n" +
      "• Live BLE scan — on Chrome with experimental web features on, it streams every advertisement in range with its signal strength\n" +
      "• Full spec sheet per device — USB configurations, interfaces and endpoints, HID collections and report layouts, camera resolutions and frame rates, microphone sample rates and channels\n" +
      "• Bluetooth features — connect on request to read the GATT services, characteristics, firmware and hardware revisions and battery level\n" +
      "• Controllers — a live view of every button and stick, which is the quickest way to test a gamepad\n" +
      "• Copy report — the whole inventory as text, for a ticket or a note\n" +
      "A web page can't sweep the airwaves by itself: each scan opens the browser's own chooser and only the device you pick becomes visible. Everything is read on-device and nothing is uploaded. A device is only opened when you press Connect, no data is ever written to it, and every link closes when you disconnect or leave the page.",
    followUps: ["What does System Info show?", "Is my data private?", "Which apps need internet?"],
  },
  {
    id: "app-speed",
    title: "Network Speed — measure your connection",
    app: "speed",
    keywords: ["speed", "speed test", "internet", "download", "upload", "ping", "jitter", "latency", "mbps", "bandwidth", "connection", "wifi"],
    answer:
      "Network Speed measures download and upload throughput plus ping and jitter, shows your connection details, and keeps a history of past runs so you can compare.\n" +
      "This one needs a live connection — it works by moving real data.",
    followUps: ["What does System Info show?", "Which apps need internet?"],
  },
  {
    id: "app-news",
    title: "News — headlines by category",
    app: "news",
    keywords: ["news", "headlines", "articles", "tech news", "software engineering", "programming", "developer news", "sports", "national", "international", "kerala", "state", "local", "world", "feed", "rss"],
    answer:
      "News pulls current headlines into seven tabs: Tech, Software Engineering, Sports, National, International, State (Kerala) and Local.\n" +
      "• Each card shows the source and how recently it was published, and opens the full article\n" +
      "• Results are paginated and refresh on demand\n" +
      "This is the one app that always needs a connection.",
    followUps: ["Which apps need internet?", "List all the apps"],
  },
  {
    id: "app-streams",
    title: "Streams — music and live channels from YouTube",
    app: "streams",
    keywords: ["streams", "youtube", "youtube music", "music", "song", "songs", "play music", "listen", "radio", "live", "live stream", "live streaming", "live tv", "lofi", "playlist", "watch a video", "bollywood", "malayalam songs"],
    answer:
      "Streams plays music and live channels from YouTube inside the workspace, in four sections:\n" +
      "• Music — stations by genre and language scene (Lo-fi, Top hits, Bollywood, Malayalam, Tamil, Chill, Classical, Jazz, Rock, EDM and more)\n" +
      "• Live — channels broadcasting right now: music radio, world and Indian news, sports, nature, space and study rooms\n" +
      "• Search — anything on YouTube, filtered to everything, music, or live only\n" +
      "• Library — what you saved and a short trail of what you played, both kept on this device\n" +
      "Each station is a saved search rather than a pinned video, so it keeps working as streams start and end. The player shrinks to a bar while you browse and keeps playing, and stops when you leave the app. Playback is YouTube's own embed on its own domain, so views count for the creator; nothing is downloaded or re-hosted. It needs a connection.",
    followUps: ["Which apps need internet?", "How do I check the news?", "List all the apps"],
  },
  {
    id: "app-world",
    title: "World Clock — live times, countries and their news",
    app: "world",
    keywords: ["world clock", "world time", "time zone", "timezone", "utc", "gmt", "offset", "what time is it", "time difference", "daylight saving", "dst", "meeting across time zones", "country", "capital", "currency", "population", "dialling code", "specialities", "known for"],
    answer:
      "World Clock shows the time anywhere, and the country behind each clock, across three views:\n" +
      "• Clocks — your time leads a board of pinned cities; each card gives the live time, the offset from you, a Tomorrow/Yesterday badge when the date differs, and whether it's a sociable hour to call\n" +
      "• Country — capital, population, area, currency, languages, dialling code, driving side, domain and time zone, plus a short profile and what the country is known for\n" +
      "• News — the latest headlines from that country, in English\n" +
      "A time-shift slider moves every clock together by up to ±12 hours for planning a call. Search cities by name, former name, country, capital or zone. Only the headlines need a connection — the clocks and country details work offline.",
    followUps: ["Which apps need internet?", "How do I check the news?", "List all the apps"],
  },
  {
    id: "app-malayalam",
    title: "Malayalam Writer — three ways to write Malayalam",
    app: "malayalam",
    keywords: ["malayalam", "manglish", "transliteration", "keyboard", "handwriting", "ink", "type malayalam", "script", "kerala language", "write malayalam"],
    answer:
      "Malayalam Writer composes Malayalam text three ways, all feeding one saved document:\n" +
      "• Manglish — type phonetically in English letters and it transliterates as you go\n" +
      "• Keyboard — tap an on-screen Malayalam layout\n" +
      "• Handwriting — draw characters and have them recognised as text\n" +
      "Copy the result or download it. Typing and the keyboard work offline; handwriting recognition uses the network.",
    followUps: ["How do I translate text?", "Does it work offline?"],
  },
  {
    id: "app-translate",
    title: "Translate — online or fully offline",
    app: "translate",
    keywords: ["translate", "translation", "translator", "language", "languages", "offline translation", "on-device", "detect language", "swap"],
    answer:
      "Translate converts text between languages and can run without a network.\n" +
      "• Offline — the browser's built-in AI translates on-device; nothing leaves your machine once the language pack has downloaded (latest Chrome and Edge)\n" +
      "• Online — a network service that auto-detects the source language\n" +
      "• Auto — on-device when a pack is already installed, otherwise online\n" +
      "Swap the two languages in one tap to translate back.",
    followUps: ["What can Malayalam Writer do?", "Which apps need internet?"],
  },
  {
    id: "app-morse",
    title: "Morse Code — learn it, practise it, send it",
    app: "morse",
    keywords: ["morse", "morse code", "sos", "dots and dashes", "dot", "dash", "dit", "dah", "telegraph", "cw", "wpm", "learn morse", "morse translator", "prosign"],
    answer:
      "Morse Code is four tools over one signal engine:\n" +
      "• Learn — a tappable chart of every letter, number, punctuation mark and prosign; each one plays, and shows its rhythm as \"di-DAH\"\n" +
      "• Practice — a four-choice drill that asks more about the characters you get wrong, and keeps a mastery score per character\n" +
      "• Translate — text to Morse and back, with the message playable and copyable\n" +
      "• Key — hold a pad (or the space bar) and it decodes your own timing into letters\n" +
      "Speed runs 5–30 WPM and the pitch is adjustable; every signal comes out as sound, an on-screen lamp and optional vibration, so you can practise silently. It all works offline — the tone is synthesized in the browser.",
    followUps: ["Does it work offline?", "List all the apps"],
  },
  {
    id: "app-sound",
    title: "Sound Meter — measure sound frequency and loudness",
    app: "sound",
    keywords: ["sound", "sound meter", "frequency", "sound frequency", "hz", "hertz", "khz", "pitch", "note", "cents", "tuner", "tune a guitar", "tune an instrument", "decibel", "decibels", "db", "dbfs", "spl", "loudness", "volume level", "noise", "noise level", "spectrum", "spectrum analyzer", "fft", "waveform", "oscilloscope", "microphone", "mic", "measure sound"],
    answer:
      "Sound Meter turns your microphone into four measurements at once:\n" +
      "• Frequency — the fundamental in Hz, tracked by autocorrelation from 50 Hz to 2 kHz, plus the loudest tone present\n" +
      "• Pitch — the nearest musical note and how many cents sharp or flat it is, so it works as an instrument tuner; the reference A can be set from 415 to 444 Hz\n" +
      "• Level — RMS and peak loudness in dBFS with a peak hold and clipping warning, and a rough dB SPL estimate you can calibrate\n" +
      "• Spectrum and waveform — a live 20 Hz–20 kHz log spectrum (point at a spike to read its frequency) or a time-domain scope\n" +
      "Nothing is recorded, saved or uploaded: audio is analysed frame by frame in the browser and thrown away, and the microphone is released the moment you stop or switch apps. It works fully offline — but it does need microphone permission, and accuracy is limited by your mic.",
    followUps: ["Is my data private?", "What does System Info show?", "List all the apps"],
  },
  {
    id: "app-color",
    title: "Color Lens — read any colour out of a picture",
    app: "color",
    keywords: ["color", "colour", "color lens", "colour lens", "color picker", "colour picker", "pick a color", "pick a colour", "eyedropper", "eye dropper", "dropper", "hex", "hex code", "hex color", "rgb", "rgba", "hsl", "hsb", "hsv", "cmyk", "lab", "lch", "color code", "colour code", "what color is this", "what colour is this", "color from photo", "colour from photo", "color from image", "identify color", "color name", "colour name", "palette", "color palette", "dominant colors", "swatch", "swatches", "color scheme", "complementary", "analogous", "triadic", "tint", "shade", "contrast", "contrast ratio", "wcag", "accessible colors", "camera color"],
    answer:
      "Color Lens tells you exactly what a colour is. Attach a photo, drop or paste one, or take one with your camera, then tap anywhere on the picture.\n" +
      "• Every code for the point you tapped — HEX, RGB, HSL, HSB, CMYK, LAB, LCH, XYZ and luminance — each one tap to copy\n" +
      "• The nearest real colour name, out of the 148 CSS colours\n" +
      "• A magnifier shows the exact pixels, and you can average a 3×3 or 5×5 block instead of one pixel when the photo is grainy\n" +
      "• Contrast against white and black, graded pass/fail to WCAG AA and AAA, so you know if the colour is usable as text\n" +
      "• The whole image's palette — 4 to 12 dominant colours with how much of the picture each covers — exportable as a hex list, CSS variables, a Tailwind theme block, SCSS or JSON\n" +
      "• Matching schemes from any pick: complementary, analogous, triadic, split, tetradic, monochromatic, plus a tints-and-shades ramp\n" +
      "You can also just type a hex code in to look it up. The picture is decoded on your device and never uploaded, so it all works offline — the camera needs permission, and it's released as soon as you capture or close the viewfinder.",
    followUps: ["Is my data private?", "What can Image Studio do?", "List all the apps"],
  },
  {
    id: "app-clone",
    title: "Clone — copy a whole device onto another one",
    app: "clone",
    keywords: ["clone", "clone my device", "system clone", "copy my device", "copy everything", "new phone", "new laptop", "new computer", "switching devices", "switching phones", "migrate", "migration", "move everything to my new device", "set up my new device", "transfer over a cable", "usb cable transfer", "usb tethering", "copy data without internet", "transfer without wifi", "move my whole workspace", "same data on both devices", "replace my old device"],
    answer:
      "Clone copies this entire workspace — every app's data and every setting — onto another device, down whichever route you have.\n" +
      "• By cable — plug the two together and turn on USB tethering; the wire becomes a private network and the whole clone crosses in seconds, with no router, no internet and nothing else involved. If the cable can't carry a network, write a clone file to a USB drive or memory card and read it back on the other side\n" +
      "• Over a network — the same direct link on one Wi-Fi. If the devices are on different networks, tick that box and a public STUN server is asked one question (what address this device looks like from outside); it never sees the clone\n" +
      "• Without a network — the clone becomes a loop of QR codes and the other device reads them off this screen with its camera. No wire, no Wi-Fi, no internet at all\n" +
      "• Before anything is written, the receiving device shows where the clone came from, what it holds app by app, and exactly what would change here — what arrives, what gets replaced, and what would be deleted\n" +
      "• Two ways to land it: add it alongside what's already on the device, or make the device identical, which deletes anything the clone doesn't carry\n" +
      "• Every clone carries a checksum and is verified whole before a single item is written, and the sending device gets a receipt saying what actually landed\n" +
      "There's no server and no account anywhere in this: the clone goes straight from one device to the other. Handoff is the smaller version — a chosen app or two, by camera — where Clone moves the lot.",
    followUps: ["How do I back up my work?", "Is my data private?", "What is Handoff?"],
  },
  {
    id: "app-assistant",
    title: "The Assistant — how this guide works",
    app: "assistant",
    keywords: ["assistant", "agent", "ai", "chatbot", "guide", "help", "commands", "command", "do it for me", "how do you work", "what can you do", "api key", "model", "who are you"],
    answer:
      "I'm the workspace guide: ask what OneApp can do and I'll answer, then offer a button that takes you straight there.\n" +
      "• Tell me to do it and I will — \"open the timer\", \"go to PDF merge\", \"turn on dark mode\", \"open settings\", \"clear the chat\"\n" +
      "• I answer from a built-in description of every app — no API key, no account, no cost\n" +
      "• If your browser has a built-in on-device AI model, I use it to phrase answers naturally; otherwise the bundled engine answers. Either way the work happens on your device\n" +
      "• Your questions never leave the browser, and the conversation is saved locally so it's still here when you return",
    followUps: ["List all the apps", "What is OneApp?", "Is my data private?"],
  },

  {
    id: "app-walk",
    title: "Walkaround — a guided tour of any app",
    app: "walk",
    keywords: ["walkaround", "walk around", "tour", "guided tour", "walkthrough", "tutorial", "onboarding", "show me around", "show me how", "take me through", "how do i use this", "where is", "tips", "tooltips", "getting started", "new here", "learn the app", "what can this app do"],
    answer:
      "Walkaround shows you round an app instead of telling you about it. Pick any app and it plays a short guided tour of that one.\n" +
      "• Each stop is a tooltip on a drawing of that app's screen — its header, its working area, its tabs — pointing at one control and saying where it is and what it does\n" +
      "• Every stop also carries a suggestion: the shortcut, the combination or the caveat you would otherwise find out on your third visit\n" +
      "• Step with the arrow keys, or tap a numbered pin to jump straight to a stop; the whole tour is written out underneath the drawing as well\n" +
      "• Open takes you into the real app when you have read it, and finishing a tour ticks that app off, so you can see which ones you have been shown\n" +
      "It only ever reads: nothing you do here changes the app it is describing, and it works offline like the rest of the workspace.",
    followUps: ["List all the apps", "What is OneApp?", "How do I switch apps?"],
  },

  {
    id: "app-satellite",
    title: "Satellite Map — anywhere on Earth from above, live",
    app: "satellite",
    keywords: ["satellite map", "satellite", "satellite view", "map", "maps", "aerial", "from above", "see my house", "street view", "streetview", "ground level", "street map", "terrain", "coordinates", "latitude", "longitude", "gps", "where am i", "my location", "find a place", "rain radar", "weather radar", "is it raining", "cloud cover", "weather map", "live weather", "nowcast"],
    answer:
      "Satellite Map shows any place on Earth from above, with what is happening over it right now drawn on top.\n" +
      "• Three views of the ground — Satellite (photographic imagery), Streets, and Terrain — plus an optional sheet of place names and borders over any of them\n" +
      "• Two current layers: rain radar, re-published every ten minutes with a short forecast ahead where one exists, and NASA's true-colour mosaic of the whole planet, rebuilt daily — the last week of it\n" +
      "• Either one is a run of time-stamped frames you can play as an animation or scrub by hand; the app says how old the newest measured frame is, and marks forecast frames as forecast rather than letting them pass as observations\n" +
      "• Search a place by name, or paste coordinates — coordinates are resolved on the device without asking anyone. You can also ask what is under the middle of the map, and keep places for next time\n" +
      "• Locate me finds where you are and puts you on the map with an accuracy circle, reporting speed, heading, altitude and how old the fix is; it can then keep the map centred as you move, until you drag the map yourself. It's on the map's own controls, in Find, and in Live\n" +
      "• Street View opens the ground-level panorama for a point — from the map's corner, from a pin, or from where you are standing. It's a link out to Google rather than a viewer inside the app, because every keyless open source of street-level photos (KartaView and the like) has almost no coverage left — nothing within five kilometres of most Indian cities. Only the coordinates go with the link\n" +
      "One thing worth being clear about: the imagery underneath is a photograph, months or years old — no public satellite service streams the ground in real time. What is genuinely live here is the weather over it and your own position.\n" +
      "Your position is never stored and never sent anywhere, and leaving the app stops the location watch. Map tiles, place search and the live layers all need a connection.",
    followUps: ["Which apps need internet?", "Is my data private?", "What is the World Clock?"],
  },

  // ── Cross-cutting how-tos ────────────────────────────────────────────────
  {
    id: "network-needs",
    title: "Which apps need an internet connection",
    keywords: ["internet", "connection", "network", "need wifi", "which apps need internet", "works offline", "online only"],
    answer:
      "Only these need a connection:\n" +
      "• Streams — the music and live channels come from YouTube\n" +
      "• News — headlines are fetched live\n" +
      "• Satellite Map — map tiles, place search and the live weather layers all come from elsewhere\n" +
      "• Network Speed — it measures a real connection\n" +
      "• Online translation — offline mode avoids this entirely\n" +
      "• Malayalam handwriting recognition — typing and the keyboard don't\n" +
      "Everything else, including all PDF, image, note, task and timer work, runs fully offline.",
    followUps: ["Does it work offline?", "Is my data private?"],
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    keywords: ["shortcut", "shortcuts", "keyboard", "hotkey", "keys", "escape", "undo", "redo"],
    answer:
      "On the Sketchnotes canvas: V select, P pen, E eraser, L line, A arrow, with the usual undo/redo.\n" +
      "Anywhere: Escape closes the launcher, Settings and other overlays, and every control is reachable by Tab with a visible focus ring.",
    followUps: ["What can Sketchnotes do?", "How do I switch apps?"],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    keywords: ["accessibility", "a11y", "screen reader", "keyboard only", "contrast", "reduced motion", "aria", "focus"],
    answer:
      "The workspace is built to WCAG AA: semantic markup, labelled controls, full keyboard reach with visible focus, theme palettes that hold contrast, and respect for your reduced-motion setting.",
    followUps: ["What are the keyboard shortcuts?", "How do I change the theme?"],
  },
];

/** Fast id → entry lookup. */
export const KNOWLEDGE_BY_ID = new Map(KNOWLEDGE.map((e) => [e.id, e]));

/** How many apps the workspace has — derived, so copy can't drift from reality. */
export const APP_IDS_COUNT = Object.keys(APP_LABELS).length;

/** Opening questions offered on an empty conversation. */
export const STARTER_QUESTIONS = [
  "What is OneApp?",
  "List all the apps",
  "How do I merge PDFs?",
  "Is my data private?",
  "Does it work offline?",
  "How do I change the theme?",
];
