/**
 * Getting text out of the workspace — to the clipboard, or to a file.
 *
 * These two started out inside Color Lens's palette export, but they are not that
 * app's business: Contrast exports token ramps, Snippets copies code, Markdown
 * saves a document and the API client copies a curl line. Rather than copy them
 * into five places (or have those apps reach into Color Lens's internals, which
 * rule #5 forbids), they live here and `lib/ColorLens/export.ts` re-exports them,
 * so every existing Color Lens import keeps working unchanged.
 *
 * The same shape as `lib/color.ts`, and for the same reason.
 */

/**
 * Save text to the user's device. Local-only, like every other export in the
 * workspace — nothing is uploaded to produce it.
 */
export function downloadText(text: string, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked well after the click: revoking too eagerly cancels the download in
  // some browsers, and the blob is a few kilobytes at most.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Copy to the clipboard, reporting whether it worked so the UI can show a
 * "copied" state only when it truly was. Fails silently on browsers that block
 * clipboard writes outside a user gesture.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
