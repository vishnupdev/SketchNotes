/**
 * The browser's screen eyedropper (the EyeDropper API), used as a bonus input
 * alongside the image picker: it reads a pixel from anywhere on screen, which is
 * handy for sampling another window or a colour already on the page.
 *
 * Chromium-only at the time of writing, so every use is feature-detected and the
 * button is simply absent elsewhere — the image picker is the primary path and
 * works everywhere.
 */

interface EyeDropperResult {
  /** Always `#rrggbb`. */
  sRGBHex: string;
}

interface EyeDropperInstance {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}

declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperInstance;
  }
}

/** Whether this browser exposes the screen eyedropper. */
export function screenPickerSupported(): boolean {
  return typeof window !== "undefined" && typeof window.EyeDropper === "function";
}

/**
 * Open the screen eyedropper, resolving to a hex colour — or null when the user
 * dismisses it (Escape), which is a normal outcome, not an error.
 */
export async function pickFromScreen(): Promise<string | null> {
  if (!screenPickerSupported()) return null;
  try {
    const result = await new window.EyeDropper!().open();
    return result.sRGBHex.toLowerCase();
  } catch {
    return null;
  }
}
