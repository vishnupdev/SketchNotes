# Project Rules — Sketchnotes Workspace

This repo is a **multi-app workspace**: several independent web apps (Sketchnotes, PDF Editor,
Image Studio) share one Next.js shell. The rules below are mandatory for all work in this repo.

## 1. Always use the latest packages
- Install/upgrade to the latest stable versions. Do not pin to older majors without a stated reason.
- When adding a dependency, use the current stable release; prefer it over an older one an example uses.
- Keep the existing stack current: Next.js 15+, React 19+, Tailwind v4+, Zustand v5+, TanStack Query v5+.

## 2. Follow the project standard stack — no substitutes
- **Framework:** Next.js (App Router, `src/app/`). Server/client boundaries respected (`"use client"`).
- **Styling:** Tailwind CSS **v4** (CSS-first config via `@theme` in `src/app/globals.css`). No CSS-in-JS,
  no styled-components, no separate `tailwind.config` unless the v4 CSS approach can't express it.
- **Atomic architecture:** UI is composed as **atoms → molecules → organisms**, mirroring
  `src/components/SketchNotes/{atoms,molecules,organisms}/`. New app UI follows the same layering.
- **State:** **Zustand** for client/UI state (`src/store/`). One store per concern.
- **Server/async state:** **TanStack Query** for data fetching/caching (`src/hooks/useNotes.ts`,
  `src/lib/query-keys.ts`). Do not hand-roll fetch caching or dump server data into Zustand.
- **Component reusability:** Before writing new UI, reuse/extend existing atoms & molecules. Extract shared
  pieces up to a common location rather than copy-pasting. Prefer small, composable, prop-driven components.

## 3. Mobile-responsive web app (required)
- Every screen must work on mobile viewports first, then scale up. Design mobile-first.
- Use responsive Tailwind utilities and fluid layouts (flex/grid, `min-w-0`, `min-[…]:` breakpoints as in
  `AppLauncher.tsx`). Ensure touch targets, safe scrolling, and no horizontal overflow on small screens.
- Test/consider layout at narrow widths (~360px) as well as desktop.

## 4. Keep each app in its own path/namespace
- Each app owns dedicated directories. Never scatter an app's code into another app's folders.
  - Components: `src/components/<AppName>/` — e.g. `SketchNotes/`, `PdfEditor/`, `ImageStudio/`.
  - App-specific libs/helpers: `src/lib/<AppName>/` — e.g. `lib/PdfEditor/`, `lib/image/`.
  - Routing/deep links use the app's path segment, e.g. **`/pdfeditor`** and `/pdfeditor/<section>`
    (URL is derived inside `src/components/Workspace.tsx`).
- New apps are registered in `src/store/useWorkspaceStore.ts` (`AppId`) and `AppLauncher.tsx`.
- A new app also needs its walkaround tour — see rule #8.
- Naming: use the app's namespace consistently across components, lib, store, and routes.

## 5. App isolation — changing one app must not break another
- Apps must not import each other's internals. Cross-app sharing goes through **shared/common** locations
  only (generic atoms in `SketchNotes/atoms/` used app-wide, `src/lib/utils.ts`, `src/engine/` primitives).
- Keep per-app state in that app's own store slice; avoid global state that couples apps together.
- When editing a feature, confine changes to that app's directories. If a change must touch shared code,
  call it out explicitly and verify the other apps still build and behave (`npm run typecheck`, `npm run lint`, `npm run build`).
- Prefer adding to shared code over mutating shared behavior that other apps depend on.

## 6. Standardize the theme — no hardcoded colors
- All colors/spacing/shadows come from the theme tokens defined in `src/app/globals.css`
  (`--paper`, `--ink`, `--panel`, `--border`, `--accent`, `--text`, `--shadow`, …), consumed as Tailwind
  utilities: `bg-panel`, `text-ink-soft`, `border-border`, `bg-accent`, `shadow-panel`, etc.
- **Never** hardcode hex/rgb colors in components. Add a token to `globals.css` if a new value is needed.
- Dark mode is driven by `[data-theme="dark"]`. Every new token must define both light and dark values so
  theming stays consistent across all apps.

## 7. Maintain quality scores — Performance, Accessibility, Best Practices, SEO, Agentic Browsing
Every code change must **preserve or improve** these audit scores. Treat them as acceptance criteria,
not afterthoughts. Current baseline to hold at or above: **Performance 99, Accessibility 94,
Best Practices 100, SEO 91, Agentic Browsing 2/3** (goal: 3/3).

- **Performance (Core Web Vitals):** Ship minimal client JS — keep components server-side unless they need
  `"use client"`. Lazy-load / `dynamic()` heavy or below-the-fold pieces. Use `next/image` (or sized,
  `loading="lazy"` images) with explicit `width`/`height` to avoid CLS. No layout-shifting async inserts;
  no blocking scripts. Prefer CSS/transform animations over JS. Watch bundle size when adding deps (rule #1).
- **Accessibility:** Semantic HTML first; ARIA only to fill gaps. Every interactive element is keyboard-
  reachable with a visible focus state. Label all controls/icon-buttons (`aria-label`), associate inputs
  with `<label>`, give images meaningful `alt`. Maintain WCAG AA contrast using theme tokens (rule #6).
  Respect `prefers-reduced-motion`. Correct heading order; one `<h1>` per page.
- **Best Practices:** No console errors/warnings. HTTPS-only assets. Valid, non-deprecated HTML/APIs.
  Correct `rel="noopener"` on `target="_blank"`. No hardcoded secrets. Keep dependencies current (rule #1).
- **SEO:** Provide per-route `metadata` (title, description, canonical, Open Graph). Keep
  `src/app/sitemap.ts`, `src/app/robots.ts`, and structured data (`src/components/StructuredData.tsx`)
  accurate when routes/content change. Descriptive link text; crawlable, mobile-friendly markup (rule #3).
- **Agentic Browsing:** Keep `public/llms.txt` and machine-readable metadata
  (`src/components/SeoContent.tsx`, JSON-LD in `StructuredData.tsx`, `public/manifest.webmanifest`) current
  so agents can parse the app. When adding a route/app/feature, update these so they describe it.

## 8. Every app carries a walkaround — and it has to stay true
Walkaround (`/walkaround`) is the guided tour of each app: one `Tour` per `AppId` in
`src/lib/Walkaround/tours.ts`, played as tooltips over a **schematic** of that app's screen.

- **New app → author its tour.** `TOURS` is `Record<AppId, Tour>`, so a new id is a type error until
  you do. Give it 3–6 stops covering what someone arriving cold would not find on their own.
- **Changed app → update its tour.** This is the half nothing can catch, and the reason this rule
  exists. Renaming a tab, adding a panel, moving or removing a control leaves a tour that still
  typechecks, still passes its tests, and now confidently describes a screen that is no longer there
  — the worst failure a help feature has, because it is *believed*. If your change alters what a user
  sees, re-read that app's `layout.blocks` / `layout.tabs` and every step that points at them.
- **Anchors, never selectors.** A step points at `brand`, `apps`, `body`, `body:<n>` or `tab:<n>` on
  the schematic. Walkaround holds no selectors into any other app's DOM and reads none of their state
  (rule #5) — which is exactly why it can never break the app it describes, and why the schematic has
  to be maintained by hand.
- **A stop needs both halves.** `direction` says where the thing is and what it does; `suggestion` is
  the shortcut, the combination or the caveat a reader would otherwise discover on their third visit.
  A stop that only restates a label already on screen is not worth a stop.
- Keep the facts consistent with `src/lib/Assistant/knowledge.ts` — two guides that disagree about the
  same app are worse than one.
- `npm test` covers the mechanical half only: that every authored anchor resolves against that app's
  layout and every tooltip lands on the stage. No check can tell you the words are still accurate.

## Verify before finishing
Run and pass **`npm run verify`** — typecheck, lint, tests, then the three checks for the
failures that are otherwise silent: `check:registry` (a half-registered app — launcher, offline
shell, brand hue, SEO entry, storage owner), `check:sw` (worker edited without a `VERSION` bump)
and `check:themes` (a palette below WCAG AA). For non-trivial changes also run `npm run build`.

For UI/route/content changes, confirm the rule #7 scores are not regressed: `npm run audit`
(Lighthouse against a production build; holds Accessibility 94 / Best Practices 100 / SEO 91 and
reports Performance) plus a check that `public/llms.txt` still describes what changed for the
Agentic Browsing score. CI runs the same commands — see `.github/workflows/ci.yml`.

If you changed what an app *looks like*, also re-read that app’s entry in
`src/lib/Walkaround/tours.ts` (rule #8). The suite checks that every tour still points somewhere
real; it cannot check that the tour still describes the screen.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
