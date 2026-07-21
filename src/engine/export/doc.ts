const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/**
 * Word-compatible `.doc` as an MHTML single-file web page with the sketch
 * embedded as base64 PNG. `dateLabel` is passed in so the pure builder stays
 * deterministic and testable.
 */
export function buildDOC(
  pngB64: string,
  wW: number,
  wH: number,
  title: string,
  dateLabel: string,
): string {
  const dispW = Math.min(620, Math.round(wW));
  const dispH = Math.max(1, Math.round((wH * dispW) / wW));
  const safeTitle = esc(title || "Sketchnote");
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
    `<head><meta charset="utf-8"><title>${safeTitle}</title></head>` +
    '<body style="font-family:Calibri,Arial,sans-serif">' +
    `<h1 style="font-size:20pt;margin:0 0 4pt 0">${safeTitle}</h1>` +
    `<p style="color:#777777;font-size:10pt;margin:0 0 14pt 0">Exported from Sketchnotes · ${dateLabel}</p>` +
    `<img src="sketch.png" width="${dispW}" height="${dispH}">` +
    "</body></html>";
  const wrapped = pngB64.replace(/(.{76})/g, "$1\r\n");
  return [
    "MIME-Version: 1.0",
    'Content-Type: multipart/related; boundary="SKNOTES-BOUNDARY"',
    "",
    "--SKNOTES-BOUNDARY",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Location: file:///sketchnote.htm",
    "",
    html,
    "",
    "--SKNOTES-BOUNDARY",
    "Content-Type: image/png",
    "Content-Transfer-Encoding: base64",
    "Content-Location: sketch.png",
    "",
    wrapped,
    "",
    "--SKNOTES-BOUNDARY--",
    "",
  ].join("\r\n");
}
