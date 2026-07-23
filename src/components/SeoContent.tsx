import { APPS, SITE_ALIASES, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * Server-rendered, crawlable content for an otherwise fully client-rendered
 * workspace. Without this, search engines see an empty <body> and have nothing
 * to rank the "OneApp" brand on. It's a real semantic landmark (H1 + intro +
 * tool list) that accurately describes the page, visually hidden with `sr-only`
 * so it never affects the app UI while remaining available to crawlers and
 * screen readers. Rendered once, at `/`.
 */
export function SeoContent() {
  return (
    <div className="sr-only">
      <header>
        <h1>
          {SITE_NAME} — {SITE_TAGLINE}
        </h1>
        <p>
          {SITE_NAME} (also known as {SITE_ALIASES.join(", ")}) is a free, offline-first web
          workspace that brings every everyday tool together in one place. No sign-up, no
          installation, and all your data stays private in your own browser. Works fully offline
          after your first visit.
        </p>
      </header>
      <nav aria-label="OneApp tools">
        <h2>Tools included in OneApp</h2>
        <ul>
          {APPS.map((app) => (
            <li key={app.path}>
              <a href={app.path}>
                {app.name}
              </a>
              {` — ${app.blurb}.`}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
