/**
 * The Barcode Detection API — the browser's own barcode reader.
 *
 * Chromium and Android WebView only, and absent from TypeScript's DOM library,
 * so the parts `lib/qr/decode.ts` uses are declared here. Optional on `Window`
 * because its absence is the normal case on Firefox and desktop Safari, where a
 * bundled decoder is loaded instead.
 */

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  static getSupportedFormats?: () => Promise<string[]>;
  detect(source: CanvasImageSource | Blob | ImageData): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
