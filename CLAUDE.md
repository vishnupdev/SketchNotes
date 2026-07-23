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

## Verify before finishing
Run and pass: `npm run typecheck`, `npm run lint`, and (for non-trivial changes) `npm run build`.
For UI/route/content changes, also confirm the rule #7 scores are not regressed (Performance,
Accessibility, Best Practices, SEO, Agentic Browsing).
