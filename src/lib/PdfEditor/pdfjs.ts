/**
 * Lazily loads PDF.js on the client only (dynamic import keeps it out of the
 * SSR bundle) and points it at the worker copied into /public.
 */
type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      return lib;
    });
  }
  return pdfjsPromise;
}
