# Sketchnotes

A fast, offline-first canvas for sketching ideas and jotting notes — rebuilt on
**Next.js (App Router) + TypeScript + Tailwind CSS v4 + Zustand + TanStack Query**
with an atomic component architecture.

Ported 1:1 from the original single-file `index.html` (kept in [`legacy/`](./legacy)
for reference) with full feature parity: pen / eraser / line / arrow / 20 shapes /
emoji stickers / text, pan + pinch-zoom, multi-note management with auto-save,
undo/redo, light & dark themes, keyboard shortcuts, and PNG / JPG / WebP / SVG /
PDF / DOC / JSON export.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
npm run lint     # eslint (flat config in eslint.config.mjs)
npm test         # vitest — the pure logic (parsers, protocol, backup, geometry)
npm run verify   # everything above plus the registry, theme and worker checks
```

## Architecture

The design separates the **imperative drawing engine** (the 60fps hot path) from
the **declarative React chrome**, so pointer/render work never touches React's
reconciliation cycle.

```
src/
├─ app/                     # Next.js App Router shell
│  ├─ layout.tsx            # metadata, viewport, <Providers>
│  ├─ providers.tsx         # TanStack Query client
│  ├─ page.tsx              # renders <EditorShell/>
│  └─ globals.css           # Tailwind v4 + theme tokens (CSS vars per [data-theme])
│
├─ engine/                  # framework-agnostic canvas engine (no React)
│  ├─ SketchEngine.ts       # owns elements, view, history, pointer + text editing
│  ├─ render.ts             # element + grid rendering
│  ├─ geometry.ts           # hit-testing, bounds, transforms
│  ├─ shapes.ts             # parametric shape library
│  ├─ constants.ts / types.ts
│  └─ export/               # png/jpg/webp + svg + pdf + doc + json writers
│
├─ store/
│  └─ useEditorStore.ts     # Zustand: tool/colour/width/theme + derived UI state
│
├─ lib/                     # storage adapter, notes API, query keys, utils, emoji
├─ hooks/                   # useEditorEngine (orchestrator), useNotes (Query),
│                           #   useTheme, useKeyboardShortcuts
├─ context/                 # EditorContext — imperative command bus
└─ components/              # atomic design
   ├─ atoms/                # IconButton, ToolButton, PrimaryButton, Popover, Toast, icons
   ├─ molecules/            # ColorPicker, WidthPicker, ShapePicker, EmojiPicker,
   │                        #   DownloadMenu, SelectionChip, Zoomer, NoteListItem, TextEditor
   ├─ organisms/            # Header, Dock, CanvasStage, NotesDrawer
   └─ templates/            # EditorShell (composition + provider)
```

### Data flow

- **Zustand** is the single source of truth for tool/colour/width/theme and
  derived UI state (zoom, selection, undo/redo availability, empty state).
- **`useEditorEngine`** is the orchestrator: it creates the `SketchEngine`,
  bridges the engine's callbacks → store, syncs store style → engine, wires
  debounced auto-save, and exposes an `EditorCommands` bus via React context.
- **TanStack Query** treats device storage as an async data source: the notes
  index is a query; save / create / delete are mutations that keep the cache in
  sync. Swapping the store underneath only touches `lib/storage.ts`.

### Persistence

Every app saves through one async key/value module
([`lib/storage.ts`](./src/lib/storage.ts)) under `sknotes:*` keys. It prefers
**IndexedDB**, falls back to `localStorage`, then to an in-memory map — and
migrates an existing `localStorage` install into IndexedDB once, on first load.

IndexedDB leads for three reasons: `localStorage` is a single ~5 MB synchronous
budget shared by every app (a sketch with pasted images exhausts it, and a failed
write used to look like a successful one), IndexedDB is measured against the
origin's real quota, and the service worker can read it — which is what lets
reminders fire while no tab is open. Legacy notes still load unchanged.

**Settings → Data** is the door in and out: save everything to a `.zip` (a plain
`backup.json` of the storage keys themselves, so old backups survive app
changes), restore one with an add-or-replace choice, request persistent storage so
the browser stops treating the workspace as evictable, or erase the lot. See
[`lib/backup/`](./src/lib/backup).

## Getting in and out

| Feature | Where | What it does |
| --- | --- | --- |
| Command palette | [`components/Palette/`](./src/components/Palette) | Ctrl/⌘ + K from any app: one field over every app, PDF section, theme and settings overlay. Unmatched text is handed to the Assistant. |
| Backup & restore | [`lib/backup/`](./src/lib/backup) | The whole workspace as one file, and back again. |
| File handlers | [`lib/intake/`](./src/lib/intake) | An installed OneApp opens double-clicked PDFs, images, notes and backups (`launchQueue`), routing each to the app that can use it. |
| Share target | [`public/sw.js`](./public/sw.js) | The share sheet's POST is answered by the worker, so a shared file never reaches a server. |
| Save in place | [`lib/download.ts`](./src/lib/download.ts) | Where the File System Access API exists, the PDF editor saves edits back to the file that was opened instead of downloading a copy. |
| Handoff | [`components/Handoff/`](./src/components/Handoff) | Move data to another device over a chain of QR codes, or a QR-signalled WebRTC link on the local network. |
| Clone | [`components/Clone/`](./src/components/Clone) | Copy a whole device — every app's data and every setting — onto another one: by cable (USB tethering, or a clone file carried on a drive), over a network, or with no network at all via a loop of QR codes. Verified whole before anything is written, and the receiving device is first shown a per-app plan of what would arrive, be replaced, be left alone or be deleted. |
| Walkaround | [`components/Walkaround/`](./src/components/Walkaround) | A guided tour of any app: each stop is a tooltip on a *schematic* of that app's screen — header, Apps button, working-area blocks, bottom tabs — with a direction and a suggestion. Tours a drawing rather than the live app deliberately, so it holds no selectors into anyone else's DOM and cannot break what it describes; anchors are resolved by [`lib/Walkaround/stage.ts`](./src/lib/Walkaround/stage.ts) and every authored one is checked by [`walkaround.test.ts`](./src/lib/Walkaround/walkaround.test.ts). |
| Text Kit | [`components/TextKit/`](./src/components/TextKit) | Case, lines and counts; base64/URL/HTML/JSON-string codecs; JSON format, minify and a *located* parse error; line diff; regex workbench; SHA/CRC of text or a file. One shared, persisted draft, no network. |
| Trash | [`lib/trash.ts`](./src/lib/trash.ts) | Deleted notes, tasks, reminders and board sections recoverable for 30 days from Settings → Recently deleted. Restores as storage operations, so it needs no code from the app the item came from. |
| Content search | [`lib/palette/content.ts`](./src/lib/palette/content.ts) | Ctrl/⌘ + K also searches what is *in* the apps — note bodies, tasks, board rows — and opens the item itself. Readers load on first search, so nothing joins the initial bundle. |
| File Drop | [`components/FileDrop/`](./src/components/FileDrop) | Send files of any size device-to-device over WebRTC — same network with no internet, or across networks via STUN. Streamed in chunks with backpressure both ways, verified per file, written into a chosen folder or streamed to disk through the service worker; an interrupted transfer resumes. |
| Scan | [`components/Scan/`](./src/components/Scan) | Photo of a page → PDF. The corners you mark are flattened by a real homography ([`lib/Scan/warp.ts`](./src/lib/Scan/warp.ts), solved 8×8 with partial pivoting — an axis-aligned quad hits a zero pivot otherwise) and inverse-mapped with bilinear sampling. The "Document" finish divides out a blurred local-background estimate, so a page lit from one side doesn't come out half black. Assembled with pdf-lib; nothing is persisted, so an unexported scan leaves with the app. |
| Wallet | [`components/Wallet/`](./src/components/Wallet) | Expense log, monthly roll-up and a bill splitter. Amounts are **integer minor units** end to end — no float can shave a paisa off a total. The splitter assigns every leftover unit largest-fraction-first and names who absorbed it, then settles the group in the fewest transfers. Per-day-*elapsed* averages, not per-day-in-month. |
| Voice Memos | [`components/Voice/`](./src/components/Voice) | MediaRecorder + the browser's speech recognition, restarted automatically because it stops mid-recording on its own. The transcript is the feature: it's what makes audio searchable, and when the storage cap is hit it's the *audio* that's dropped and the transcript kept. Transcription is off by default and says why. |
| Convert | [`components/Convert/`](./src/components/Convert) | Twelve unit categories plus currency. Temperature carries an offset and L/100km is a reciprocal, so both are functions rather than bent factors ([`lib/Convert/units.ts`](./src/lib/Convert/units.ts)). Rates come from `/api/rates` (ECB) and are cached with their **publish date shown**, so a stale rate can't pass for a live one. |
| API Client | [`components/Api/`](./src/components/Api) | Request builder, response viewer and a curl line. The relay ([`app/api/relay/route.ts`](./src/app/api/relay/route.ts)) is the security-critical piece: SSRF-guarded by [`lib/Api/guard.ts`](./src/lib/Api/guard.ts) — scheme, port allowlist, no URL credentials, and every **resolved** address checked against private/loopback/link-local/metadata ranges (IPv4-mapped IPv6 included), with redirects reported rather than followed. History is never written to disk, because requests carry tokens. |
| Snippets | [`components/Snippets/`](./src/components/Snippets) | One flat list, one query spanning titles/tags/languages/bodies (`#tag`, `lang:go`), copy on every card. Highlighted by a small token-array tokeniser ([`lib/code-highlight.ts`](./src/lib/code-highlight.ts)) rendered as spans — no highlighting dependency and no `innerHTML`. |
| Markdown | [`components/Markdown/`](./src/components/Markdown) | Hand-written parser ([`lib/Markdown/parse.ts`](./src/lib/Markdown/parse.ts)) producing a **typed node tree, never an HTML string** — so there's no sanitiser to get wrong and `javascript:` targets render as text. Mermaid is imported inside the effect, so a document without a diagram never downloads the engine. Exports .md or a standalone, style-inlined HTML file. |
| Chrono | [`components/Chrono/`](./src/components/Chrono) | Cron explained in English *and* its next runs as real dates (the only check that catches a misunderstanding rather than a typo), including cron's either-or day rule; timestamps in every form with the unit it guessed stated out loud; duration parsing and arithmetic. All covered by [`chrono.test.ts`](./src/lib/Chrono/chrono.test.ts). |
| Contrast | [`components/Contrast/`](./src/components/Contrast) | WCAG grading with the **nearest passing shade** (linear-light lightness walk, so hue survives), a 50–950 ramp exporting to CSS / Tailwind v4 `@theme` / SCSS / JSON, and colour-vision simulation that *measures* which pairs collapse instead of asking you to look. Built on the shared [`lib/color.ts`](./src/lib/color.ts) the theme picker uses, so verdicts can't disagree. |

### Files larger than memory

File Drop has no size ceiling, which takes four things — none of them optional:

- **Neither side ever holds the file.** The sender reads slices (`File.slice` is a view on
  disk, not a copy) one chunk ahead of the wire; the receiver writes each chunk straight
  out. Peak memory is a couple of chunks at any file size.
- **Backpressure in both directions.** The data channel's buffer governs the wire, and the
  receiver sends `pause`/`resume` when its disk falls behind — without that second signal a
  fast link piles chunks up in memory until the tab dies.
- **Somewhere to put it.** A picked folder streams to disk and can resume; otherwise the page
  hands the service worker a `ReadableStream` and the browser downloads *from that*, so
  Firefox and Safari get a no-ceiling path too ([`stream-download.ts`](./src/lib/FileDrop/stream-download.ts)).
  Collecting into a `Blob` is only ever the last resort, and the UI says so beforehand.
- **Resume.** A partial file on disk is hashed back and continued from, so a dropped 5 GB
  transfer costs seconds rather than starting again.

## Offline & low-bandwidth support

The whole workspace is usable with a weak connection or none at all. Four pieces:

| Piece | File | Job |
| --- | --- | --- |
| Service worker | [`public/sw.js`](./public/sw.js) | Precaches every app route's HTML; cache-first for hashed build output; network-first **with a timeout** for navigations (3.5s) and `/api/*` GETs (6s), so a slow link paints saved content instead of spinning. Also caches news logos and serves the last good news/translation response offline. |
| Warm-up | [`src/lib/offline/warmup.ts`](./src/lib/offline/warmup.ts) | Imports every code-split app once, at idle, so *all* apps are cached — not just the ones visited. Skipped on metered / 2g-class links; forced from **Settings → Offline**. Loaders live in [`app-modules.ts`](./src/lib/offline/app-modules.ts) and are shared with `Workspace.tsx`, so the warmed chunks are exactly the ones the app requests. |
| Network state | [`src/lib/net/status.ts`](./src/lib/net/status.ts), [`fetch.ts`](./src/lib/net/fetch.ts) | One snapshot of `online` / `slow` (data-saver, effective type, downlink) behind `useNetworkStatus()`, plus `fetchJson` with timeouts and user-ready error messages. |
| Offline UI | [`src/components/Offline/`](./src/components/Offline) | App-wide connection pill, and one shared notice used by every network-dependent feature (News, online translate, handwriting, speed test, public IP). |

Apps that are fully local — Sketchnotes, PDF Editor, Image Studio, Todos,
Reminders, Timer, System Info, QR Codes, Handoff, Malayalam typing, on-device
Translate, Assistant — behave identically offline, and both File Drop's
same-network mode and Clone's cable and no-network routes contact nothing
outside the two devices. The rest degrade explicitly rather
than failing silently. The worker is registered in production only (in dev it
would fight HMR).

## Checks

`npm run verify` is the gate: typecheck, lint, tests, then three checks that exist because
the mistakes they catch are silent — nothing throws, nothing fails to compile, and the app
looks fine on the machine that made the change.

| Command | What it catches |
| --- | --- |
| `npm run check:registry` | A half-registered app. Adding one touches ~12 files; five are `Record<AppId, …>` maps the compiler guards, and the rest fail quietly. This checks that every app id is in **both** the `AppId` union and `ALL_APPS`, that its route is in the worker's `SHELL_URLS` and in `public/llms.txt`, that it has an `--app-<id>` hue in **both** the light and dark token block, that `site.ts` covers it (sitemap, metadata, `SeoContent`, `StructuredData`), that no storage-key owner rule is shadowed by an earlier one — and, once built, that `precache-manifest.json` lists real chunks. |
| `npm run check:sw` | `public/sw.js` edited without bumping `VERSION`. The caches are named after it, so without the bump every existing install keeps its old precache: a route added to `SHELL_URLS` 404s offline for returning visitors and reproduces on nobody's machine. Compares against a git ref (`-- --base=origin/master`). |
| `npm run check:themes` | A preset palette below WCAG AA on any pair that carries text. |

`npm run audit` runs Lighthouse against a production build and holds the rule #7 baseline —
Accessibility 94, Best Practices 100, SEO 91. It starts its own server on :3100, so a dev
server on :3000 is left alone:

```bash
npm run build
npm run audit                                       # / on mobile emulation
npm run audit -- --routes=/,/pdfeditor --runs=3     # median of three, per route
npm run audit -- --perf=85                          # gate Performance too
```

Performance is measured and printed but not gated by default: rule #7's 99 is the deployed
site's score, and the same commit served by `next start` locally or on a CI runner lands in
the 70s–80s for reasons that have nothing to do with the code. Pass `--perf=N` to hold a
floor when comparing two commits on one machine. The other three categories are
deterministic — a drop there is a real regression anywhere.

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs `verify` plus the build on
every push and pull request. Lighthouse is a manual (`workflow_dispatch`) job in the same
file, for the reason above.

## Tests

`npm test` runs [Vitest](https://vitest.dev) over the workspace's pure logic — no DOM, no
renderer, under a second:

- the two plain-English parsers ([Board](./src/lib/Board/commands.test.ts),
  [Assistant](./src/lib/Assistant/commands.test.ts)), whose accepted phrasings are published
  in `public/llms.txt` and are therefore a contract;
- the [QR frame protocol](./src/lib/qr/frames.test.ts) — frames read out of order, repeated,
  interleaved with another sender, and corrupted;
- [connection codes](./src/lib/rtc/code.test.ts) and
  [File Drop's framing, checksums and name sanitiser](./src/lib/FileDrop/filedrop.test.ts) —
  including that a half-copied code says so, and that a file name from another device can't
  escape the folder it was told to write into;
- the [clone reader and its plan](./src/lib/Clone/clone.test.ts), which decides what an
  arriving clone would overwrite or delete on the device it lands on;
- the [backup reader](./src/lib/backup/backup.test.ts) and
  [key attribution](./src/lib/storage-keys.test.ts), which decide what is written into
  storage;
- [QR payload formats](./src/lib/qr/payload.test.ts), including that a scanned code can
  never produce a `javascript:` link;
- [canvas geometry](./src/engine/geometry.test.ts) and the
  [palette ranking](./src/lib/palette/match.test.ts).

Components are deliberately not covered: they would need a DOM environment and a testing
library, and the UI is verified in a real browser instead.
