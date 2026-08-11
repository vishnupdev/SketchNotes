/** Collision-resistant-enough short id (time + randomness). */
export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Human "time ago" label for a timestamp. */
export function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(ts).toLocaleDateString();
}

/** Escape a literal so it can be embedded in a RegExp source. */
export const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word phrase test that also behaves around non-ASCII text: the phrase must
 * be bounded by something that isn't a letter or a digit, so "list" doesn't match
 * inside "listen". Used by the natural-language parsers (Assistant, Board).
 */
export function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(phrase)}($|[^\\p{L}\\p{N}])`, "u").test(text);
}

/** HTML-escape for safe text interpolation. */
export const esc = (s: string): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/** Join class names, dropping falsy values. */
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(" ");

/**
 * Feed the pointer's position to the `hover-spot` utility (globals.css) so the
 * element's spotlight follows the cursor: attach as `onPointerMove`.
 *
 * Mouse/pen only — during a touch drag this would light whichever element the
 * finger is scrolling past, and `hover-spot`'s centred default is the right
 * look on touch anyway.
 */
export function trackSpot(e: React.PointerEvent<HTMLElement>): void {
  if (e.pointerType === "touch") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Generate a pleasant random hex colour via HSL. */
export function randColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 62 + Math.floor(Math.random() * 30); // 62-92%
  const l = 42 + Math.floor(Math.random() * 20); // 42-62%
  return hslHex(h, s, l);
}

/** Convert HSL (h in deg, s/l in %) to a #rrggbb hex string. */
export function hslHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
