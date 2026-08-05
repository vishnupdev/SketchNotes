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
  todos: "Todos",
  reminders: "Reminders",
  timer: "Timer",
  system: "System Info",
  speed: "Network Speed",
  news: "News",
  malayalam: "Malayalam Writer",
  translate: "Translate",
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
  todos: ["todos", "todo", "to-do", "tasks", "task list", "planner"],
  reminders: ["reminders", "reminder", "alerts", "alarm", "alarms"],
  timer: ["timer", "timers", "stopwatch", "pomodoro", "countdown"],
  system: ["system info", "system", "device info", "hardware", "specs"],
  speed: ["network speed", "speed test", "speedtest", "internet speed", "bandwidth"],
  news: ["news", "headlines", "newspaper"],
  malayalam: ["malayalam writer", "malayalam", "manglish", "മലയാളം"],
  translate: ["translate", "translator", "translation"],
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
  todos: "/todos",
  reminders: "/reminders",
  timer: "/timer",
  system: "/system",
  speed: "/speedtest",
  news: "/news",
  malayalam: "/malayalam",
  translate: "/translate",
  assistant: "/assistant",
};

/** One-line summary per app, used when listing the whole workspace. */
export const APP_SUMMARIES: Record<AppId, string> = {
  sketchnotes: "draw and write on an infinite canvas, with many saved notes",
  pdf: "ten PDF tools — edit, merge, split, organise, convert, watermark and more",
  image: "crop, resize, compress and convert images to any upload limit",
  todos: "tasks framed by day, week, month and year",
  reminders: "timed alerts that ring with a sound you pick",
  timer: "countdown timers, a lap stopwatch and pomodoro cycles",
  system: "a live report on this device, browser and hardware",
  speed: "download, upload, ping and jitter measurement",
  news: "headlines by category — tech, sports, national, state, local, world",
  malayalam: "type Malayalam by Manglish, on-screen keyboard or handwriting",
  translate: "translate text online, or fully offline on-device",
  assistant: "this guide — ask what the workspace can do",
};

export const KNOWLEDGE: KnowledgeEntry[] = [
  // ── Workspace-level ──────────────────────────────────────────────────────
  {
    id: "overview",
    title: "What OneApp is",
    keywords: ["oneapp", "one app", "overview", "about", "what is this", "workspace", "summary", "purpose", "intro"],
    answer:
      "OneApp is a single web workspace holding twelve tools, so you never install twelve apps.\n" +
      "• Creative: Sketchnotes canvas, Image Studio, PDF Editor\n" +
      "• Planning: Todos, Reminders, Timer\n" +
      "• Info: News, System Info, Network Speed\n" +
      "• Language: Translate, Malayalam Writer, and me — the Assistant\n" +
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
      "• All twelve apps are downloaded in the background on a healthy connection; to force it (before a flight, say) open Settings → Offline → Save all apps for offline\n" +
      "• Install it from your browser's Install / Add to Home Screen option to get an app icon and its own window\n" +
      "• Fully offline: Sketchnotes, PDF Editor, Image Studio, Todos, Reminders, Timer, System Info, Malayalam typing/keyboard, on-device Translate, and me\n" +
      "• Needs a connection: News (saved headlines still open), online translation (past phrases still open), handwriting recognition and the speed test\n" +
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
    followUps: ["How do I switch apps?", "What is OneApp?"],
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
      "Every screen is designed mobile-first and reflows down to about 360px wide, so all twelve tools work on a phone.\n" +
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
    keywords: ["news", "headlines", "articles", "tech news", "sports", "national", "international", "kerala", "state", "local", "world", "feed", "rss"],
    answer:
      "News pulls current headlines into six tabs: Tech, Sports, National, International, State (Kerala) and Local.\n" +
      "• Each card shows the source and how recently it was published, and opens the full article\n" +
      "• Results are paginated and refresh on demand\n" +
      "This is the one app that always needs a connection.",
    followUps: ["Which apps need internet?", "List all the apps"],
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
