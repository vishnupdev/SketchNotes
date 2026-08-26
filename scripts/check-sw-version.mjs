/**
 * Fails when `public/sw.js` changed without its `VERSION` being bumped.
 *
 * The service worker names its caches after `VERSION`, and the `activate`
 * handler deletes every `oneapp-*` cache that is not one of the current four.
 * So the bump is not cosmetic: it *is* the mechanism that replaces a returning
 * visitor's precache. Edit the worker without it and every existing install
 * keeps serving the caches it already has — a route added to `SHELL_URLS` 404s
 * offline, a changed caching rule never takes effect, and none of it reproduces
 * on the machine that made the change, because a first install has no stale
 * cache to keep. That is the whole failure mode this check exists for.
 *
 * The comparison is against a git ref, so it works the same locally (against
 * the last commit) and in CI (against the branch being merged into):
 *
 *   node scripts/check-sw-version.mjs                # vs HEAD
 *   node scripts/check-sw-version.mjs --base=origin/master
 *
 * When the ref or the file cannot be read — a shallow clone, a fresh repo, no
 * git at all — the check reports that it was skipped and passes. It is a guard
 * against forgetting, not a gate that should break an unrelated build.
 */

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const FILE = "public/sw.js";
const VERSION_RE = /^const VERSION = "([^"]+)";/m;

const arg = process.argv.slice(2).find((a) => a.startsWith("--base="));
const base = arg?.slice("--base=".length) || process.env.SW_CHECK_BASE || "HEAD";

/** Run git, returning null instead of throwing when it cannot answer. */
function git(...args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

const skip = (why) => {
  console.log(`[sw] skipped — ${why}`);
  process.exit(0);
};

const previous = git("show", `${base}:${FILE}`);
if (previous === null) skip(`could not read ${FILE} at ${base}`);

const current = await readFile(new URL(`../${FILE}`, import.meta.url), "utf8");

// Line endings are normalised so a checkout with different `core.autocrlf`
// settings does not read as a change to every line of the worker.
const normalise = (text) => text.replace(/\r\n/g, "\n");

if (normalise(previous) === normalise(current)) {
  console.log(`[sw] unchanged since ${base} — no bump needed`);
  process.exit(0);
}

const was = previous.match(VERSION_RE)?.[1];
const now = current.match(VERSION_RE)?.[1];

if (!was || !now) {
  console.error(`[sw] could not read \`const VERSION = "…"\` from ${FILE}${!was ? ` at ${base}` : ""}`);
  process.exit(1);
}

if (was === now) {
  console.error(
    `[sw] ${FILE} changed since ${base} but VERSION is still "${now}".\n` +
      "     Every existing install keeps its old precache until the version changes,\n" +
      "     so this edit would reach new visitors only. Bump it and commit again.",
  );
  process.exit(1);
}

// The suffix is a counter, so a bump that goes backwards (a bad merge, a copied
// older worker) is caught too — the caches would be named after an older build.
const number = (version) => Number(version.match(/(\d+)$/)?.[1] ?? NaN);
const from = number(was);
const to = number(now);

if (Number.isFinite(from) && Number.isFinite(to) && to <= from) {
  console.error(`[sw] VERSION went backwards: "${was}" → "${now}". A bump has to increase.`);
  process.exit(1);
}

console.log(`[sw] changed since ${base}, VERSION bumped "${was}" → "${now}"`);
