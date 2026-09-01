import type { AppId } from "@/store/useWorkspaceStore";
import type { Tour } from "./types";

/**
 * The walkarounds themselves — one guided tour per app in the workspace.
 *
 * Every step answers the same two questions: *where is the thing*, and *what is
 * worth doing with it that the screen doesn't say*. The second is the point. A
 * tour that only names what is already labelled wastes the reader's time; the
 * suggestions here are the shortcut, the combination or the caveat you would
 * otherwise find out on your third visit.
 *
 * The facts come from the same verified source the Assistant answers from
 * (`lib/Assistant/knowledge.ts`) and from each app's own screen, so nothing
 * described here is invented. `Record<AppId, Tour>` is deliberate: a new app is
 * a type error until someone has walked around it (CLAUDE.md rule #4).
 */
export const TOURS: Record<AppId, Tour> = {
  sketchnotes: {
    tagline: "notes on an infinite canvas",
    intro: "The home canvas — its tools, its drawer of notes, and how work leaves it.",
    layout: {
      blocks: [
        { label: "Toolbar", grow: 0.5 },
        { label: "Infinite canvas", grow: 3.2 },
        { label: "Notes", span: 1 },
        { label: "Export", span: 1 },
      ],
    },
    steps: [
      {
        at: "brand",
        title: "The way home",
        direction:
          "Every app's header carries this block, and tapping it brings you back to this canvas.",
        suggestion:
          "The canvas is the workspace's root address, so a bookmark of the bare domain opens straight into it.",
      },
      {
        at: "body:0",
        title: "Pick a tool",
        direction:
          "The toolbar holds select, pen, eraser, line, arrow, shapes, emoji stickers and text, with stroke colour and width beside them.",
        suggestion:
          "Skip the trip to the toolbar entirely — V, P, E, L and A switch tool from the keyboard.",
      },
      {
        at: "body:1",
        title: "Draw anywhere",
        direction:
          "The surface has no edges: drag to pan, scroll or pinch to zoom, and it takes a finger or a stylus as readily as a mouse.",
        suggestion:
          "Zoom out before you start a diagram and lay the whole thing out — there is no page edge to run off.",
      },
      {
        at: "body:2",
        title: "Keep many notes",
        direction:
          "The drawer holds every note you have made and switches between them without losing your place in the one you are on.",
        suggestion:
          "One note per topic beats one enormous canvas; each remembers its own pan and zoom.",
      },
      {
        at: "body:3",
        title: "Take it with you",
        direction:
          "A note exports as PNG, JPG, WebP, SVG, PDF, Word, or a JSON backup you can re-import later.",
        suggestion:
          "Keep the JSON. It comes back as an editable note, where every other format comes back as a picture.",
      },
      {
        at: "apps",
        title: "Everything else",
        direction:
          "The Apps button opens the launcher, and it sits in this same corner in every app here.",
        suggestion:
          "Ctrl/⌘ + K is faster — type a few letters of an app, a PDF tool or a theme and go straight there.",
      },
    ],
  },

  assistant: {
    tagline: "your guide to every app here",
    intro: "Ask what the workspace can do — then tell it to do things for you.",
    layout: {
      blocks: [
        { label: "Conversation", grow: 3 },
        { label: "Ask anything", grow: 0.8 },
        { label: "Take me there", span: 1 },
        { label: "Device / local engine", span: 1 },
      ],
    },
    steps: [
      {
        at: "body:1",
        title: "Ask in your own words",
        direction:
          "Type a question about any app — “how do I merge PDFs”, “which apps need internet” — and it answers from a built-in description of the workspace.",
        suggestion:
          "No API key and no account. Nothing you type leaves the browser, so it answers offline too.",
      },
      {
        at: "body:0",
        title: "It also acts",
        direction:
          "Instructions work as well as questions: “open the timer”, “go to PDF merge”, “turn on dark mode”, “open settings”, “clear the chat”.",
        suggestion:
          "This is the quickest way into a deep link you can't remember — ask for the tool by name and let it navigate.",
      },
      {
        at: "body:2",
        title: "One tap to the app",
        direction:
          "Answers come with buttons that take you straight to the app, or the PDF section, being described.",
        suggestion:
          "Follow the chips under a reply — they are the questions people ask next, already written out.",
      },
      {
        at: "body:3",
        title: "Two brains",
        direction:
          "If your browser has a built-in on-device model it phrases answers naturally; otherwise a bundled retrieval engine answers. Either way the work happens on your device.",
        suggestion:
          "The badge on a reply says which one answered, so you know when you are reading quoted facts rather than rephrased ones.",
      },
    ],
  },

  pdf: {
    tagline: "every PDF tool, on one sheet",
    intro: "Ten tools over one document, none of which uploads it.",
    layout: {
      blocks: [
        { label: "Ten tools", grow: 1.5 },
        { label: "The tool you opened", grow: 1.7 },
        { label: "Apply & download", grow: 0.7 },
      ],
    },
    steps: [
      {
        at: "brand",
        title: "Nothing is uploaded",
        direction:
          "Every tool here reads, changes and writes the file inside this browser — the document never leaves the machine.",
        suggestion:
          "Which is exactly why the contract you would not post to a stranger's website is fine in this one.",
      },
      {
        at: "body:0",
        title: "Pick a tool",
        direction:
          "The grid holds Edit & annotate, Merge, Split, Organize pages, Images → PDF, PDF → Images, Text → PDF, Watermark, Page numbers and Metadata.",
        suggestion:
          "Each tool has its own address — bookmark /pdfeditor/merge and you skip the grid every time.",
      },
      {
        at: "body:1",
        title: "Work the pages",
        direction:
          "Organize gives you a visual page grid: tap to select, drag to reorder, then rotate, delete or extract the selection.",
        suggestion:
          "Merge first, then Organize. Combining and fixing the order in one pass beats getting the order right up front.",
      },
      {
        at: "body:2",
        title: "Get the file back",
        direction:
          "Applying downloads a new file, and text edits, highlights and white-out are flattened in — so they survive wherever the PDF is opened next.",
        suggestion:
          "Split can burst a document into one PDF per page, the fastest way to pull a single sheet out of a scan.",
      },
    ],
  },

  image: {
    tagline: "resize, crop & compress for any upload",
    intro: "Getting a picture past an upload form's rules, without uploading it first.",
    layout: {
      blocks: [
        { label: "Your picture", grow: 2.4 },
        { label: "Crop · Resize · Compress · Convert", grow: 1 },
        { label: "Download", grow: 0.6 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Open a picture",
        direction:
          "Choose a file or drop one on the page; it is decoded in memory and nothing is stored.",
        suggestion:
          "The original is left untouched — everything here produces a new file on download.",
      },
      {
        at: "body:1",
        title: "Four operations",
        direction:
          "Crop freely or to a fixed aspect ratio, resize to exact pixel dimensions, compress toward a target file size, and convert between JPG, PNG and WebP.",
        suggestion:
          "Facing an “under 200 KB” limit? Give Compress the target size and let it find the quality, instead of guessing at a slider.",
      },
      {
        at: "body:2",
        title: "Order matters",
        direction: "Each result downloads straight to your device once you are happy with it.",
        suggestion:
          "Crop and resize before you compress. Fewer pixels means the compressor has far less to throw away.",
      },
    ],
  },

  board: {
    tagline: "your own page, built by prompting",
    intro: "A page you build by describing it, and a parser small enough to work offline.",
    layout: {
      blocks: [
        { label: "Type what you want", grow: 0.8 },
        { label: "Your sections", grow: 2.8 },
        { label: "? — every phrase it knows", grow: 0.7 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Say it in English",
        direction:
          "One field takes plain instructions — “add a counter for water with a goal of 8”, “rename groceries to shopping”, “add milk to groceries”, “check today on reading”.",
        suggestion:
          "No API key, no account, nothing sent anywhere: the parser is built into the app, so the board works with no connection.",
      },
      {
        at: "body:1",
        title: "Five kinds of section",
        direction:
          "Note, Checklist, Counter (with a goal, step and unit), Links, and Habit — a seven-day streak.",
        suggestion:
          "Every card carries buttons that do what the sentences do, so you never have to guess a phrase to get something done.",
      },
      {
        at: "body:2",
        title: "When a phrase won't take",
        direction:
          "The ? button lists every wording the parser understands, and each line in it is tappable and live.",
        suggestion:
          "“undo” walks back the last 25 changes, which makes trying an unfamiliar phrasing free.",
      },
    ],
  },

  todos: {
    tagline: "plan by day, week, month & year",
    intro: "One task list, seen at four distances.",
    layout: {
      blocks: [
        { label: "Day · Week · Month · Year", grow: 0.7 },
        { label: "Add a task", grow: 0.7 },
        { label: "Your tasks", grow: 2.6 },
        { label: "Filter & search", span: 1 },
        { label: "Stats for this period", span: 1 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Four framings, one list",
        direction:
          "Day, Week, Month and Year are views of the same tasks, not separate lists — switching changes the window, never the contents.",
        suggestion:
          "Plan in Week and work in Day. Nothing has to be re-entered when you move between them.",
      },
      {
        at: "body:1",
        title: "Add with a due date",
        direction: "A task takes a due date, and that is what decides which periods it shows up in.",
        suggestion:
          "A task with no date stays visible whatever period you are in — useful for the ones with no deadline but a real cost.",
      },
      {
        at: "body:2",
        title: "Tick and clear",
        direction:
          "Tick a task to complete it; completed ones clear in a batch rather than one at a time.",
        suggestion:
          "Clear at the end of a period, not as you go — the stats bar is more use with the finished work still in it.",
      },
      {
        at: "body:3",
        title: "Find one task",
        direction: "Filter by status, or search by text when the list is longer than the screen.",
        suggestion:
          "Search reaches across every period, so it is the fastest way back to something you filed under the wrong month.",
      },
    ],
  },

  reminders: {
    tagline: "timed alerts with a sound you choose",
    intro: "Alerts that fire wherever you are in the workspace.",
    layout: {
      blocks: [
        { label: "New reminder", grow: 1 },
        { label: "Scheduled", grow: 2.2 },
        { label: "Alert sound", span: 1 },
        { label: "Fires app-wide", span: 1 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Set a time",
        direction: "Give the reminder a time and a label; it is saved in this browser.",
        suggestion:
          "For anything hours away, a reminder beats a timer — timers measure elapsed time, reminders hit a clock time.",
      },
      {
        at: "body:2",
        title: "Choose the sound",
        direction:
          "Pick the notification sound from the picker; each one previews as you select it.",
        suggestion:
          "Give different kinds of reminder different sounds and you learn which is which without looking.",
      },
      {
        at: "body:3",
        title: "It follows you",
        direction:
          "Reminders are workspace-wide: an alert still rings while you are drawing, editing a PDF or reading the news.",
        suggestion:
          "It needs the browser open to ring, so leave the tab running rather than closing it and trusting the alarm.",
      },
      {
        at: "body:1",
        title: "What's queued",
        direction:
          "The list shows everything scheduled, so you can retime or remove one before it fires.",
        suggestion:
          "Clearing a reminder you have already acted on keeps the list a to-do rather than a log.",
      },
    ],
  },

  timer: {
    tagline: "countdown, stopwatch & pomodoro",
    intro: "Three time tools that keep running when you leave the app.",
    layout: {
      blocks: [
        { label: "The clock", grow: 2.4 },
        { label: "Controls", grow: 0.8 },
        { label: "Several at once / laps", grow: 1 },
      ],
      tabs: ["Timer", "Stopwatch", "Pomodoro"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Countdown",
        direction: "The Timer tab counts down, and it will run several timers at the same time.",
        suggestion:
          "One per pan on the stove. They are independent, so a second timer never resets the first.",
      },
      {
        at: "tab:1",
        title: "Stopwatch",
        direction: "Counts up, with laps recorded as you go.",
        suggestion:
          "Laps are the point — take one at each step and you get a breakdown instead of just a total.",
      },
      {
        at: "tab:2",
        title: "Pomodoro",
        direction: "Runs focus and break cycles back to back, so you don't have to restart anything.",
        suggestion:
          "Pair it with Todos in the Day view: one task per focus block is the honest way to find out how long things take.",
      },
      {
        at: "body:0",
        title: "It doesn't pause when you leave",
        direction:
          "Timing runs on absolute timestamps, so a timer keeps counting — and still alerts — while another app is on screen.",
        suggestion: "Start it, switch to whatever you are actually doing, and let the alert find you.",
      },
    ],
  },

  system: {
    tagline: "analyze this device & browser",
    intro: "Everything the browser will admit about this machine, in one report.",
    layout: {
      blocks: [
        { label: "Live meters", grow: 1.2 },
        { label: "CPU · Memory · GPU · Screen", span: 1, grow: 1.6 },
        { label: "Battery · Storage · Network", span: 1, grow: 1.6 },
        { label: "Browser feature matrix", grow: 1.2 },
        { label: "Export report", grow: 0.6 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Live, not a snapshot",
        direction:
          "The meters update while you watch, so you can see load change as you use the machine.",
        suggestion:
          "Open something heavy in another tab and come back — the memory meter is the quickest proof of what a page costs.",
      },
      {
        at: "body:1",
        title: "The hardware",
        direction:
          "Processor, memory, graphics and display, read out of the browser rather than guessed at.",
        suggestion:
          "This is the panel to attach to a bug report — “works on my machine” is far more useful with the machine included.",
      },
      {
        at: "body:3",
        title: "What this browser can do",
        direction:
          "The feature matrix lists which web capabilities are present here, which is usually what explains a feature elsewhere in the workspace being unavailable.",
        suggestion:
          "If on-device Translate or the live BLE scan is missing, look here first — it is the browser, not the app.",
      },
      {
        at: "body:4",
        title: "Take the report",
        direction: "Export the whole thing as a file. It is all read locally.",
        suggestion:
          "The one part that touches the network is the public IP lookup; everything else stays on the device.",
      },
    ],
  },

  resources: {
    tagline: "what uses your camera, mic & storage",
    intro: "The answer a browser's site settings can't give: which of these apps is doing it.",
    layout: {
      blocks: [
        { label: "Live meters & held resources", grow: 2 },
        { label: "Release", grow: 0.7 },
        { label: "Per-app breakdown", grow: 1.4 },
      ],
      tabs: ["Live", "Access", "Apps", "Privacy"],
    },
    steps: [
      {
        at: "tab:0",
        title: "See what is held",
        direction:
          "Live shows the camera, microphone, screen capture or location watch as they are held — the picture, the level, the source, and how long it has been open.",
        suggestion:
          "One button releases whatever is held, which is the fastest way to put a camera light out.",
      },
      {
        at: "tab:1",
        title: "Every permission",
        direction:
          "Access lists each resource a site can ask for, this browser's current answer — allowed, blocked or asks first — and which apps here would ever use it.",
        suggestion:
          "Worth reading before you grant something: it names the apps, so you can see whether anything you use even needs it.",
      },
      {
        at: "tab:2",
        title: "Broken out per app",
        direction:
          "Apps splits the single browser origin every app here shares into one row each, with the resources it can reach and the storage it is actually holding.",
        suggestion:
          "This is where you find which app is holding the megabytes, before you go clearing site data wholesale.",
      },
      {
        at: "tab:3",
        title: "What any site can read",
        direction:
          "Privacy lists the signals your browser sends, every host this page has contacted, and the long tail of things any site reads with no prompt at all.",
        suggestion:
          "It only reads — nothing is written, deleted or uploaded — and a page can only see its own use, so this reports on this workspace, not your other tabs.",
      },
      {
        at: "apps",
        title: "Leaving releases it",
        direction:
          "Switching app unmounts this one, which hands back any camera, microphone, screen share or location watch it was holding.",
        suggestion:
          "So the monitor can never quietly become the thing worth monitoring — walk away and it lets go.",
      },
    ],
  },

  nearby: {
    tagline: "scan what's around & read its features",
    intro: "Finding the hardware around this machine, and reading what it actually is.",
    layout: {
      blocks: [
        { label: "Scan: Bluetooth · USB · HID · Serial", grow: 1 },
        { label: "Available to connect", grow: 1.6 },
        { label: "Spec sheet", grow: 1.6 },
        { label: "Copy report", grow: 0.6 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "One button per transport",
        direction:
          "Each scan button opens the browser's own device chooser; attached microphones, cameras, speakers and controllers appear on their own.",
        suggestion:
          "A page cannot sweep the airwaves by itself — only the device you pick in that chooser ever becomes visible here.",
      },
      {
        at: "body:1",
        title: "Connect and hold a link",
        direction:
          "Everything you have picked gets a Connect button, a live link state, how long it has been connected, and Disconnect. Serial ports let you set the baud rate first.",
        suggestion:
          "Nothing is opened until you press Connect, no data is ever written to a device, and every link closes when you leave.",
      },
      {
        at: "body:2",
        title: "Read the whole spec",
        direction:
          "USB configurations, interfaces and endpoints; HID collections and report layouts; camera resolutions and frame rates; microphone sample rates; Bluetooth GATT services, firmware revision and battery level.",
        suggestion:
          "Plug in a controller and the live button-and-stick view is the quickest gamepad test there is.",
      },
      {
        at: "body:3",
        title: "Paste it somewhere",
        direction: "Copy report puts the whole inventory on the clipboard as text.",
        suggestion: "Straight into a ticket. It is all read on-device and nothing is uploaded.",
      },
    ],
  },

  speed: {
    tagline: "download, upload, ping & jitter",
    intro: "A measurement that works by moving real data, so this one needs the network.",
    layout: {
      blocks: [
        { label: "Start", grow: 0.8 },
        { label: "Down · Up · Ping · Jitter", grow: 2 },
        { label: "Connection details", span: 1 },
        { label: "Past runs", span: 1 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Run it",
        direction: "One press measures download and upload throughput, then ping and jitter.",
        suggestion:
          "Close the streaming tab first. A speed test measures what is left over, not what the line can do.",
      },
      {
        at: "body:1",
        title: "Read the four numbers",
        direction:
          "Throughput is what a download will manage; ping is how long a round trip takes, and jitter is how much that varies.",
        suggestion:
          "For a call that keeps breaking up, jitter is the number to look at — not the megabits.",
      },
      {
        at: "body:3",
        title: "Compare with yourself",
        direction:
          "Past runs are kept on this device, so today's result has something to sit against.",
        suggestion:
          "Run it from the same spot each time. Moving two rooms over changes more than most faults do.",
      },
    ],
  },

  news: {
    tagline: "latest headlines, by category",
    intro: "Seven feeds, paginated — and the one hard requirement in the workspace: a connection.",
    layout: {
      blocks: [
        { label: "Tech · SE · Sports · National · International · State · Local", grow: 0.9 },
        { label: "Headlines", grow: 2.8 },
        { label: "Pages", span: 1 },
        { label: "Refresh", span: 1 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Seven categories",
        direction:
          "Tech, Software Engineering, Sports, National, International, State and Local, each its own feed.",
        suggestion:
          "Software Engineering is the one an ordinary news app doesn't carry — it is worth the tab on its own.",
      },
      {
        at: "body:1",
        title: "Source and freshness",
        direction:
          "Each card names its source and how recently it was published, and opens the full article at the publisher.",
        suggestion:
          "Check the age before you read. A feed will serve something three days old perfectly cheerfully.",
      },
      {
        at: "body:3",
        title: "When it's offline",
        direction:
          "This is the app that always needs a connection; with none, the last saved responses are served instead of an error.",
        suggestion: "Refresh once on a good connection before you go offline and you keep something to read.",
      },
    ],
  },

  streams: {
    tagline: "music and live, straight from YouTube",
    intro: "Stations, live channels, and a player that shrinks out of the way.",
    layout: {
      blocks: [
        { label: "Stations", grow: 2.4 },
        { label: "Player", grow: 1 },
      ],
      tabs: ["Music", "Live", "Search", "Library"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Stations, not videos",
        direction:
          "Music holds stations by genre and language scene — Lo-fi, Top hits, Bollywood, Malayalam, Tamil, Chill, Classical, Jazz, Rock, EDM.",
        suggestion:
          "Each station is a saved search rather than a pinned video, which is why it keeps working as streams start and end.",
      },
      {
        at: "tab:1",
        title: "On air now",
        direction:
          "Live lists channels broadcasting at this moment: music radio, world and Indian news, sports, nature, space and study rooms.",
        suggestion: "A study room in the background is the least distracting thing here by a distance.",
      },
      {
        at: "tab:3",
        title: "What you keep",
        direction:
          "Library holds what you saved and a short trail of what you played, both on this device only.",
        suggestion:
          "Search anything on YouTube in the Search tab and save the good ones — the Library is how you get back to them.",
      },
      {
        at: "body:1",
        title: "It plays while you browse",
        direction:
          "The player shrinks to a bar and keeps going while you look around, and stops when you leave the app.",
        suggestion:
          "Music deliberately doesn't follow you into another app, so keep this tab in front if you want it while you work.",
      },
    ],
  },

  world: {
    tagline: "live times, countries & their news",
    intro: "The time somewhere else, and the country behind the clock.",
    layout: {
      blocks: [
        { label: "Your time", grow: 0.9 },
        { label: "Pinned cities", grow: 2.2 },
        { label: "Time-shift slider", grow: 0.8 },
      ],
      tabs: ["Clocks", "Country", "News"],
    },
    steps: [
      {
        at: "body:1",
        title: "A board of clocks",
        direction:
          "Each card gives the live time, the offset from you, a Tomorrow or Yesterday badge when the date differs, and whether it is a sociable hour to call.",
        suggestion:
          "Search cities by name, former name, country, capital or zone — “Bombay” and “Mumbai” both land.",
      },
      {
        at: "body:2",
        title: "Move every clock at once",
        direction:
          "The time-shift slider slides all the clocks together by up to twelve hours either way.",
        suggestion:
          "This is the meeting planner: drag until three cities are all in daylight, then read the time off your own card.",
      },
      {
        at: "tab:1",
        title: "The country behind it",
        direction:
          "Capital, population, area, currency, languages, dialling code, driving side, domain and zone, plus a short profile of what the place is known for.",
        suggestion:
          "All of it is bundled, so the clocks and the country details work with no connection.",
      },
      {
        at: "tab:2",
        title: "Its headlines",
        direction: "News pulls the latest stories from that country, in English.",
        suggestion:
          "This tab is the only part of the app that needs the network — the rest is offline either way.",
      },
    ],
  },

  malayalam: {
    tagline: "type, tap or handwrite in Malayalam",
    intro: "Three ways into the same document.",
    layout: {
      blocks: [
        { label: "Your document", grow: 2.4 },
        { label: "Input method", grow: 1.4 },
        { label: "Copy / download", grow: 0.6 },
      ],
      tabs: ["Manglish", "Keyboard", "Write"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Type it in English letters",
        direction:
          "Manglish transliterates phonetically as you type — “namaskaram” becomes നമസ്കാരം.",
        suggestion:
          "The fast one when you know how the word sounds; the keyboard is for when you know how it is spelt.",
      },
      {
        at: "tab:1",
        title: "Tap the letters",
        direction:
          "Keyboard puts a Malayalam layout on screen, which takes the transliteration guesswork out.",
        suggestion: "Both of these work fully offline — no recognition service is involved.",
      },
      {
        at: "tab:2",
        title: "Draw the character",
        direction: "Write takes a character you draw and recognises it as text.",
        suggestion:
          "The one part that uses the network. Offline, Manglish and the keyboard still work.",
      },
      {
        at: "body:0",
        title: "One document, three inputs",
        direction:
          "All three methods write into the same saved document, so you can switch mid-sentence.",
        suggestion: "Copy the result out, or download it as a file when you are done.",
      },
    ],
  },

  translate: {
    tagline: "any language, online or offline",
    intro: "Translation that can run without a network at all.",
    layout: {
      blocks: [
        { label: "From", span: 1, grow: 1.8 },
        { label: "To", span: 1, grow: 1.8 },
        { label: "Swap", grow: 0.6 },
        { label: "Auto · Offline · Online", grow: 0.8 },
      ],
    },
    steps: [
      {
        at: "body:3",
        title: "Pick where it runs",
        direction:
          "Offline uses your browser's built-in AI on-device; Online posts to a service that auto-detects the source language; Auto takes on-device whenever a language pack is already installed.",
        suggestion:
          "Offline is genuinely offline: once the pack has downloaded, nothing leaves your machine. Latest Chrome and Edge have it.",
      },
      {
        at: "body:0",
        title: "Type or paste",
        direction: "The left side takes the text, and the right fills in as you go.",
        suggestion:
          "For a phrase you need to trust, translate it, swap, and translate back — a round trip shows up the wrong readings.",
      },
      {
        at: "body:2",
        title: "Swap in one tap",
        direction: "Swap exchanges the two languages, keeping the text where it is.",
        suggestion: "Which is what makes that round-trip check one button rather than a retype.",
      },
    ],
  },

  morse: {
    tagline: "learn, practise & send",
    intro: "Four tools over one signal engine, all of it generated locally.",
    layout: {
      blocks: [
        { label: "The tool", grow: 2.6 },
        { label: "Speed & pitch", span: 1 },
        { label: "Sound · lamp · vibration", span: 1 },
      ],
      tabs: ["Learn", "Practice", "Translate", "Key"],
    },
    steps: [
      {
        at: "tab:0",
        title: "The chart, out loud",
        direction:
          "Learn is a tappable chart of every letter, number, punctuation mark and prosign; each one plays, and shows its rhythm as “di-DAH”.",
        suggestion:
          "Learn the rhythm, not the dots. Reading “-.-” off a page is a different skill from hearing it.",
      },
      {
        at: "tab:1",
        title: "Drill the weak ones",
        direction:
          "Practice is a four-choice drill that keeps a mastery score per character and asks more about the ones you get wrong.",
        suggestion:
          "Short sessions beat long ones here — the score is per character, so it remembers where you left off.",
      },
      {
        at: "tab:3",
        title: "Send it yourself",
        direction:
          "Key gives you a pad to hold, or the space bar, and decodes your own timing back into letters.",
        suggestion:
          "The honest test. Your timing is what a receiving operator has to read, and the decoder is not forgiving.",
      },
      {
        at: "body:2",
        title: "Practise silently",
        direction:
          "Every signal comes out as sound, an on-screen lamp and optional vibration, at 5–30 WPM and an adjustable pitch.",
        suggestion:
          "Lamp and vibration with the sound off means you can drill on a train. It all works offline — the tone is synthesized in the browser.",
      },
    ],
  },

  sound: {
    tagline: "frequency, pitch, level & spectrum",
    intro: "Four measurements off one microphone, none of them recorded.",
    layout: {
      blocks: [
        { label: "Frequency & pitch", grow: 1.6 },
        { label: "Level, peak & clipping", grow: 1.1 },
        { label: "Spectrum / waveform", grow: 1.6 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Frequency and note",
        direction:
          "The fundamental in Hz, tracked from 50 Hz to 2 kHz, alongside the nearest musical note and how many cents sharp or flat it is.",
        suggestion:
          "It is an instrument tuner as it stands, and the reference A moves from 415 to 444 Hz if you need it to.",
      },
      {
        at: "body:1",
        title: "How loud",
        direction:
          "RMS and peak in dBFS with a peak hold and a clipping warning, plus a rough dB SPL estimate you can calibrate.",
        suggestion:
          "Watch the clipping warning rather than the number — once a signal clips, every other reading here is wrong.",
      },
      {
        at: "body:2",
        title: "See the whole band",
        direction:
          "A live 20 Hz–20 kHz log spectrum — point at a spike to read its frequency — or a time-domain scope.",
        suggestion:
          "The spectrum is how you find a hum: a hard spike at 50 or 60 Hz is mains, not the room.",
      },
      {
        at: "apps",
        title: "The mic is let go",
        direction:
          "Audio is analysed frame by frame and thrown away — nothing is recorded, saved or uploaded — and the microphone is released the moment you stop or switch app.",
        suggestion:
          "It works fully offline. It does need microphone permission, and the accuracy ceiling is your microphone's.",
      },
    ],
  },

  color: {
    tagline: "every colour in a picture, in every code",
    intro: "Reading a colour out of a photo, and everything that follows from it.",
    layout: {
      blocks: [
        { label: "The picture · magnifier", grow: 2.2 },
        { label: "HEX · RGB · HSL · CMYK · LAB · LCH", grow: 1.2 },
        { label: "Contrast & name", span: 1 },
        { label: "Palette & schemes", span: 1 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Tap the colour",
        direction:
          "Attach a photo, drop or paste one, or take one with the camera — then tap anywhere on it. A magnifier shows the exact pixels.",
        suggestion:
          "On a grainy photo, average a 3×3 or 5×5 block instead of a single pixel; one pixel of noise is not the colour you saw.",
      },
      {
        at: "body:1",
        title: "Every code at once",
        direction:
          "HEX, RGB, HSL, HSB, CMYK, LAB, LCH, XYZ and luminance for the point you tapped, each one tap to copy.",
        suggestion: "You can also skip the picture entirely and type a hex code in to look it up.",
      },
      {
        at: "body:2",
        title: "Is it usable as text",
        direction:
          "Contrast against white and black, graded pass or fail to WCAG AA and AAA, plus the nearest of the 148 named CSS colours.",
        suggestion:
          "Check this before you commit a brand colour to body text. Most fail AA against white, and here is a better place to find out.",
      },
      {
        at: "body:3",
        title: "The whole image",
        direction:
          "Four to twelve dominant colours with how much of the picture each covers — exportable as a hex list, CSS variables, a Tailwind theme block, SCSS or JSON — plus complementary, analogous, triadic, split, tetradic and monochromatic schemes from any pick.",
        suggestion:
          "The picture is decoded on your device and never uploaded, so all of this works offline.",
      },
    ],
  },

  qr: {
    tagline: "scan one, or make one",
    intro: "Reading and writing QR codes, entirely on this device.",
    layout: {
      blocks: [
        { label: "Camera / picture", grow: 2.2 },
        { label: "What it says", grow: 1 },
        { label: "Export PNG · SVG", grow: 0.7 },
      ],
      tabs: ["Scan", "Create", "Recent"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Two ways to read one",
        direction:
          "Scan with the camera, or read a code out of a picture you already have — choose a file, drop it, or paste a screenshot, with no camera permission involved at all.",
        suggestion:
          "The picture route is the one for a code in an email: no permission prompt, and it reads a screenshot as happily as a photo.",
      },
      {
        at: "body:1",
        title: "You see it before it acts",
        direction:
          "A reading is always shown in full first, and only http(s), mailto: and tel: destinations are ever made clickable.",
        suggestion:
          "A printed code is untrusted input from a stranger. Read the address before you follow it.",
      },
      {
        at: "tab:1",
        title: "Make the real formats",
        direction:
          "Plain text, links, Wi-Fi credentials, email with subject and body, phone, SMS, a location and a contact card — in the formats a phone camera actually acts on.",
        suggestion:
          "The Wi-Fi one earns its keep: a code on the fridge beats reading a 20-character password out loud.",
      },
      {
        at: "body:2",
        title: "Export it properly",
        direction: "Four error-correction levels, a byte-capacity readout, and PNG or SVG out.",
        suggestion:
          "Printing it? Take SVG and a higher correction level — it survives being scuffed, where a small PNG doesn't.",
      },
    ],
  },

  qrfiles: {
    tagline: "any file, as a wall of codes",
    intro: "A whole file turned into QR codes, and turned back — and what that actually costs.",
    layout: {
      blocks: [
        { label: "The file, and what it will cost", grow: 1.1 },
        { label: "Code size \u00b7 error correction", grow: 0.9 },
        { label: "Loop / Sheet", grow: 2.2 },
        { label: "Print \u00b7 Save the images", grow: 0.7 },
      ],
      tabs: ["Encode", "Rebuild", "History"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Any file, one door",
        direction:
          "Drop or pick a picture, a document, a song or a clip \u2014 up to 4 MB. It is read on this device and never uploaded.",
        suggestion:
          "There is no \"choose a type\" step because the app doesn't care what the file is. Everything past this point is just bytes.",
      },
      {
        at: "body:0",
        title: "The cost, before you spend it",
        direction:
          "Before a single code is drawn it says how many there will be, how many printed pages that is, and how long the on-screen loop runs.",
        suggestion:
          "This is the number to react to. A phone photo is a couple of hundred codes \u2014 shrink it in Image Studio first and the same picture becomes a sheet you can actually scan.",
      },
      {
        at: "body:1",
        title: "Two dials, one trade",
        direction:
          "Code size sets how much each code carries, and error correction how much damage it survives.",
        suggestion:
          "Denser codes mean fewer of them and a harder scan. Reading off a screen a foot away, go dense; photographing a printed sheet later, don't \u2014 a code you can't read is worse than ten more of them.",
      },
      {
        at: "body:3",
        title: "Off the screen entirely",
        direction:
          "The same codes print as a numbered sheet, or save as one PNG each in a zip with a note explaining how to rebuild them.",
        suggestion:
          "This is the thing nothing else here does: paper outlives every format and every device. It is also the slowest way to move a file \u2014 if both devices are on one network, File Drop sends it in one go.",
      },
      {
        at: "tab:1",
        title: "Reading it back",
        direction:
          "Point the camera at the loop or the sheet, or add one picture of one code at a time \u2014 in any order, and re-reading one you already have is harmless.",
        suggestion:
          "Nothing is saved until the whole set has arrived and its checksum matches, so a misread code is reported rather than handed back as a file that looks fine and isn't.",
      },
      {
        at: "tab:2",
        title: "Names only, on purpose",
        direction:
          "History lists what passed through \u2014 each file's name, size and code count, never its contents.",
        suggestion:
          "So a row can't re-open a file, and doesn't pretend to. What it is good for is planning the next one: how many codes was that photo, at which setting.",
      },
    ],
  },

  handoff: {
    tagline: "move your data to another device",
    intro: "Getting this browser's data onto another device with nothing in between.",
    layout: {
      blocks: [
        { label: "Pick what to send", grow: 1.6 },
        { label: "QR loop", grow: 1.8 },
        { label: "Direct link", grow: 0.9 },
      ],
      tabs: ["Send", "Receive"],
    },
    steps: [
      {
        at: "body:0",
        title: "Choose app by app",
        direction:
          "Each row is one app's data with its size, so you can send the notes without the news cache.",
        suggestion:
          "Send the smallest useful set. Every kilobyte is another QR frame the other device has to read.",
      },
      {
        at: "body:1",
        title: "Hold up the screen",
        direction:
          "The data is compressed, split across as many QR codes as it needs and played as a loop; the receiving device reads them in any order until it has a complete, checksummed set.",
        suggestion:
          "No account, no upload, no cable. Frames can arrive out of order, so a missed one simply comes round again.",
      },
      {
        at: "body:2",
        title: "For larger data",
        direction:
          "A direct link uses the same codes to swap connection details, then transfers everything at once over the local network.",
        suggestion:
          "No relay server is configured, so this works only between two devices on the same network — and nothing leaves it.",
      },
      {
        at: "tab:1",
        title: "Nothing lands unasked",
        direction:
          "What travels is exactly the backup file Settings → Data writes, validated by the same reader and landing through the same add-or-replace choice.",
        suggestion: "Handoff is the small version — a chosen app or two. Clone moves the whole device.",
      },
    ],
  },

  clone: {
    tagline: "copy this whole device onto another",
    intro: "Every app's data and every setting, down whichever route you have.",
    layout: {
      blocks: [
        { label: "Route: cable · network · no network", grow: 1.2 },
        { label: "What would change here", grow: 1.8 },
        { label: "Add alongside / make identical", grow: 1 },
      ],
      tabs: ["Send", "Receive", "Device"],
    },
    steps: [
      {
        at: "body:0",
        title: "Whichever route you have",
        direction:
          "A cable with USB tethering on turns the wire into a private network; one Wi-Fi does the same wirelessly; with no network at all the clone becomes a loop of QR codes read off this screen.",
        suggestion:
          "The cable route is the fast one — no router, no internet, and nothing else on the path.",
      },
      {
        at: "tab:1",
        title: "Look before it writes",
        direction:
          "The receiving device shows where the clone came from, what it holds app by app, and exactly what would change: what arrives, what is replaced, and what would be deleted.",
        suggestion: "Read the deletion list. It is the only part of this that cannot be undone after.",
      },
      {
        at: "body:2",
        title: "Two ways to land it",
        direction:
          "Add it alongside what is already there, or make the device identical — which deletes anything the clone doesn't carry.",
        suggestion:
          "“Add alongside” for a second device you both use; “identical” only when you are replacing the old one.",
      },
      {
        at: "body:1",
        title: "Verified whole first",
        direction:
          "Every clone carries a checksum and is verified complete before a single item is written, and the sender gets a receipt of what actually landed.",
        suggestion:
          "There is no server and no account anywhere in this — the clone goes straight from one device to the other.",
      },
    ],
  },

  drop: {
    tagline: "send any file, device to device",
    intro: "A file of any size, from any device to any device, with nothing in between.",
    layout: {
      blocks: [
        { label: "Queue files", grow: 1.4 },
        { label: "Reach: this network / anywhere", grow: 1 },
        { label: "Invite: QR · link · token", grow: 1.4 },
        { label: "Transfer", grow: 1 },
      ],
      tabs: ["Send", "Receive"],
    },
    steps: [
      {
        at: "body:0",
        title: "Queueing costs nothing",
        direction:
          "Drag, drop or choose files — nothing is read until the transfer starts, so queueing a multi-gigabyte video uses no memory.",
        suggestion:
          "Queue the whole folder. What you line up has no bearing on what lining it up costs.",
      },
      {
        at: "body:1",
        title: "How far it has to reach",
        direction:
          "“This network only” contacts nothing outside the network at all and works with no internet; “anywhere” asks a public STUN server what address this device looks like from outside — it never sees the files.",
        suggestion:
          "Same room, same Wi-Fi? Take “this network only”. It is faster, and nothing outside is involved.",
      },
      {
        at: "body:2",
        title: "You make the introduction",
        direction:
          "The invite travels as a QR code, as a link — the code sits after the # so it never reaches a server — or as a token you paste into any chat app. The other side hands back a reply the same way.",
        suggestion:
          "The token route works through a chat you already have open, which is usually quicker than lining up two cameras.",
      },
      {
        at: "body:3",
        title: "Nothing is held whole",
        direction:
          "Files stream a chunk at a time: the sender reads each file a slice at a time from disk, and the receiver writes each chunk straight out.",
        suggestion:
          "That is what makes a huge file work at all — neither end ever has to fit it in memory.",
      },
    ],
  },

  text: {
    tagline: "the small jobs on text, done here",
    intro: "Six tools over one shared draft, so they compose.",
    layout: {
      blocks: [
        { label: "The shared draft", grow: 2.2 },
        { label: "Result", grow: 1.4 },
      ],
      tabs: ["Text", "Encode", "JSON", "Compare", "Regex", "Hash"],
    },
    steps: [
      {
        at: "body:0",
        title: "One draft, six tools",
        direction:
          "Every tab reads and writes the same text, and it is kept — a refresh or an app switch doesn't lose it.",
        suggestion:
          "Which means they chain: decode a payload in Encode, format the JSON inside it in JSON, then diff it in Compare.",
      },
      {
        at: "tab:0",
        title: "Case, lines and counts",
        direction:
          "Upper, lower, title, sentence, camel, Pascal, snake and kebab case; sort A→Z, Z→A or naturally; dedupe, reverse, trim, drop blanks, number lines — with live character, word, line, byte and reading-time counts.",
        suggestion:
          "Natural sort puts file2 before file10, and the case converter finds word boundaries inside identifiers — parseHTMLDocument becomes parse_html_document.",
      },
      {
        at: "tab:2",
        title: "Why it won't parse",
        direction:
          "JSON formats at 2, 4 or tab indent, minifies, and sorts keys at every depth. An invalid document is reported by line, column and what was expected, with the offending line quoted.",
        suggestion:
          "Sort keys on both documents before you diff them and the comparison stops being noise.",
      },
      {
        at: "tab:5",
        title: "Local, and that's the point",
        direction:
          "Encode is UTF-8 safe in both directions, and Hash takes a checksum of text or of a file.",
        suggestion:
          "No network at any point. The text you would least like to upload is exactly the text you needed a tool for.",
      },
    ],
  },

  scan: {
    tagline: "a photo of a page, turned into a PDF",
    intro: "A camera and four corners, which is the difference between a scan and a snapshot.",
    layout: {
      blocks: [
        { label: "Camera", grow: 2 },
        { label: "Mark the corners", grow: 1.4 },
        { label: "Pages", grow: 1.2 },
        { label: "Save as PDF", grow: 0.8 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Photograph the page",
        direction:
          "Take the page with the camera, or bring in a picture you already have.",
        suggestion:
          "Fill the frame and keep all four corners in shot \u2014 the corners are what the flattening works from, so they have to be visible.",
      },
      {
        at: "body:1",
        title: "Mark the four corners",
        direction:
          "This is the step that makes it a scanner rather than a camera roll: you mark the page's corners and the page is *flattened*, not merely cropped.",
        suggestion:
          "A photo taken at an angle comes out square. Cropping alone never does that, however carefully you crop.",
      },
      {
        at: "body:2",
        title: "Build the document",
        direction:
          "Pages stack up as you shoot, and any of them can be reordered, re-edited or deleted before you export.",
        suggestion:
          "Shoot everything first and fix the order afterwards. Moving a page is one tap; re-shooting one is not.",
      },
      {
        at: "body:3",
        title: "Save as PDF",
        direction: "Name it, choose a page size, and it is written out as a PDF on this device.",
        suggestion:
          "Nothing is uploaded \u2014 which, for the things people actually scan (IDs, payslips, signed forms), is the whole reason to use this instead of a website with an upload box.",
      },
    ],
  },

  voice: {
    tagline: "say it now, find it later",
    intro: "A recorder whose real feature is the transcript.",
    layout: {
      blocks: [
        { label: "Record", grow: 1.4 },
        { label: "Live transcript", grow: 1.2 },
        { label: "Search titles and transcripts", grow: 0.8 },
        { label: "Your memos", grow: 1.6 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "One big button",
        direction: "Press to record; a level meter shows that it is hearing you.",
        suggestion: "The recording itself is entirely local \u2014 the audio never leaves the device.",
      },
      {
        at: "body:1",
        title: "The transcript is the feature",
        direction:
          "With transcription switched on, the words appear as you speak them.",
        suggestion:
          "It is off until you switch it on, because unlike the recording it is *not* local \u2014 it goes through the browser's speech service. The recorder says so rather than burying it.",
      },
      {
        at: "body:2",
        title: "Find it by what you said",
        direction: "Search spans transcripts, not just titles.",
        suggestion:
          "Which is the whole point. Audio is unsearchable, and that is why voice memos pile up unlistened in every phone's recorder.",
      },
      {
        at: "body:3",
        title: "What survives a squeeze",
        direction: "The library is kept on this device.",
        suggestion:
          "If storage runs short it is the *audio* that is dropped and the transcript that is kept \u2014 the searchable half is the half worth saving.",
      },
    ],
  },

  wallet: {
    tagline: "what you spent, and where it went",
    intro: "Logging in four seconds, because friction is what makes the gaps.",
    layout: {
      blocks: [
        { label: "Amount", grow: 1 },
        { label: "Category \u2014 one tap", grow: 1.6 },
        { label: "The last fortnight", grow: 1.6 },
      ],
      tabs: ["Log", "Month", "Split"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Four seconds to log",
        direction:
          "Amount, one tap on a category, done. Every field beyond those two is optional.",
        suggestion:
          "That is deliberate: a tracker with gaps produces confident totals that are wrong, and friction is what makes the gaps.",
      },
      {
        at: "body:1",
        title: "A grid, not a menu",
        direction: "One tap says where the money went.",
        suggestion:
          "It cannot categorise for you \u2014 there is no account, no bank link and no server to do the guessing. One tap is the price of that, and it is the honest trade.",
      },
      {
        at: "tab:1",
        title: "Where the month went",
        direction:
          "Month totals by category against a target you set, and writes the lot out as CSV.",
        suggestion:
          "Set the target at the start of the month rather than the end. A total with nothing to measure against is just a number.",
      },
      {
        at: "tab:2",
        title: "Who owes whom",
        direction: "Split takes a bill and works out the payments that settle it.",
        suggestion:
          "Amounts are held as whole minor units throughout, so nothing here can lose a paisa to floating point.",
      },
    ],
  },

  convert: {
    tagline: "how long, how heavy, how much",
    intro: "Units and money in one app, on separate tabs, for one good reason.",
    layout: {
      blocks: [
        { label: "From", span: 1, grow: 1.6 },
        { label: "To", span: 1, grow: 1.6 },
        { label: "What you are converting", grow: 1 },
        { label: "Rate date", grow: 0.8 },
      ],
      tabs: ["Units", "Money"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Units, with no caveats",
        direction: "Length, weight, temperature, data and more, all converted on this device.",
        suggestion:
          "A metre is a metre forever, so this tab needs no network at all \u2014 which is exactly why it is kept apart from the money one.",
      },
      {
        at: "tab:1",
        title: "Money is not like that",
        direction:
          "Currency converts at the latest published rate, and the tab shows you which day's rate it used.",
        suggestion:
          "Read the date. A rate is only true for a day, and a converter that hides its date is the one that will mislead you.",
      },
      {
        at: "body:2",
        title: "Pick the quantity",
        direction: "Choosing what you are converting switches both ends to that quantity's units.",
        suggestion:
          "The pair you last used is remembered, so the conversion you do every day is already on screen when you arrive.",
      },
    ],
  },

  chrono: {
    tagline: "when it fires, and how long that is",
    intro: "The questions about time that a clock cannot answer.",
    layout: {
      blocks: [
        { label: "Input", grow: 0.9 },
        { label: "What it means", grow: 1.4 },
        { label: "Next runs / every form", grow: 1.6 },
      ],
      tabs: ["Cron", "Stamp", "Length"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Explain an expression",
        direction:
          "Paste a cron expression and it says what the thing means in words, then lists the next times it fires.",
        suggestion:
          "The next-runs list is the check that matters. An expression that reads correctly and fires on the 31st of February is the classic version of this bug.",
      },
      {
        at: "tab:1",
        title: "Read a timestamp",
        direction: "A Unix timestamp or a date, given back in every form at once.",
        suggestion:
          "Reading seconds as milliseconds is what puts you in 1970. This tells them apart rather than guessing.",
      },
      {
        at: "tab:2",
        title: "How long is that",
        direction: "Read a duration in plain terms, and add it to a moment.",
        suggestion:
          "Useful for sizing a timeout: 900000 is not a number anyone should have to divide in their head.",
      },
      {
        at: "body:0",
        title: "None of it leaves",
        direction: "All three tools run entirely on this device.",
        suggestion:
          "Which is the point of having them here. The alternative is pasting production data into a stranger's website.",
      },
    ],
  },

  contrast: {
    tagline: "can everyone actually read this",
    intro: "Three colour questions that decide whether an interface is usable.",
    layout: {
      blocks: [
        { label: "Foreground / background", grow: 1.1 },
        { label: "The verdict", grow: 1.2 },
        { label: "Preview", grow: 1.6 },
      ],
      tabs: ["Check", "Ramp", "Vision"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Grade a pair",
        direction:
          "Two colours in, and every WCAG level graded \u2014 AA and AAA, at normal and at large text sizes.",
        suggestion:
          "Grade the pair you actually ship: body text on the card's own background, not on white.",
      },
      {
        at: "tab:1",
        title: "Build the scale",
        direction: "Ramp turns one colour into a 50\u2013950 scale and exports it as tokens.",
        suggestion:
          "Which is the practical way out of a failing pair \u2014 keep the hue you wanted and take the step that passes.",
      },
      {
        at: "tab:2",
        title: "One reader in twelve",
        direction: "Vision previews a palette under colour-vision deficiency.",
        suggestion:
          "The failure this catches is two colours that mean different things becoming the same colour. No contrast ratio will ever warn you about it.",
      },
      {
        at: "body:1",
        title: "It agrees with the theme picker",
        direction:
          "The verdicts come from the same colour primitives the workspace grades its own themes with.",
        suggestion:
          "So a colour that passes here passes there. Two graders that quietly disagree are worse than one.",
      },
    ],
  },

  snippets: {
    tagline: "the code you keep looking up",
    intro: "One screen and one search box, on purpose.",
    layout: {
      blocks: [
        { label: "Search \u2014 or #tag, or lang:go", grow: 0.9 },
        { label: "Sort", span: 1, grow: 0.8 },
        { label: "New snippet", span: 1, grow: 0.8 },
        { label: "One flat list", grow: 2.4 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "One search box",
        direction:
          "The query spans titles, tags, languages and bodies at once, and `#tag` or `lang:go` narrows it.",
        suggestion:
          "There are no folders and no categories, deliberately: a snippet library dies the moment searching it is slower than rewriting the thing.",
      },
      {
        at: "body:3",
        title: "Copy is on the card",
        direction: "Each card carries its language, its tags and a copy button.",
        suggestion:
          "So the common case \u2014 find it, paste it \u2014 never has to open anything.",
      },
      {
        at: "body:1",
        title: "Sort by how you think",
        direction:
          "Order by last updated, when it was created, by title, or by how often you have copied it.",
        suggestion:
          "\u201cMost copied\u201d is the honest view of what you actually keep coming back for.",
      },
      {
        at: "body",
        title: "Nowhere to leak to",
        direction: "Everything here stays on this device.",
        suggestion:
          "Not an apology: the snippets people really keep are connection strings, auth headers and internal endpoints, and this is the one snippet manager that cannot leak them because it has nowhere to send them.",
      },
    ],
  },

  markdown: {
    tagline: "write it, read it, take it away",
    intro: "A scratchpad for one document, whose job ends at the export.",
    layout: {
      blocks: [
        { label: "The document", grow: 2.4 },
        { label: "Rendered", grow: 1.6 },
        { label: ".md \u00b7 .html \u00b7 copy", grow: 0.7 },
      ],
      tabs: ["Write", "Split", "Read"],
    },
    steps: [
      {
        at: "tab:0",
        title: "One document, not a library",
        direction:
          "This is the pad you write the README, the design doc or the meeting notes in. It persists, so it is never lost.",
        suggestion:
          "Sketchnotes already holds many notes and Snippets many fragments \u2014 a third collection to manage would be the wrong answer.",
      },
      {
        at: "tab:1",
        title: "Split, on a wide screen",
        direction: "Write on one side, see it rendered on the other.",
        suggestion:
          "The split is desktop-only, and that is a decision rather than a gap: two 180px columns on a phone serve neither writing nor reading.",
      },
      {
        at: "tab:2",
        title: "Read it",
        direction: "Read gives the rendered document the full width of the screen.",
        suggestion:
          "The rendering never goes through HTML, so a document you paste in cannot smuggle markup into the page.",
      },
      {
        at: "body:2",
        title: "Take it away",
        direction: "Download it as .md or as a standalone .html file, or copy the whole thing out.",
        suggestion:
          "The .html export is self-contained, which makes it the one to send to somebody who does not want to read markdown.",
      },
    ],
  },

  api: {
    tagline: "build it, send it, read it",
    intro: "A request builder \u2014 and one thing about it worth knowing before you use it.",
    layout: {
      blocks: [
        { label: "Method & URL", grow: 0.9 },
        { label: "Headers", grow: 1.2 },
        { label: "Body", grow: 1.2 },
        { label: "Response", grow: 1.4 },
        { label: "Saved \u00b7 this session", grow: 1 },
      ],
    },
    steps: [
      {
        at: "body:0",
        title: "Build the request",
        direction: "A method, a URL, and Send.",
        suggestion:
          "It cannot reach anything private \u2014 localhost, your office network, a container on this machine \u2014 and it refuses those explicitly rather than timing out mysteriously. For local development, curl is the right tool.",
      },
      {
        at: "body:1",
        title: "Headers, one at a time",
        direction: "Each header row can be switched on and off without deleting it.",
        suggestion:
          "Which is how you find the header an API is objecting to: turn them off one by one rather than retyping the set.",
      },
      {
        at: "body:3",
        title: "Read what came back",
        direction: "The status, the headers and the body, formatted.",
        suggestion:
          "The curl line for the request you just built is there too \u2014 the quickest way to hand a reproduction to someone else.",
      },
      {
        at: "body:4",
        title: "Why history is session-only",
        direction:
          "A named request is saved; what you actually sent is kept for this session and never written to disk.",
        suggestion:
          "Because the request is made by this site's server, not by your browser \u2014 it has to be, since most APIs have not opted into CORS \u2014 so anything you send passes through it. That is the reason, and the note under Send says so.",
      },
    ],
  },

  walk: {
    tagline: "a guided tour of any app here",
    intro: "This app, walking around itself.",
    layout: {
      blocks: [
        { label: "The stage", grow: 2.4 },
        { label: "Tooltip", grow: 0.9 },
        { label: "Suggestion & controls", grow: 1.1 },
      ],
      tabs: ["Apps", "Walkaround"],
    },
    steps: [
      {
        at: "tab:0",
        title: "Pick an app",
        direction:
          "The Apps tab lists every app in the workspace with the number of stops in its walkaround, and a tick against the ones you have finished.",
        suggestion:
          "Start with an app you already use. The suggestions are aimed at the things regular use doesn't turn up.",
      },
      {
        at: "body:0",
        title: "A drawing, not the app",
        direction:
          "The stage is a schematic of that app's screen — its header, its working area and its tabs — with a numbered pin on whatever the current step is about.",
        suggestion:
          "Tap any pin to jump straight to its step; the arrow keys walk the tour without leaving the keyboard.",
      },
      {
        at: "body:1",
        title: "The tooltip points",
        direction:
          "The tooltip hangs off the pin and says where the thing is and what it does — flipping above the pin when there is no room below.",
        suggestion:
          "It is the same text as the step in the list underneath, so nothing is only available on hover.",
      },
      {
        at: "body:2",
        title: "Then go and do it",
        direction:
          "Every step carries a suggestion, and Open takes you into the real app once you have read them.",
        suggestion:
          "Finishing a tour ticks it off in the Apps tab, so you can tell what you have and haven't been shown.",
      },
    ],
  },

  satellite: {
    tagline: "the ground from above, and the weather over it now",
    intro: "A map of anywhere on Earth, with the live layer that makes it worth watching.",
    layout: {
      blocks: [
        { label: "The map", grow: 2.6 },
        { label: "Zoom & follow", span: 1 },
        { label: "Scale & credits", span: 1 },
        { label: "Panel for the chosen tab", grow: 1.5 },
      ],
      tabs: ["Find", "Layers", "Live"],
    },
    steps: [
      {
        at: "body:0",
        title: "Move around the world",
        direction:
          "Drag to pan and pinch, scroll or double-tap to zoom — and the arrow keys and +/− do the same thing once the map has focus.",
        suggestion:
          "Zooming holds the point under your finger still rather than pulling towards the middle, so you can dive straight onto a rooftop without chasing it.",
      },
      {
        at: "body:1",
        title: "Locate, follow, look down",
        direction:
          "The corner stack zooms, finds where you are, and opens Street View for whatever is under the crosshair.",
        suggestion:
          "The locate control changes job as it goes: it asks for your position, then centres on it, then follows you. Dragging the map is what hands the wheel back — follow switches itself off rather than snatching the view.",
      },
      {
        at: "tab:1",
        title: "What the map is made of",
        direction:
          "Layers picks the ground — satellite imagery, streets or terrain — puts place names over it, and turns on a live sheet of rain radar or NASA's daily pass.",
        suggestion:
          "Turn the overlay strength down rather than off: seeing the coastline through the rain is the whole reason to have both on one map.",
      },
      {
        at: "tab:2",
        title: "The part that is live",
        direction:
          "Live plays the weather frames and says how many minutes old the newest measured one is, alongside your own position, speed and accuracy.",
        suggestion:
          "Watch the timeline's ticks: the pale ones on the right are forecast, not radar. Playing straight through the seam is how a projection quietly becomes a fact.",
      },
      {
        at: "tab:0",
        title: "Find somewhere, or yourself",
        direction:
          "Find searches a place by name, takes pasted coordinates, uses your own location, tells you what is under the crosshair, and keeps places for next time.",
        suggestion:
          "Coordinates never leave the device — they are already the answer. Only a name goes to the geocoder, and only when you press Search.",
      },
      {
        at: "body:3",
        title: "Down to street level",
        direction:
          "Street View opens the panorama for a point — from the map's corner, from a pin, or from where you are standing.",
        suggestion:
          "It is a link out to Google, not an embed, and deliberately so: every keyless open source of street-level photos has almost no coverage left. Only the coordinates travel with the link.",
      },
      {
        at: "body:2",
        title: "Read the small print",
        direction:
          "The scale bar and the credit line sit under the map, and both change with what you are looking at.",
        suggestion:
          "The imagery is a photograph months or years old — no public service streams the ground live. The weather over it and your own dot are the live parts.",
      },
    ],
  },
};

/** Apps in the order their tours are authored — the picker's default order. */
export const TOUR_APP_IDS = Object.keys(TOURS) as AppId[];

/** How many stops a tour has. */
export const stepCount = (app: AppId): number => TOURS[app].steps.length;
