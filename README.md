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
