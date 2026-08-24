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
| File Drop | [`components/FileDrop/`](./src/components/FileDrop) | Send files of any size device-to-device over WebRTC — same network with no internet, or across networks via STUN. Streamed in chunks with backpressure both ways, verified per file, written into a chosen folder or streamed to disk through the service worker; an interrupted transfer resumes. |

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
Translate, Assistant — behave identically offline, and File Drop's
same-network mode contacts nothing outside it. The rest degrade explicitly rather
than failing silently. The worker is registered in production only (in dev it
would fight HMR).

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
- the [backup reader](./src/lib/backup/backup.test.ts) and
  [key attribution](./src/lib/storage-keys.test.ts), which decide what is written into
  storage;
- [QR payload formats](./src/lib/qr/payload.test.ts), including that a scanned code can
  never produce a `javascript:` link;
- [canvas geometry](./src/engine/geometry.test.ts) and the
  [palette ranking](./src/lib/palette/match.test.ts).

Components are deliberately not covered: they would need a DOM environment and a testing
library, and the UI is verified in a real browser instead.
