/**
 * Checks every preset theme in `globals.css` for WCAG AA contrast.
 *
 * With two dozen palettes, "it looks fine" stops being a check — each one has to
 * clear the same bar the accessibility score is graded on (rule #7). The pairs
 * tested are the ones that actually carry text:
 *
 *   text      / paper   body copy
 *   ink-soft  / paper   secondary copy, which is small and the usual offender
 *   accent    / paper   `--accent` is used for links, active labels and glyphs
 *   on-accent / accent  labels inside a filled accent button
 *
 * Values are resolved the way the cascade resolves them: the light or dark base
 * block first (chosen by whether the theme sets `data-dark` in `themes.ts`), then
 * the theme's own overrides. Custom themes are not covered here — their contrast
 * is measured live in the theme editor, since the colours are the user's.
 *
 * Run: node scripts/audit-theme-contrast.mjs
 *
 * The WCAG maths is repeated here rather than imported from `src/lib/color.ts`,
 * because this runs as a plain node script outside the TypeScript pipeline.
 */

import { readFile } from "node:fs/promises";

const CSS = new URL("../src/app/globals.css", import.meta.url);
const THEMES_TS = new URL("../src/lib/themes.ts", import.meta.url);

/** WCAG AA for normal-size text. */
const AA = 4.5;

/* ------------------------------ colour maths ----------------------------- */

const linearize = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const luminance = ({ r, g, b }) =>
  0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);

function contrast(aHex, bHex) {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  if (!a || !b) return null;
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* -------------------------------- parsing -------------------------------- */

// Comments are stripped and whitespace flattened first: a selector captured by
// the block regex otherwise carries the comment block sitting above it, and CRLF
// line endings make exact selector matches fail on Windows.
const css = (await readFile(CSS, "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
const themesSrc = await readFile(THEMES_TS, "utf8");

const normalizeSelector = (s) => s.replace(/\s+/g, " ").trim();

/** Which preset ids are dark, straight from the registry. */
const registry = [...themesSrc.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*dark:\s*(true|false)/g)].map(
  ([, id, label, dark]) => ({ id, label, dark: dark === "true" }),
);

if (registry.length === 0) {
  console.error("could not read THEMES from src/lib/themes.ts");
  process.exit(1);
}

/** Pull `--name: value;` declarations out of one CSS block body. */
function declarations(body) {
  const out = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim();
  }
  return out;
}

/** The body of the first block whose selector matches `test`. */
function blockFor(test) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, selector, body] of css.matchAll(re)) {
    if (test(normalizeSelector(selector))) return declarations(body);
  }
  return {};
}

const lightBase = blockFor((s) => s.includes(":root,") && s.includes(":not([data-dark])"));
const darkBase = blockFor((s) => s.endsWith("[data-theme]:where([data-dark])"));
const darkFlag = blockFor((s) => s.endsWith("[data-dark]"));

if (!lightBase["--paper"] || !darkBase["--paper"]) {
  console.error("could not locate the light/dark base blocks in globals.css");
  process.exit(1);
}

const themeBlocks = {};
for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const m = /\[data-theme="([^"]+)"\]$/.exec(normalizeSelector(selector));
  if (m) themeBlocks[m[1]] = declarations(body);
}

/* -------------------------------- audit ---------------------------------- */

const PAIRS = [
  ["text", "--text", "--paper"],
  ["ink-soft", "--ink-soft", "--paper"],
  ["accent", "--accent", "--paper"],
  ["on-accent", "--on-accent", "--accent"],
];

let failures = 0;
let missing = 0;
const rows = [];

for (const theme of registry) {
  const base = theme.dark ? { ...darkBase, ...darkFlag } : lightBase;
  const tokens = { ...base, ...(themeBlocks[theme.id] ?? {}) };

  const cells = [];
  for (const [label, fg, bg] of PAIRS) {
    const ratio = contrast(tokens[fg] ?? "", tokens[bg] ?? "");
    if (ratio === null) {
      cells.push(`${label}=?`);
      missing += 1;
      continue;
    }
    const ok = ratio >= AA;
    if (!ok) failures += 1;
    cells.push(`${label}=${ratio.toFixed(2)}${ok ? "" : " FAIL"}`);
  }
  rows.push(`${theme.dark ? "dark " : "light"}  ${theme.id.padEnd(10)} ${cells.join("  ")}`);
}

console.log(rows.join("\n"));
console.log(
  `\n${registry.length} themes checked · ${failures} pair(s) below AA (${AA}:1)` +
    (missing ? ` · ${missing} unresolved` : ""),
);

process.exitCode = failures > 0 || missing > 0 ? 1 : 0;
