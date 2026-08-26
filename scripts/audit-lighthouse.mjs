/**
 * Runs Lighthouse against a production build and fails below the scores this
 * project has committed to holding.
 *
 * CLAUDE.md rule #7 states a baseline — Performance 99, Accessibility 94, Best
 * Practices 100, SEO 91 — and calls it acceptance criteria. Until now it was a
 * number in a document, checked by hand when someone remembered. This makes it
 * a command, so "did that change cost us a point" has an answer before the
 * change ships rather than after.
 *
 *   npm run build              # the worker and the chunk manifest need a build
 *   npm run audit              # audits / on mobile emulation
 *   npm run audit -- --routes=/,/pdfeditor,/todos --runs=3 --desktop
 *
 * Flags:
 *   --routes=a,b   routes to audit (default `/`, the route the baseline was set on)
 *   --runs=N       audit each route N times and take the median score (default 1)
 *   --desktop      desktop emulation instead of Lighthouse's default mobile
 *   --port=N       port to serve the build on (default 3100, chosen to leave a
 *                  dev server on :3000 alone)
 *   --url=ORIGIN   audit an already-running server instead of starting one
 *   --json=PATH    write the full score table as JSON
 *
 * A word on the numbers, because a red run that means nothing is worse than no
 * check at all: Performance is measured on simulated throttling and moves with
 * the machine underneath it. A shared CI runner scores several points lower than
 * a developer laptop for identical code. So this is a local gate and a manual CI
 * job, not something that fails a pull request — and Accessibility, Best
 * Practices and SEO, which are the deterministic ones, are the categories where
 * a drop is always a real regression.
 */

import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * The baseline from CLAUDE.md rule #7. A floor, not a target: when a score is
 * beaten durably, raise the number here so the gain cannot be lost silently.
 *
 * Performance is deliberately not in this table. Rule #7's 99 is the *deployed*
 * site's score — a CDN, a warm edge cache and a real device profile — and the
 * same commit served by `next start` on a laptop or a CI runner scores in the
 * 80s for reasons that have nothing to do with the code. Gating on it would
 * make every run red and teach everyone to ignore the check, so Performance is
 * measured and printed, and only gated when a floor is passed in
 * (`--perf=85`), which is what makes it useful for comparing two commits on one
 * machine. The three categories below are deterministic: a drop is a real
 * regression wherever it is measured.
 */
const BASELINE = {
  accessibility: 94,
  "best-practices": 100,
  seo: 91,
};

/** Every category audited — Performance included, gated only on request. */
const CATEGORIES = ["performance", ...Object.keys(BASELINE)];

/* --------------------------------- flags --------------------------------- */

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const routes = (flag("routes", "/") ?? "/").split(",").map((r) => r.trim()).filter(Boolean);

// Git Bash rewrites an argument that looks like a POSIX path into a Windows one,
// so `--routes=/,/todos` can arrive as `--routes=C:/Program Files/Git/,/todos`
// and the URL built from it is nonsense Lighthouse reports as INVALID_URL.
// Caught here, with the fix, rather than 40 seconds later as a stack trace.
const mangled = routes.filter((route) => !route.startsWith("/"));
if (mangled.length) {
  console.error(`[audit] not a route: ${mangled.join(", ")}`);
  console.error("        In Git Bash, prefix the command with MSYS_NO_PATHCONV=1 (or use PowerShell).");
  process.exit(1);
}
const runs = Math.max(1, Number(flag("runs", "1")) || 1);
const port = Number(flag("port", "3100")) || 3100;
const externalUrl = flag("url");
const jsonOut = flag("json");
const desktop = has("desktop");

/** Floors actually enforced this run: rule #7's three, plus Performance if asked. */
const floors = { ...BASELINE };
const perfArg = flag("perf") ?? process.env.AUDIT_PERF_FLOOR ?? null;
if (perfArg !== null && Number.isFinite(Number(perfArg))) floors.performance = Number(perfArg);

const origin = (externalUrl ?? `http://localhost:${port}`).replace(/\/$/, "");

/* -------------------------------- the build ------------------------------ */

/** Wait for the server to answer, so the first audit is not of a cold miss. */
async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/**
 * Serve the existing production build. Next's CLI is invoked through node
 * directly rather than through `npx`, so the same call works on Windows and on
 * a CI runner without a shell in between.
 */
async function startServer() {
  if (!existsSync(new URL("../.next", import.meta.url))) {
    throw new Error("no .next build found — run `npm run build` first");
  }

  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    { cwd: ROOT, env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] },
  );

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));

  const exited = once(child, "exit").then(([code]) => {
    throw new Error(`next start exited early (code ${code})\n${log.trim()}`);
  });

  const ready = waitForServer(`${origin}/`).then((ok) => {
    if (!ok) throw new Error(`server did not answer on ${origin} within 60s\n${log.trim()}`);
  });

  await Promise.race([ready, exited]);
  return child;
}

/**
 * Stop the server and anything it started. `next start` runs its render work in
 * child processes, and on Windows killing the parent leaves them holding the
 * port — so the whole tree goes, which is what `taskkill /T` is for.
 */
function stopServer(child) {
  if (process.platform === "win32" && child.pid) {
    try {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {
      // fall through to the portable path
    }
  }
  child.kill();
}

/* -------------------------------- auditing ------------------------------- */

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/** One Lighthouse pass, as whole-number scores per category. */
async function audit(chromePort, url) {
  const result = await lighthouse(
    url,
    { port: chromePort, output: "json", logLevel: "error", onlyCategories: CATEGORIES },
    desktop ? { extends: "lighthouse:default", settings: { formFactor: "desktop", screenEmulation: { disabled: true } } } : undefined,
  );
  if (!result?.lhr) throw new Error(`Lighthouse returned no result for ${url}`);

  const scores = {};
  for (const key of CATEGORIES) {
    const score = result.lhr.categories[key]?.score;
    // A category can come back null when its audits could not run at all —
    // reported as 0 rather than skipped, so it cannot pass by being absent.
    scores[key] = score === null || score === undefined ? 0 : Math.round(score * 100);
  }
  return scores;
}

/* --------------------------------- report -------------------------------- */

const label = (key) => ({ performance: "Perf", accessibility: "A11y", "best-practices": "BP", seo: "SEO" })[key];

let server = null;
let chrome = null;
const table = [];

try {
  if (!externalUrl) server = await startServer();
  else console.log(`[audit] using the server already on ${origin}`);

  chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  console.log(
    `[audit] ${desktop ? "desktop" : "mobile"} emulation · ${routes.length} route(s) × ${runs} run(s)\n`,
  );

  for (const route of routes) {
    const url = `${origin}${route}`;
    // Render the route once before measuring it. The first request to a cold
    // `next start` pays for work no visitor of the deployed site pays for, and
    // Performance is the score that absorbs it.
    await fetch(url).then((r) => r.arrayBuffer()).catch(() => {});

    const passes = [];
    for (let i = 0; i < runs; i += 1) passes.push(await audit(chrome.port, url));

    const scores = Object.fromEntries(
      CATEGORIES.map((key) => [key, median(passes.map((p) => p[key]))]),
    );
    table.push({ route, scores });

    const cells = CATEGORIES.map((key) => {
      const score = scores[key];
      const floor = floors[key];
      const failed = floor !== undefined && score < floor;
      return `${label(key)} ${String(score).padStart(3)}${failed ? `/${floor} FAIL` : ""}`;
    });
    console.log(`  ${route.padEnd(12)} ${cells.join("  ")}`);
  }
} finally {
  // `kill()` is synchronous in chrome-launcher, and a failure here must not
  // replace the audit's own result with a teardown error.
  try {
    chrome?.kill();
  } catch {
    /* already gone */
  }
  if (server) stopServer(server);
}

if (jsonOut) {
  await writeFile(jsonOut, JSON.stringify({ origin, desktop, runs, floors, results: table }, null, 2) + "\n", "utf8");
  console.log(`\n[audit] wrote ${jsonOut}`);
}

const gated = CATEGORIES.filter((key) => floors[key] !== undefined);

const below = table.flatMap(({ route, scores }) =>
  gated
    .filter((key) => scores[key] < floors[key])
    .map((key) => `${route} ${label(key)} ${scores[key]} < ${floors[key]}`),
);

if (below.length) {
  console.error(`\n${below.length} score(s) below the rule #7 baseline:\n`);
  for (const line of below) console.error(`  x  ${line}`);
  console.error("\nPerformance moves with the machine; the other three categories are deterministic.");
} else {
  console.log(
    `\nAll ${table.length * gated.length} gated score(s) at or above the baseline` +
      (floors.performance === undefined ? " (Performance reported only — pass --perf=N to gate it)." : "."),
  );
}

process.exitCode = below.length ? 1 : 0;
