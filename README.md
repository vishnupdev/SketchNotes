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
- **TanStack Query** treats `localStorage` as an async data source: the notes
  index is a query; save / create / delete are mutations that keep the cache in
  sync. Swapping in IndexedDB or a backend only touches `lib/notes-api.ts`.

### Persistence

Notes live in `localStorage` under `sknotes:*` keys (see `lib/storage.ts`), with
an in-memory fallback when storage is unavailable. Legacy notes from the original
app load unchanged.

## Offline & low-bandwidth support

The whole workspace is usable with a weak connection or none at all. Four pieces:

| Piece | File | Job |
| --- | --- | --- |
| Service worker | [`public/sw.js`](./public/sw.js) | Precaches every app route's HTML; cache-first for hashed build output; network-first **with a timeout** for navigations (3.5s) and `/api/*` GETs (6s), so a slow link paints saved content instead of spinning. Also caches news logos and serves the last good news/translation response offline. |
| Warm-up | [`src/lib/offline/warmup.ts`](./src/lib/offline/warmup.ts) | Imports every code-split app once, at idle, so *all* apps are cached — not just the ones visited. Skipped on metered / 2g-class links; forced from **Settings → Offline**. Loaders live in [`app-modules.ts`](./src/lib/offline/app-modules.ts) and are shared with `Workspace.tsx`, so the warmed chunks are exactly the ones the app requests. |
| Network state | [`src/lib/net/status.ts`](./src/lib/net/status.ts), [`fetch.ts`](./src/lib/net/fetch.ts) | One snapshot of `online` / `slow` (data-saver, effective type, downlink) behind `useNetworkStatus()`, plus `fetchJson` with timeouts and user-ready error messages. |
| Offline UI | [`src/components/Offline/`](./src/components/Offline) | App-wide connection pill, and one shared notice used by every network-dependent feature (News, online translate, handwriting, speed test, public IP). |

Apps that are fully local — Sketchnotes, PDF Editor, Image Studio, Todos,
Reminders, Timer, System Info, Malayalam typing, on-device Translate, Assistant —
behave identically offline. The rest degrade explicitly rather than failing
silently. The worker is registered in production only (in dev it would fight HMR).
