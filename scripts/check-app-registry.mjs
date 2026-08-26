/**
 * Checks the app registry for the mistakes the compiler cannot see.
 *
 * Adding an app to this workspace touches about a dozen files. Five of them are
 * `Record<AppId, …>` maps, so forgetting one is a type error and `npm run
 * typecheck` names it. The rest fail *silently*: the launcher chip renders
 * transparent, the route 404s offline for everyone who already has the worker
 * installed, the app's data is attributed to Sketchnotes in every backup, and
 * agents reading `llms.txt` never learn the app exists. Nothing throws, so a
 * typecheck-clean, lint-clean, green-build app can ship half-registered.
 *
 * This script is that silent half of the checklist, as a check:
 *
 *   1. The `AppId` union and `ALL_APPS` hold the same ids — an id missing from
 *      the array compiles fine and is simply absent from the launcher.
 *   2. Every app's route is in the service worker's `SHELL_URLS`.
 *   3. Every app's route is documented in `public/llms.txt` (rule #7's Agentic
 *      Browsing score is read from that file).
 *   4. Every app has an `--app-<id>` brand hue in *both* the light and the dark
 *      token block of `globals.css`.
 *   5. `site.ts` `APPS` covers exactly the routes `Workspace.tsx` serves — that
 *      one entry drives the sitemap, per-route metadata, `SeoContent` and
 *      `StructuredData` together.
 *   6. No storage-key owner rule is shadowed by an earlier one. The bare
 *      `sknotes:` prefix belongs to Sketchnotes and swallows anything listed
 *      after it, which misattributes an app's data in every backup and clone.
 *   7. When a build has run, `public/precache-manifest.json` exists and lists
 *      real assets — without it the worker has no chunk list to precache.
 *
 * The sources are read as text rather than imported: they are TypeScript, and a
 * plain node script has no pipeline to compile them. That makes the parsing
 * deliberately literal — if one of the declarations below is reshaped, this
 * script reports that it could not find it rather than quietly passing.
 *
 * Run: node scripts/check-app-registry.mjs   (or `npm run check:registry`)
 */

import { readFile } from "node:fs/promises";

const at = (path) => new URL(`../${path}`, import.meta.url);

const SRC = {
  store: "src/store/useWorkspaceStore.ts",
  workspace: "src/components/Workspace.tsx",
  site: "src/lib/site.ts",
  css: "src/app/globals.css",
  keys: "src/lib/storage-keys.ts",
  sw: "public/sw.js",
  llms: "public/llms.txt",
  manifest: "public/precache-manifest.json",
};

const read = (key) => readFile(at(SRC[key]), "utf8");

/* ------------------------------- reporting ------------------------------- */

const problems = [];
const notes = [];
let passed = 0;

/** Record a failed expectation, naming the file that has to change. */
const fail = (file, message) => problems.push(`${file}: ${message}`);

/** A check ran and passed — counted so the summary proves coverage. */
const pass = (label) => {
  passed += 1;
  notes.push(`  ok  ${label}`);
};

/** A check could not run (nothing built yet, or a declaration moved). */
const skip = (label, why) => notes.push(`  --  ${label} (${why})`);

/* -------------------------------- parsing -------------------------------- */

/**
 * The body of a bracket- or brace-delimited declaration, found by matching the
 * opener that follows `anchor` with its partner. Depth-counted rather than
 * regexed, so a nested array or object inside the body does not end it early.
 */
function bodyAfter(text, anchor, open = "[", close = "]") {
  const start = text.indexOf(anchor);
  if (start === -1) return null;
  const from = text.indexOf(open, start + anchor.length);
  if (from === -1) return null;

  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === open) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return text.slice(from + 1, i);
    }
  }
  return null;
}

/** Every double-quoted string in a fragment, in source order. */
const quoted = (fragment) => [...fragment.matchAll(/"([^"\\]*)"/g)].map((m) => m[1]);

/**
 * The selector of a matched rule, reduced to just the selector: the comments
 * and the previous rule's closing brace that the match ran back through are
 * dropped, and the remaining line breaks (a selector list spans lines here) are
 * collapsed to single spaces.
 */
const selectorOf = (raw) =>
  raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/[};]/)
    .pop()
    .trim()
    .replace(/\s+/g, " ");

/**
 * A CSS rule body, chosen by a predicate over its selector. Only rules whose
 * selector starts at column 0 are considered — which is every base rule in this
 * stylesheet, and none of the ones nested inside `@media`.
 */
function cssBlock(css, matches) {
  for (const m of css.matchAll(/^([^\s@{][^{]*)\{/gm)) {
    if (!matches(selectorOf(m[1]))) continue;
    const from = m.index + m[0].length;
    let depth = 1;
    for (let i = from; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) return css.slice(from, i);
      }
    }
  }
  return null;
}

const list = (items) => items.join(", ");

/* -------------------------------- 1. ids --------------------------------- */

const store = await read("store");

const unionSrc = store.match(/export type AppId =([^;]*);/);
const allAppsSrc = bodyAfter(store, "const ALL_APPS: AppId[]");

/** Every app id in the workspace — the spine every check below hangs on. */
let appIds = [];

if (!unionSrc || !allAppsSrc) {
  fail(SRC.store, "could not find the `AppId` union and the `ALL_APPS` declaration");
} else {
  const union = quoted(unionSrc[1]);
  const all = quoted(allAppsSrc);
  appIds = union;

  const unlaunched = union.filter((id) => !all.includes(id));
  const unknown = all.filter((id) => !union.includes(id));
  const twice = all.filter((id, i) => all.indexOf(id) !== i);

  if (unlaunched.length) {
    fail(SRC.store, `in the \`AppId\` union but not in ALL_APPS — absent from the launcher: ${list(unlaunched)}`);
  }
  if (unknown.length) fail(SRC.store, `in ALL_APPS but not in the \`AppId\` union: ${list(unknown)}`);
  if (twice.length) fail(SRC.store, `listed twice in ALL_APPS: ${list(twice)}`);
  if (!unlaunched.length && !unknown.length && !twice.length) {
    pass(`${union.length} app ids, in both the \`AppId\` union and ALL_APPS`);
  }
}

/* ------------------------------- 2. routes ------------------------------- */

const workspace = await read("workspace");
const pathsSrc = bodyAfter(workspace, "const APP_PATHS: Record<AppId, string>", "{", "}");

/** id → route. The table the route checks below are all measured against. */
const routes = new Map();

if (!pathsSrc) {
  fail(SRC.workspace, "could not find the `APP_PATHS` declaration");
} else {
  for (const m of pathsSrc.matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) routes.set(m[1], m[2]);

  // Typecheck catches a missing entry here. Checked anyway, because every route
  // check below reads this table and a partial one narrows their coverage.
  const routeless = appIds.filter((id) => !routes.has(id));
  if (routeless.length) fail(SRC.workspace, `no route in APP_PATHS: ${list(routeless)}`);
  else pass(`${routes.size} routes in APP_PATHS`);
}

const appRoutes = [...routes.values()];

/* --------------------- 3. offline shell and llms.txt --------------------- */

const sw = await read("sw");
const shellSrc = bodyAfter(sw, "const SHELL_URLS");

if (!shellSrc) {
  fail(SRC.sw, "could not find the `SHELL_URLS` declaration");
} else if (appRoutes.length) {
  const shell = quoted(shellSrc);
  const unprecached = appRoutes.filter((route) => !shell.includes(route));
  const stale = shell.filter((route) => !appRoutes.includes(route));

  if (unprecached.length) {
    fail(SRC.sw, `route missing from SHELL_URLS — 404s offline: ${list(unprecached)} (add it, then bump VERSION)`);
  }
  if (stale.length) fail(SRC.sw, `SHELL_URLS precaches a route no app serves: ${list(stale)}`);
  if (!unprecached.length && !stale.length) pass(`${shell.length} routes precached by the service worker`);
}

const llms = await read("llms");

if (appRoutes.length) {
  const documented = new Set([...llms.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]));
  const undocumented = appRoutes.filter((route) => !documented.has(route));
  if (undocumented.length) fail(SRC.llms, `route not described for agents: ${list(undocumented)}`);
  else pass(`${appRoutes.length} routes described in llms.txt`);
}

/* ----------------------------- 4. brand hues ----------------------------- */

const css = await read("css");
const light = cssBlock(css, (selector) => selector.includes(":not([data-dark])"));
const dark = cssBlock(css, (selector) => selector === "[data-dark]");

if (!light || !dark) {
  fail(SRC.css, "could not find the light and dark base token blocks");
} else if (appIds.length) {
  const hueless = appIds.filter((id) => {
    const token = new RegExp(`--app-${id}\\s*:`);
    return !token.test(light) || !token.test(dark);
  });
  if (hueless.length) {
    fail(
      SRC.css,
      `no --app-<id> hue in both the light and the dark block — the launcher chip renders transparent: ${list(hueless)}`,
    );
  } else pass(`${appIds.length} brand hues defined in both themes`);
}

/* ------------------------------ 5. SEO apps ------------------------------ */

const site = await read("site");
const appsSrc = bodyAfter(site, "export const APPS: AppEntry[]");

if (!appsSrc) {
  fail(SRC.site, "could not find the `APPS` declaration");
} else if (appRoutes.length) {
  const seo = [...appsSrc.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
  const unlisted = appRoutes.filter((route) => !seo.includes(route));
  const orphaned = seo.filter((route) => !appRoutes.includes(route));

  if (unlisted.length) {
    fail(
      SRC.site,
      `route has no APPS entry — missing from the sitemap, per-route metadata, SeoContent and StructuredData: ${list(unlisted)}`,
    );
  }
  if (orphaned.length) fail(SRC.site, `APPS entry for a route no app serves: ${list(orphaned)}`);
  if (!unlisted.length && !orphaned.length) pass(`${seo.length} routes carrying SEO metadata`);
}

/* --------------------------- 6. storage owners --------------------------- */

const keys = await read("keys");
const ownersSrc = bodyAfter(keys, "const OWNERS: OwnerRule[]");

if (!ownersSrc) {
  fail(SRC.keys, "could not find the `OWNERS` declaration");
} else {
  const rules = [...ownersSrc.matchAll(/\{\s*app:\s*"(\w+)",\s*match:\s*(exact|prefix)\(([^)]*)\)/g)].map((m) => ({
    app: m[1],
    kind: m[2],
    keys: quoted(m[3]),
  }));

  const shadowed = [];
  for (const [i, rule] of rules.entries()) {
    // A prefix rule claims everything beneath it, so a sample one character
    // longer answers "would an earlier rule have taken this key first?".
    const samples = rule.kind === "prefix" ? rule.keys.map((key) => `${key}x`) : rule.keys;
    for (const sample of samples) {
      const earlier = rules
        .slice(0, i)
        .find((r) =>
          r.kind === "prefix" ? r.keys.some((key) => sample.startsWith(key)) : r.keys.includes(sample),
        );
      if (earlier) shadowed.push(`${rule.app} (${sample}) is claimed first by ${earlier.app}`);
    }
  }

  const unowned = rules.map((r) => r.app).filter((app) => appIds.length && !appIds.includes(app));

  if (shadowed.length) {
    fail(
      SRC.keys,
      `owner rule listed after one that shadows it — the app's data is attributed to the wrong app in backups, clones and the resource monitor: ${list(shadowed)}`,
    );
  }
  if (unowned.length) fail(SRC.keys, `owner rule for an unknown app id: ${list(unowned)}`);
  if (!shadowed.length && !unowned.length) pass(`${rules.length} storage-key owner rules, in a resolvable order`);
}

/* -------------------------- 7. precache manifest ------------------------- */

const manifestRaw = await readFile(at(SRC.manifest), "utf8").catch(() => null);

if (manifestRaw === null) {
  skip("build precache manifest", "not built yet — run npm run build");
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    fail(SRC.manifest, "is not valid JSON");
  }
  if (manifest) {
    const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
    if (!assets.length) fail(SRC.manifest, "lists no assets — the worker has no chunks to precache");
    else if (!assets.some((asset) => asset.endsWith(".js"))) {
      fail(SRC.manifest, "lists no JavaScript — the code-split app chunks are missing");
    } else pass(`${assets.length} built assets in the precache manifest (${manifest.revision})`);
  }
}

/* -------------------------------- summary -------------------------------- */

console.log(notes.join("\n"));

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  x  ${problem}`);
  console.error("\nThe registry checklist these come from is CLAUDE.md rules #4 and #7.");
} else {
  console.log(`\n${passed} check(s) passed — the app registry is consistent.`);
}

process.exitCode = problems.length ? 1 : 0;
