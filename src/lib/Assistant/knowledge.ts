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
  speed: "Network Speed",
  news: "News",
  world: "World Clock",
  malayalam: "Malayalam Writer",
  translate: "Translate",
  morse: "Morse Code",
  sound: "Sound Meter",
  color: "Color Lens",
  assistant: "Assistant",
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
  system: ["system info", "system", "device info", "hardware", "specs", "nearby devices"],
  speed: ["network speed", "speed test", "speedtest", "internet speed", "bandwidth"],
  news: ["news", "headlines", "newspaper"],
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
  assistant: ["assistant", "guide", "ai agent", "helper", "chatbot"],
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

/** One-line summary per app, used when listing the whole workspace. */
export const APP_SUMMARIES: Record<AppId, string> = {
  sketchnotes: "draw and write on an infinite canvas, with many saved notes",
  pdf: "ten PDF tools — edit, merge, split, organise, convert, watermark and more",
  image: "crop, resize, compress and convert images to any upload limit",
  board: "a page you build by typing — add, edit and remove sections in plain English",
  todos: "tasks framed by day, week, month and year",
  reminders: "timed alerts that ring with a sound you pick",
  timer: "countdown timers, a lap stopwatch and pomodoro cycles",
  system: "a live report on this device, browser and hardware, plus a nearby-device scan",
  speed: "download, upload, ping and jitter measurement",
  news: "headlines by category — tech, software engineering, sports, national, state, local, world",
  world: "live time in cities worldwide, with each country's facts, specialities and news",
  malayalam: "type Malayalam by Manglish, on-screen keyboard or handwriting",
  translate: "translate text online, or fully offline on-device",
  morse: "learn, practise and send Morse code — chart, drills, translator and a key",
  sound: "measure sound frequency, musical pitch and loudness from the microphone",
  color: "read any colour out of a photo — every code, its name, contrast and palette",
  assistant: "this guide — ask what the workspace can do",
};

export const KNOWLEDGE: KnowledgeEntry[] = [
  // ── Workspace-level ──────────────────────────────────────────────────────
  {
    id: "overview",
    title: "What OneApp is",
    keywords: ["oneapp", "one app", "overview", "about", "what is this", "workspace", "summary", "purpose", "intro"],
    answer:
      "OneApp is a single web workspace holding seventeen tools, so you never install seventeen apps.\n" +
      "• Creative: Sketchnotes canvas, Image Studio, PDF Editor\n" +
      "• Planning: Board, Todos, Reminders, Timer\n" +
      "• Info: News, World Clock, System Info, Network Speed, Sound Meter, Color Lens\n" +
      "• Language: Translate, Malayalam Writer, Morse Code, and me — the Assistant\n" +
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
      "• All seventeen apps are downloaded in the background on a healthy connection; to force it (before a flight, say) open Settings → Offline → Save all apps for offline\n" +
      "• Install it from your browser's Install / Add to Home Screen option to get an app icon and its own window\n" +
      "• Fully offline: Sketchnotes, PDF Editor, Image Studio, Board, Todos, Reminders, Timer, System Info, Sound Meter, Color Lens, World Clock (clocks and country details), Malayalam typing/keyboard, on-device Translate, and me\n" +
      "• Needs a connection: News and World Clock headlines (saved ones still open), online translation (past phrases still open), handwriting recognition and the speed test\n" +
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
    keywords: ["theme", "themes", "dark mode", "light mode", "colour", "color", "appearance", "settings", "night", "palette"],
    answer:
      "Open Settings from the bottom of the app launcher to pick a theme. Eight are included:\n" +
      "• Light, Ocean, Sunset, Grape, Rose and Forest (light)\n" +
      "• Dark and Midnight (dark)\n" +
      "The choice applies to every app at once and is remembered on this device. Or just tell me — \"switch to Ocean\" — and I'll set it for you.",
    followUps: ["How do I switch apps?", "How do I change the mouse pointer?"],
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
      "Because data is per-browser, a JSON export is how you move notes to another device.",
    followUps: ["Is my data private?", "What can Sketchnotes do?"],
  },
  {
    id: "mobile",
    title: "Mobile and touch support",
    keywords: ["mobile", "phone", "tablet", "ipad", "touch", "responsive", "stylus", "pen", "finger", "small screen"],
    answer:
      "Every screen is designed mobile-first and reflows down to about 360px wide, so all seventeen tools work on a phone.\n" +
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
    keywords: ["system", "device", "hardware", "cpu", "gpu", "memory", "ram", "battery", "screen", "resolution", "browser", "specs", "diagnostics", "report", "capabilities", "nearby devices", "nearby", "scan devices", "scan for devices", "bluetooth", "ble", "usb", "hid", "serial", "peripherals", "gamepad", "cast", "chromecast", "connected devices"],
    answer:
      "System Info reads everything your browser will reveal about this machine and presents it as a live dashboard plus an exportable report.\n" +
      "• CPU, memory, GPU, screen, battery, storage and network details\n" +
      "• A feature matrix of what this browser supports\n" +
      "• Live meters that update as you watch\n" +
      "• Nearby devices — scan for Bluetooth, USB, HID and serial devices, list attached microphones, cameras and gamepads, and check for cast-capable displays on your network\n" +
      "Nothing is sent anywhere — it's all read locally.",
    followUps: ["How do I test my internet speed?", "Is my data private?"],
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

  // ── Cross-cutting how-tos ────────────────────────────────────────────────
  {
    id: "network-needs",
    title: "Which apps need an internet connection",
    keywords: ["internet", "connection", "network", "need wifi", "which apps need internet", "works offline", "online only"],
    answer:
      "Only four things need a connection:\n" +
      "• News — headlines are fetched live\n" +
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
