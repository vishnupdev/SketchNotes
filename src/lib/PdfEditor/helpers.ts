/**
 * Shared helpers for the PDF tools, ported from the original standalone editor
 * so behaviour is identical. Everything here is browser-only (Blob, DOM, File).
 */

export const A4 = [595.28, 841.89] as const;
export const LETTER = [612, 792] as const;

export function fmtSize(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export const baseName = (n: string): string => n.replace(/\.pdf$/i, "");

export const slug = (t: string): string =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "document";

export async function fileToBytes(f: File): Promise<Uint8Array> {
  return new Uint8Array(await f.arrayBuffer());
}

export const isPdf = (f: File): boolean =>
  f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const isImg = (f: File): boolean => f.type.startsWith("image/");

/** Human-readable error text for the common PDF failure modes. */
export function friendly(e: unknown): string {
  const m = (e as Error | null)?.message || String(e);
  if (/encrypt|password/i.test(m))
    return "This PDF is password-protected. Remove the password first, then try again.";
  if (/Invalid PDF|No PDF header|Failed to parse/i.test(m))
    return "That file doesn't look like a valid PDF.";
  return "Error: " + m;
}

/** Trigger a browser download for bytes/blob. */
export function download(data: Uint8Array | Blob, name: string, mime?: string): void {
  const blob =
    data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime || "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** "1-3, 5, 8-" → groups of 0-based indices (+ pretty labels). */
export function parseRanges(
  str: string,
  total: number,
): { groups: number[][]; labels: string[] } {
  const groups: number[][] = [];
  const labels: string[] = [];
  const parts = str.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error("Enter at least one page or range, e.g. 1-3, 5");
  for (const part of parts) {
    let a: number, b: number;
    if (/^\d+$/.test(part)) {
      a = b = parseInt(part, 10);
    } else {
      const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
      if (!m || (!m[1] && !m[2]))
        throw new Error('Can’t read "' + part + '" — use forms like 4, 2-6 or 8-');
      a = m[1] ? parseInt(m[1], 10) : 1;
      b = m[2] ? parseInt(m[2], 10) : total;
    }
    if (a < 1 || b > total || a > b)
      throw new Error('"' + part + '" is outside pages 1–' + total);
    const g: number[] = [];
    for (let i = a - 1; i < b; i++) g.push(i);
    groups.push(g);
    labels.push(a === b ? String(a) : a + "-" + b);
  }
  return { groups, labels };
}

/** Latin-safe text for the standard PDF fonts (used by Text→PDF & watermark). */
export function sanitizeText(t: string): string {
  return t
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•●▪]/g, "-")
    .replace(/ /g, " ")
    .replace(/\t/g, "    ")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "?");
}

interface FontLike {
  widthOfTextAtSize(text: string, size: number): number;
}

/** Greedy word-wrap that also hard-splits over-long words. */
export function wrapLine(text: string, font: FontLike, size: number, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const cand = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(cand, size) <= maxW) {
      cur = cand;
      continue;
    }
    if (cur) lines.push(cur);
    if (font.widthOfTextAtSize(w, size) <= maxW) {
      cur = w;
      continue;
    }
    let piece = "";
    for (const ch of w) {
      if (font.widthOfTextAtSize(piece + ch, size) > maxW) {
        lines.push(piece);
        piece = ch;
      } else piece += ch;
    }
    cur = piece;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
