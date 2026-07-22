import { formatBytes, formatSeconds, orUnknown, yesNo } from "./format";
import type { FeatureFlag, SpecRow, SpecSection, SystemReport, SystemSummary } from "./types";

/* ------------------------------------------------------------------ *
 * Loose typings for the non-standard / experimental browser APIs we
 * probe. Kept local so the rest of the codebase stays lib-dom clean.
 * ------------------------------------------------------------------ */

interface UAHighEntropy {
  architecture?: string;
  bitness?: string;
  model?: string;
  platform?: string;
  platformVersion?: string;
  uaFullVersion?: string;
  fullVersionList?: { brand: string; version: string }[];
  wow64?: boolean;
}
interface NavigatorUAData {
  brands: { brand: string; version: string }[];
  mobile: boolean;
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<UAHighEntropy>;
}
interface NetworkInformation {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
}
interface BatteryManager {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}
interface GPUAdapterInfo {
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
}
interface NavExtras {
  deviceMemory?: number;
  userAgentData?: NavigatorUAData;
  connection?: NetworkInformation;
  getBattery?: () => Promise<BatteryManager>;
  vendor?: string;
  pdfViewerEnabled?: boolean;
  gpu?: {
    requestAdapter: () => Promise<{
      info?: GPUAdapterInfo;
      requestAdapterInfo?: () => Promise<GPUAdapterInfo>;
      features: Set<string>;
      limits: Record<string, number>;
    } | null>;
  };
}
interface PerfMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

const nav = (): Navigator & NavExtras => navigator as Navigator & NavExtras;

/** Run a probe, swallowing any error so a single failure never aborts the scan. */
function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

const mm = (q: string): boolean => safe(() => window.matchMedia(q).matches) ?? false;

/* ----------------------------- UA parsing --------------------------- */

/** Rough browser name/version from the UA string (fallback when UA-CH absent). */
function parseBrowser(ua: string): { name: string; version: string } {
  const tests: [string, RegExp][] = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of tests) {
    const m = ua.match(re);
    if (m) return { name, version: m[1] };
  }
  return { name: "Unknown", version: "" };
}

/** Rendering engine from the UA string. */
function parseEngine(ua: string): string {
  if (/Gecko\/|rv:.*Firefox/.test(ua) && !/like Gecko/.test(ua)) return "Gecko";
  if (/Edg\//.test(ua)) return "Blink";
  if (/Chrome\//.test(ua)) return "Blink";
  if (/AppleWebKit\//.test(ua)) return "WebKit";
  return "Unknown";
}

/** Best-effort OS name from the UA string. */
function parseOS(ua: string): string {
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows NT 6\.3/.test(ua)) return "Windows 8.1";
  if (/Windows/.test(ua)) return "Windows";
  if (/Android ([\d.]+)/.test(ua)) return `Android ${RegExp.$1}`;
  if (/iPhone OS ([\d_]+)/.test(ua)) return `iOS ${RegExp.$1.replace(/_/g, ".")}`;
  if (/Mac OS X ([\d_]+)/.test(ua)) return `macOS ${RegExp.$1.replace(/_/g, ".")}`;
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

/** Windows 11 vs 10 disambiguation from the UA-CH platform version. */
function windowsLabel(platformVersion?: string): string | null {
  if (!platformVersion) return null;
  const major = Number(platformVersion.split(".")[0]);
  if (!Number.isFinite(major)) return null;
  if (major >= 13) return "Windows 11";
  if (major >= 1) return "Windows 10";
  return "Windows (older)";
}

/* ------------------------------ probes ------------------------------ */

interface WebGLInfo {
  vendor: string;
  renderer: string;
  version: string;
  glsl: string;
  maxTexture: number;
  webgl2: boolean;
}

function getWebGL(): WebGLInfo | null {
  return safe(() => {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    const gl = (gl2 ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const get = (p: number): string => String(gl.getParameter(p) ?? "");
    return {
      vendor: dbg ? get(dbg.UNMASKED_VENDOR_WEBGL) : get(gl.VENDOR),
      renderer: dbg ? get(dbg.UNMASKED_RENDERER_WEBGL) : get(gl.RENDERER),
      version: get(gl.VERSION),
      glsl: get(gl.SHADING_LANGUAGE_VERSION),
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      webgl2: !!gl2,
    };
  });
}

async function getWebGPU(): Promise<{ info: GPUAdapterInfo; features: number } | null> {
  const gpu = nav().gpu;
  if (!gpu) return null;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return null;
    let info = adapter.info;
    if (!info && adapter.requestAdapterInfo) info = await adapter.requestAdapterInfo();
    return { info: info ?? {}, features: adapter.features ? adapter.features.size : 0 };
  } catch {
    return null;
  }
}

/**
 * Reduce a raw WebGL renderer string to a readable GPU model. Chromium wraps it
 * as `ANGLE (vendor, device (driver…), api)`; we pull out the device and drop
 * driver/API noise. Falls back to the original string if parsing doesn't help.
 */
function cleanGpuName(renderer: string): string {
  let s = renderer.trim();
  const angle = s.match(/^ANGLE\s*\((.*)\)$/i);
  if (angle) {
    const parts = angle[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    s = parts.length >= 2 ? parts[1] : angle[1];
  }
  s = s
    .replace(/\s*Direct3D.*$/i, "")
    .replace(/\s*OpenGL.*$/i, "")
    .replace(/\s*vs_\d.*$/i, "")
    .replace(/\s*\(0x[0-9A-Fa-f]+\).*$/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  return s || renderer;
}

/* ----------------------------- sections ----------------------------- */

const CODECS: { label: string; type: "video" | "audio"; mime: string }[] = [
  { label: "H.264 (AVC)", type: "video", mime: 'video/mp4; codecs="avc1.42E01E"' },
  { label: "H.265 (HEVC)", type: "video", mime: 'video/mp4; codecs="hvc1.1.6.L93.90"' },
  { label: "VP9", type: "video", mime: 'video/webm; codecs="vp9"' },
  { label: "AV1", type: "video", mime: 'video/mp4; codecs="av01.0.05M.08"' },
  { label: "AAC", type: "audio", mime: 'audio/mp4; codecs="mp4a.40.2"' },
  { label: "MP3", type: "audio", mime: "audio/mpeg" },
  { label: "Opus", type: "audio", mime: 'audio/webm; codecs="opus"' },
  { label: "FLAC", type: "audio", mime: "audio/flac" },
];

function codecRows(): SpecRow[] {
  const v = document.createElement("video");
  const a = document.createElement("audio");
  return CODECS.map(({ label, type, mime }) => {
    const el = type === "video" ? v : a;
    const res = safe(() => el.canPlayType(mime)) || "";
    const value = res === "probably" ? "Supported" : res === "maybe" ? "Likely" : "No";
    return { label, value };
  });
}

const FEATURE_PROBES: { name: string; test: () => boolean }[] = [
  { name: "WebGL", test: () => !!getWebGL() },
  { name: "WebGL 2", test: () => getWebGL()?.webgl2 ?? false },
  { name: "WebGPU", test: () => "gpu" in navigator },
  { name: "WebAssembly", test: () => typeof WebAssembly === "object" },
  { name: "Service Workers", test: () => "serviceWorker" in navigator },
  { name: "Web Workers", test: () => typeof Worker !== "undefined" },
  { name: "Shared Workers", test: () => typeof SharedWorker !== "undefined" },
  { name: "IndexedDB", test: () => "indexedDB" in window },
  { name: "Local Storage", test: () => "localStorage" in window },
  { name: "WebSockets", test: () => "WebSocket" in window },
  { name: "WebRTC", test: () => "RTCPeerConnection" in window },
  { name: "Notifications", test: () => "Notification" in window },
  { name: "Geolocation", test: () => "geolocation" in navigator },
  { name: "Web Bluetooth", test: () => "bluetooth" in navigator },
  { name: "WebUSB", test: () => "usb" in navigator },
  { name: "Web Serial", test: () => "serial" in navigator },
  { name: "WebHID", test: () => "hid" in navigator },
  { name: "Web NFC", test: () => "NDEFReader" in window },
  { name: "Gamepad", test: () => "getGamepads" in navigator },
  { name: "WebXR", test: () => "xr" in navigator },
  { name: "Web Share", test: () => "share" in navigator },
  { name: "Clipboard", test: () => "clipboard" in navigator },
  { name: "Payment Request", test: () => "PaymentRequest" in window },
  { name: "WebAuthn", test: () => "PublicKeyCredential" in window },
  { name: "Credential Mgmt", test: () => "credentials" in navigator },
  { name: "OffscreenCanvas", test: () => "OffscreenCanvas" in window },
  { name: "WebCodecs", test: () => "VideoEncoder" in window },
  { name: "File System Access", test: () => "showOpenFilePicker" in window },
  { name: "Screen Wake Lock", test: () => "wakeLock" in navigator },
  { name: "Screen Capture", test: () => !!navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices },
  { name: "Camera / Mic", test: () => !!navigator.mediaDevices && "getUserMedia" in navigator.mediaDevices },
  { name: "Picture-in-Picture", test: () => "pictureInPictureEnabled" in document },
  { name: "Fullscreen", test: () => !!document.fullscreenEnabled },
  { name: "Pointer Lock", test: () => "pointerLockElement" in document },
  { name: "Vibration", test: () => "vibrate" in navigator },
  { name: "Speech Synthesis", test: () => "speechSynthesis" in window },
  { name: "Speech Recognition", test: () => "SpeechRecognition" in window || "webkitSpeechRecognition" in window },
  { name: "Media Session", test: () => "mediaSession" in navigator },
  { name: "Battery Status", test: () => "getBattery" in navigator },
  { name: "Network Information", test: () => "connection" in navigator },
  { name: "Storage Estimate", test: () => !!navigator.storage?.estimate },
  { name: "Persistent Storage", test: () => !!navigator.storage?.persist },
];

function collectFeatures(): FeatureFlag[] {
  return FEATURE_PROBES.map(({ name, test }) => ({ name, supported: safe(test) ?? false }));
}

/**
 * Analyze the running environment and produce a complete, structured report of
 * everything the web platform exposes about this device and browser. Every
 * probe is isolated; unavailable data is reported as "Unknown" rather than
 * throwing. Async APIs (UA-CH, battery, storage, WebGPU) are awaited in
 * parallel.
 */
export async function collectSystemInfo(): Promise<SystemReport> {
  const n = nav();
  const ua = n.userAgent ?? "";
  const uaData = n.userAgentData;

  const [entropy, battery, storage, persisted, gpu] = await Promise.all([
    uaData
      ? uaData
          .getHighEntropyValues(["architecture", "bitness", "model", "platformVersion", "uaFullVersion", "fullVersionList", "wow64"])
          .catch(() => null)
      : Promise.resolve(null),
    n.getBattery ? n.getBattery().catch(() => null) : Promise.resolve(null),
    navigator.storage?.estimate ? navigator.storage.estimate().catch(() => null) : Promise.resolve(null),
    navigator.storage?.persisted ? navigator.storage.persisted().catch(() => null) : Promise.resolve(null),
    getWebGPU(),
  ]);

  const parsedBrowser = parseBrowser(ua);
  const brandBrowser = uaData?.brands?.filter((b) => !/Not.?A.?Brand/i.test(b.brand)).at(-1);
  const browserName = brandBrowser?.brand ?? parsedBrowser.name;
  const browserVersion = entropy?.uaFullVersion ?? brandBrowser?.version ?? parsedBrowser.version;

  const osName =
    windowsLabel(entropy?.platformVersion) ??
    (uaData?.platform ? `${uaData.platform}${entropy?.platformVersion ? ` ${entropy.platformVersion}` : ""}` : parseOS(ua));

  const cores = navigator.hardwareConcurrency;
  const archBits = [entropy?.architecture, entropy?.bitness ? `${entropy.bitness}-bit` : null]
    .filter(Boolean)
    .join(" · ");

  const webgl = getWebGL();
  const conn = n.connection;
  const perfMem = safe(() => (performance as Performance & { memory?: PerfMemory }).memory);
  const dm = n.deviceMemory;

  const sections: SpecSection[] = [];

  // Hardware at a glance — the major specs, up front. Browsers deliberately
  // withhold the exact CPU model/generation/clock and any physical-disk detail,
  // so those are reported honestly as unavailable rather than guessed.
  const NA = "Not exposed by browser";
  const gpuName = webgl?.renderer
    ? cleanGpuName(webgl.renderer)
    : gpu?.info.description || gpu?.info.device || NA;
  const hardwareRows: SpecRow[] = [
    {
      label: "Memory (RAM)",
      value: dm ? `≈ ${dm} GB` : NA,
      note: dm ? "browser-reported estimate" : "hidden by the browser for privacy",
    },
    {
      label: "Processor",
      value: cores ? `${cores} logical cores / threads` : NA,
      note: cores ? "logical processors visible to the browser" : undefined,
    },
    { label: "CPU architecture", value: archBits || NA },
    {
      label: "CPU model & generation",
      value: NA,
      note: "web pages can't read the CPU brand, model or generation",
    },
    { label: "Clock speed", value: NA, note: "no web API reports CPU frequency" },
    {
      label: "Graphics (GPU)",
      value: gpuName,
      note: webgl ? "reported by WebGL · may be generalised" : undefined,
    },
  ];
  if (storage?.quota != null) {
    hardwareRows.push({
      label: "Storage for this site",
      value: formatBytes(storage.quota),
      note: "origin storage budget — not the physical disk size",
    });
  }
  hardwareRows.push({
    label: "Disk — SSD / HDD / total",
    value: NA,
    note: "drive size, type and ROM are hidden from web pages",
  });
  sections.push({ id: "hardware", title: "Hardware at a glance", icon: "hardware", rows: hardwareRows });

  // Operating system
  const osRows: SpecRow[] = [
    { label: "Operating system", value: osName },
    { label: "Platform", value: orUnknown(uaData?.platform ?? navigator.platform) },
  ];
  if (entropy?.platformVersion) osRows.push({ label: "OS version", value: entropy.platformVersion, note: "UA-CH build" });
  if (archBits) osRows.push({ label: "Architecture", value: archBits });
  osRows.push({ label: "Device type", value: uaData?.mobile ? "Mobile" : "Desktop" });
  if (entropy?.model) osRows.push({ label: "Device model", value: entropy.model });
  if (entropy?.wow64 != null) osRows.push({ label: "WOW64", value: yesNo(entropy.wow64) });
  sections.push({ id: "os", title: "Operating System", icon: "os", rows: osRows });

  // Browser
  const engine = parseEngine(ua);
  const browserRows: SpecRow[] = [
    { label: "Browser", value: browserName },
    { label: "Version", value: orUnknown(browserVersion) },
    { label: "Engine", value: engine },
    { label: "Vendor", value: orUnknown(n.vendor) },
    { label: "PDF viewer", value: n.pdfViewerEnabled != null ? yesNo(n.pdfViewerEnabled) : "Unknown" },
    { label: "Cookies enabled", value: yesNo(navigator.cookieEnabled) },
    { label: "Do Not Track", value: orUnknown(navigator.doNotTrack) },
    { label: "User agent", value: ua || "Unknown" },
  ];
  if (uaData?.brands?.length) {
    browserRows.splice(3, 0, {
      label: "Brands",
      value: uaData.brands.map((b) => `${b.brand} ${b.version}`).join(", "),
    });
  }
  sections.push({ id: "browser", title: "Browser", icon: "browser", rows: browserRows });

  // CPU
  sections.push({
    id: "cpu",
    title: "Processor",
    icon: "cpu",
    rows: [
      { label: "Logical cores", value: cores ? String(cores) : "Unknown", note: cores ? "threads reported to JS" : undefined },
      { label: "Architecture", value: orUnknown(entropy?.architecture) },
      { label: "Word size", value: entropy?.bitness ? `${entropy.bitness}-bit` : "Unknown" },
    ],
  });

  // Memory
  const memRows: SpecRow[] = [
    {
      label: "Device memory",
      value: dm ? `≈ ${dm} GB` : "Unknown",
      note: dm ? "coarse, capped at 8 GB by the browser" : undefined,
    },
  ];
  if (perfMem) {
    memRows.push(
      { label: "JS heap limit", value: formatBytes(perfMem.jsHeapSizeLimit) },
      { label: "JS heap used", value: formatBytes(perfMem.usedJSHeapSize) },
    );
  }
  sections.push({ id: "memory", title: "Memory", icon: "memory", rows: memRows });

  // Graphics
  const gpuRows: SpecRow[] = [];
  if (webgl) {
    gpuRows.push(
      { label: "Renderer", value: webgl.renderer || "Unknown" },
      { label: "Vendor", value: webgl.vendor || "Unknown" },
      { label: "WebGL version", value: webgl.version },
      { label: "Shading language", value: webgl.glsl },
      { label: "Max texture size", value: `${webgl.maxTexture}px` },
      { label: "WebGL 2", value: yesNo(webgl.webgl2) },
    );
  }
  if (gpu) {
    if (gpu.info.description || gpu.info.device)
      gpuRows.push({ label: "WebGPU device", value: gpu.info.description || gpu.info.device || "Unknown" });
    if (gpu.info.vendor) gpuRows.push({ label: "WebGPU vendor", value: gpu.info.vendor });
    if (gpu.info.architecture) gpuRows.push({ label: "WebGPU architecture", value: gpu.info.architecture });
    gpuRows.push({ label: "WebGPU features", value: `${gpu.features} available` });
  } else {
    gpuRows.push({ label: "WebGPU", value: "gpu" in navigator ? "Adapter unavailable" : "Not supported" });
  }
  if (gpuRows.length) sections.push({ id: "gpu", title: "Graphics", icon: "gpu", rows: gpuRows });

  // Display
  const orientation = safe(() => screen.orientation?.type);
  const gamut = mm("(color-gamut: rec2020)") ? "Rec. 2020" : mm("(color-gamut: p3)") ? "Display P3" : mm("(color-gamut: srgb)") ? "sRGB" : "Unknown";
  const pointer = mm("(pointer: fine)") ? "Fine (mouse/stylus)" : mm("(pointer: coarse)") ? "Coarse (touch)" : "Unknown";
  sections.push({
    id: "display",
    title: "Display",
    icon: "display",
    rows: [
      { label: "Screen resolution", value: `${screen.width} × ${screen.height}` },
      { label: "Available area", value: `${screen.availWidth} × ${screen.availHeight}` },
      { label: "Viewport", value: `${window.innerWidth} × ${window.innerHeight}` },
      { label: "Pixel ratio", value: `${window.devicePixelRatio}×` },
      { label: "Color depth", value: `${screen.colorDepth}-bit` },
      { label: "Color gamut", value: gamut },
      { label: "Dynamic range", value: mm("(dynamic-range: high)") ? "HDR" : "Standard" },
      { label: "Orientation", value: orUnknown(orientation) },
      { label: "Touch points", value: String(navigator.maxTouchPoints ?? 0) },
      { label: "Primary pointer", value: pointer },
      { label: "Hover capable", value: yesNo(mm("(hover: hover)")) },
    ],
  });

  // Battery
  if (battery) {
    const rows: SpecRow[] = [
      { label: "Charge level", value: `${Math.round(battery.level * 100)}%` },
      { label: "Status", value: battery.charging ? "Charging" : "On battery" },
    ];
    if (battery.charging && battery.chargingTime !== Infinity && battery.chargingTime > 0)
      rows.push({ label: "Time to full", value: formatSeconds(battery.chargingTime) });
    if (!battery.charging && battery.dischargingTime !== Infinity && battery.dischargingTime > 0)
      rows.push({ label: "Time remaining", value: formatSeconds(battery.dischargingTime) });
    sections.push({ id: "battery", title: "Battery", icon: "battery", rows });
  }

  // Network
  const netRows: SpecRow[] = [{ label: "Status", value: navigator.onLine ? "Online" : "Offline" }];
  if (conn) {
    if (conn.effectiveType) netRows.push({ label: "Effective type", value: conn.effectiveType.toUpperCase() });
    if (conn.type) netRows.push({ label: "Connection", value: conn.type });
    if (conn.downlink != null) netRows.push({ label: "Downlink", value: `${conn.downlink} Mbps`, note: "estimated" });
    if (conn.rtt != null) netRows.push({ label: "Round-trip time", value: `${conn.rtt} ms` });
    if (conn.saveData != null) netRows.push({ label: "Data saver", value: yesNo(conn.saveData) });
  }
  sections.push({ id: "network", title: "Network", icon: "network", rows: netRows });

  // Storage
  const storageRows: SpecRow[] = [];
  if (storage) {
    storageRows.push(
      { label: "Quota", value: storage.quota != null ? formatBytes(storage.quota) : "Unknown", note: "site storage budget" },
      { label: "Used", value: storage.usage != null ? formatBytes(storage.usage) : "Unknown" },
    );
    if (storage.quota) {
      const pct = Math.round(((storage.usage ?? 0) / storage.quota) * 1000) / 10;
      storageRows.push({ label: "Utilisation", value: `${pct}%` });
    }
  }
  storageRows.push({ label: "Persistent storage", value: persisted != null ? yesNo(persisted) : "Unknown" });
  sections.push({ id: "storage", title: "Storage", icon: "storage", rows: storageRows });

  // Locale & time
  const dtf = safe(() => Intl.DateTimeFormat().resolvedOptions());
  sections.push({
    id: "locale",
    title: "Locale & Time",
    icon: "locale",
    rows: [
      { label: "Language", value: orUnknown(navigator.language) },
      { label: "Languages", value: (navigator.languages ?? []).join(", ") || "Unknown" },
      { label: "Time zone", value: orUnknown(dtf?.timeZone) },
      { label: "Locale", value: orUnknown(dtf?.locale) },
      { label: "Calendar", value: orUnknown(dtf?.calendar) },
      { label: "Numbering", value: orUnknown(dtf?.numberingSystem) },
    ],
  });

  // Media codecs
  sections.push({ id: "media", title: "Media Codecs", icon: "media", rows: codecRows() });

  const features = collectFeatures();

  const summary: SystemSummary = {
    os: osName,
    browser: `${browserName} ${browserVersion || ""}`.trim(),
    cpu: cores ? `${cores} logical cores` : "CPU unknown",
    memory: dm ? `≈ ${dm} GB RAM` : "RAM unknown",
    graphics: webgl?.renderer || (gpu?.info.description ?? "GPU unknown"),
    display: `${screen.width}×${screen.height} @ ${window.devicePixelRatio}×`,
  };

  return { generatedAt: Date.now(), summary, sections, features };
}
