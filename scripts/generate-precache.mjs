/**
 * Writes `public/precache-manifest.json` — the list of every client asset the
 * production build emitted, as URLs the service worker can cache.
 *
 * Why this exists: each app is code-split, so its chunk is only downloaded the
 * first time that app is opened. Offline readiness used to depend entirely on
 * the client-side warm-up (`src/lib/offline/warmup.ts`) importing all of them
 * before the connection dropped — and if it hadn't finished, opening an
 * un-warmed app offline failed to load its chunk. With a manifest the worker
 * knows every chunk's real URL up front and can store them all after a single
 * online visit, no warm-up required.
 *
 * Chunk filenames are content-hashed, so the manifest is regenerated on every
 * build and is deliberately not committed (see .gitignore).
 *
 * Run as part of `npm run build`. A missing manifest is not fatal: the worker
 * treats it as "nothing extra to precache" and the warm-up still runs.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, posix, relative } from "node:path";

const ROOT = process.cwd();
const STATIC_DIR = join(ROOT, ".next", "static");
const OUT_FILE = join(ROOT, "public", "precache-manifest.json");

/** Build output that is never requested by the browser at runtime. */
const SKIP = /\.(?:map|d\.ts)$/i;

/** Every file under `.next/static`, as paths relative to that directory. */
async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // no build output — nothing to do
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (SKIP.test(entry.name)) return [];
      return [full];
    }),
  );
  return files.flat();
}

const files = await walk(STATIC_DIR);

if (files.length === 0) {
  console.warn("[precache] no files under .next/static — manifest not written");
  process.exit(0);
}

/*
 * Chunks deliberately left *out* of the eager precache.
 *
 * Mermaid is the case this exists for. It is ~2.8 MB across three dozen chunks —
 * about 40% of the whole build — and it is only ever loaded when a Markdown
 * document actually contains a ```mermaid fence. Precaching it would make every
 * visitor download a diagram engine, on the offline install, to support a feature
 * most of them will never open.
 *
 * Leaving it out costs very little, because the service worker caches hashed
 * build output cache-first anyway: the first document with a diagram in it pulls
 * these chunks over the network once, and from then on they are stored and the
 * diagram renders offline like everything else. The only thing given up is a
 * diagram working offline *before* it has ever been rendered online.
 *
 * Matched on content rather than filename because Next content-hashes chunk
 * names, so there is no stable pattern to match on. Reading the build output
 * costs a few megabytes of I/O once per build.
 */
const LAZY_ONLY = /mermaid|flowchart-v2|sequenceDiagram|cytoscape|dagre/;

const eager = [];
let deferred = 0;
let deferredBytes = 0;

for (const file of files) {
  if (file.endsWith(".js")) {
    const source = await readFile(file, "latin1");
    if (LAZY_ONLY.test(source)) {
      deferred++;
      deferredBytes += source.length;
      continue;
    }
  }
  eager.push(file);
}

// `.next/static/chunks/x.js` is served as `/_next/static/chunks/x.js`.
const assets = eager
  .map((file) => posix.join("/_next/static", relative(STATIC_DIR, file).split(/[\\/]/).join("/")))
  .sort();

if (deferred > 0) {
  const mb = (deferredBytes / 1048576).toFixed(2);
  console.log(
    `[precache] deferring ${deferred} on-demand chunk(s), ${mb} MB — cached by the worker on first use`,
  );
}

/*
 * A digest of the asset list, so the worker can tell one build's manifest from
 * another's and re-run precaching after a deploy. Cheaper and more direct than
 * reading Next's build id, which says nothing about whether the assets changed.
 */
const revision = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 12);

const manifest = { revision, count: assets.length, assets };
const next = JSON.stringify(manifest, null, 2) + "\n";

// Skip the write when nothing changed, so a rebuild doesn't churn the file's
// mtime (and with it, the ETag every returning browser already has).
const previous = await readFile(OUT_FILE, "utf8").catch(() => null);
if (previous === next) {
  console.log(`[precache] unchanged — ${assets.length} assets (${revision})`);
  process.exit(0);
}

await writeFile(OUT_FILE, next, "utf8");
console.log(`[precache] wrote ${assets.length} assets to public/precache-manifest.json (${revision})`);
