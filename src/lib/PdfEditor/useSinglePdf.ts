"use client";

import { useCallback, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { fileToBytes, friendly } from "@/lib/PdfEditor/helpers";

export interface LoadedPdf {
  name: string;
  size: number;
  bytes: Uint8Array;
  doc: PDFDocument;
  pageCount: number;
}

/** Loads and validates a single PDF (throws are surfaced as friendly errors). */
export function useSinglePdf() {
  const [file, setFile] = useState<LoadedPdf | null>(null);

  /** Returns the loaded item on success, or throws with a friendly message. */
  const load = useCallback(async (f: File): Promise<LoadedPdf> => {
    try {
      const bytes = await fileToBytes(f);
      const doc = await PDFDocument.load(bytes); // throws on encrypted/invalid
      const item: LoadedPdf = {
        name: f.name,
        size: f.size,
        bytes,
        doc,
        pageCount: doc.getPageCount(),
      };
      setFile(item);
      return item;
    } catch (e) {
      throw new Error(friendly(e));
    }
  }, []);

  const clear = useCallback(() => setFile(null), []);
  return { file, setFile, load, clear };
}
