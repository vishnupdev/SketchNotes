/**
 * Televisions and monitors.
 *
 * These two categories are the reason this app has a curated catalogue at all.
 * The encyclopedia that supplies the live half documents display *technology*
 * thoroughly and display *models* not at all: `Category:Computer monitors`
 * holds twelve pages, most of them companies; `Samsung televisions` and
 * `LG televisions` do not exist as categories; and a search for a current TV
 * line returns the manufacturer's corporate article. See `categories.ts` for
 * the measurements behind that.
 *
 * ## Two conventions, both of which exist to stop a sheet overclaiming
 *
 * **Brightness.** Every maker quotes peak brightness on a small white window —
 * typically 1% or 3% of the screen — and that figure can be several times the
 * full-screen number. Where both are published, both are here, each labelled
 * with its window. A single unqualified nits figure is the most common way a
 * display listing misleads.
 *
 * **Size.** A TV series ships in many panel sizes and the measured figures
 * differ between them; the sheet names the size its figures apply to, and lists
 * the others separately, rather than implying the 55-inch matches the 83-inch.
 */

import type { Product } from "../types";

export const TVS: Product[] = [
  {
    id: "lg-g5-oled",
    name: "LG OLED evo G5",
    brandId: "lg",
    category: "tv",
    released: "2025-03",
    status: "shipping",
    priceUsd: 3399,
    summary: "LG's flagship OLED, using a four-stack panel that lifts brightness well past previous generations.",
    highlights: [
      "Four-stack tandem OLED panel — a large brightness step without a separate quantum-dot layer",
      "165 Hz with four HDMI 2.1 ports, so every input takes a 4K 165 Hz source",
      "Wall-flush mount included in the box; no gap-filling bracket needed",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Technology", value: "OLED evo, four-stack tandem" },
          { label: "Sizes", value: "55, 65, 77, 83 and 97 in" },
          { label: "Figures given for", value: "65 in" },
          { label: "Resolution", value: "3840 × 2160 (4K)" },
          { label: "Refresh rate", value: "165 Hz" },
          { label: "Response time", value: "0.1 ms" },
          { label: "Contrast", value: "Infinite (self-emissive, per-pixel off)" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Processor", value: "Alpha 11 AI Processor Gen2" },
          { label: "HDR", value: "Dolby Vision, HDR10, HLG — no HDR10+" },
          { label: "Colour", value: "100% DCI-P3" },
          { label: "Screen finish", value: "Anti-glare, low-reflection coating" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "Nvidia G-Sync, AMD FreeSync Premium, HDMI VRR" },
          { label: "Input lag", value: "Under 10 ms at 4K 120 Hz" },
          { label: "Features", value: "ALLM, Dolby Vision gaming at 165 Hz, Game Optimiser" },
        ],
      },
      {
        title: "Sound and connections",
        items: [
          { label: "Audio", value: "4.2 channel, 60W" },
          { label: "Formats", value: "Dolby Atmos, WOW Orchestra" },
          { label: "HDMI", value: "4 × HDMI 2.1 (48 Gb/s), one with eARC" },
          { label: "USB", value: "3 × USB 2.0" },
          { label: "Tuner", value: "ATSC 3.0 (NextGen TV)" },
          { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3, AirPlay 2, Matter" },
          { label: "Platform", value: "webOS 25" },
        ],
      },
    ],
    source: "https://www.lg.com/us/tvs/lg-oled65g5wua-oled-4k-tv",
  },
  {
    id: "lg-c5-oled",
    name: "LG OLED evo C5",
    brandId: "lg",
    category: "tv",
    released: "2025-03",
    status: "shipping",
    priceUsd: 2499,
    summary: "The OLED most people should buy — the flagship's gaming feature set at two-thirds the price.",
    highlights: [
      "Same 165 Hz and four HDMI 2.1 ports as the flagship G5",
      "Ships in 42 and 48 in as well, which suits a desk better than a wall",
      "Brightness sits below the G5's four-stack panel — the main thing you give up",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Technology", value: "OLED evo" },
          { label: "Sizes", value: "42, 48, 55, 65, 77 and 83 in" },
          { label: "Figures given for", value: "65 in" },
          { label: "Resolution", value: "3840 × 2160 (4K)" },
          { label: "Refresh rate", value: "165 Hz" },
          { label: "Response time", value: "0.1 ms" },
          { label: "Contrast", value: "Infinite (self-emissive)" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Processor", value: "Alpha 9 AI Processor Gen8" },
          { label: "HDR", value: "Dolby Vision, HDR10, HLG" },
          { label: "Colour", value: "100% DCI-P3" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "Nvidia G-Sync, AMD FreeSync Premium, HDMI VRR" },
          { label: "Input lag", value: "Under 10 ms at 4K 120 Hz" },
          { label: "Features", value: "ALLM, Game Optimiser, Dolby Vision gaming" },
        ],
      },
      {
        title: "Sound and connections",
        items: [
          { label: "Audio", value: "2.2 channel, 40W" },
          { label: "Formats", value: "Dolby Atmos" },
          { label: "HDMI", value: "4 × HDMI 2.1 (48 Gb/s), one with eARC" },
          { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3, AirPlay 2" },
          { label: "Platform", value: "webOS 25" },
        ],
      },
    ],
    source: "https://www.lg.com/us/tvs/lg-oled65c5pua-oled-4k-tv",
  },
  {
    id: "samsung-s95f",
    name: "Samsung S95F QD-OLED",
    brandId: "samsung",
    category: "tv",
    released: "2025-04",
    status: "shipping",
    priceUsd: 3299,
    summary: "Samsung's flagship OLED, with a matte finish that beats every rival in a bright room.",
    highlights: [
      "Glare-Free matte coating — the clearest advantage of any 2025 TV in daylight",
      "165 Hz across four HDMI 2.1 ports",
      "Supports HDR10+ but not Dolby Vision, which is Samsung's long-standing position",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Technology", value: "QD-OLED (quantum-dot OLED)" },
          { label: "Sizes", value: "55, 65, 77 and 83 in" },
          { label: "Figures given for", value: "65 in" },
          { label: "Resolution", value: "3840 × 2160 (4K)" },
          { label: "Refresh rate", value: "165 Hz" },
          { label: "Contrast", value: "Infinite (self-emissive)" },
          { label: "Screen finish", value: "Glare-Free matte anti-reflection" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Processor", value: "NQ4 AI Gen3" },
          { label: "HDR", value: "HDR10, HDR10+, HLG — no Dolby Vision" },
          { label: "Colour", value: "100% DCI-P3, Pantone validated" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "AMD FreeSync Premium Pro, HDMI VRR" },
          { label: "Features", value: "ALLM, Game Bar, Motion Xcelerator 165 Hz" },
        ],
      },
      {
        title: "Sound and connections",
        items: [
          { label: "Audio", value: "4.2.2 channel, 70W" },
          { label: "Formats", value: "Dolby Atmos, Object Tracking Sound+, Q-Symphony" },
          { label: "HDMI", value: "4 × HDMI 2.1, one with eARC — on the One Connect box" },
          { label: "Wireless", value: "Wi-Fi 5, Bluetooth 5.2, AirPlay 2, Matter, SmartThings hub" },
          { label: "Platform", value: "Tizen, with 7 years of OS upgrades" },
        ],
      },
    ],
    source: "https://www.samsung.com/us/televisions-home-theater/tvs/oled-tvs/65-class-oled-s95f-qn65s95fafxza/",
  },
  {
    id: "sony-bravia-8-ii",
    name: "Sony Bravia 8 II",
    brandId: "sony",
    category: "tv",
    released: "2025-05",
    status: "shipping",
    priceUsd: 3499,
    summary: "Sony's flagship QD-OLED — the one that prioritises picture accuracy over feature count.",
    highlights: [
      "XR Processor with Sony's own tone mapping, widely held to be the most accurate out of the box",
      "Acoustic Surface Audio+ — the screen itself is the speaker",
      "Only two of its four HDMI ports are 2.1, which is the notable omission",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Technology", value: "QD-OLED" },
          { label: "Sizes", value: "55 and 65 in" },
          { label: "Figures given for", value: "65 in" },
          { label: "Resolution", value: "3840 × 2160 (4K)" },
          { label: "Refresh rate", value: "120 Hz" },
          { label: "Contrast", value: "Infinite (self-emissive)" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Processor", value: "XR Processor" },
          { label: "HDR", value: "Dolby Vision, HDR10, HLG — no HDR10+" },
          { label: "Calibration", value: "Prime Video Calibrated Mode, Netflix Adaptive Calibrated Mode, Sony Pictures Core" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "HDMI VRR, ALLM" },
          { label: "Features", value: "4K 120 Hz, Auto HDR Tone Mapping and Auto Genre Picture Mode for PS5" },
        ],
      },
      {
        title: "Sound and connections",
        items: [
          { label: "Audio", value: "Acoustic Surface Audio+, 2.2 channel, 50W" },
          { label: "Formats", value: "Dolby Atmos, DTS:X, IMAX Enhanced" },
          { label: "HDMI", value: "4 total — 2 × HDMI 2.1 (48 Gb/s), 2 × HDMI 2.0; eARC on one" },
          { label: "Platform", value: "Google TV" },
        ],
      },
    ],
    source: "https://electronics.sony.com/tv-video/televisions/oled-tv/p/k65xr80m2",
  },
  {
    id: "tcl-qm8k",
    name: "TCL QM8K",
    brandId: "tcl",
    category: "tv",
    released: "2025-05",
    status: "shipping",
    priceUsd: 1999,
    summary: "The brightness-per-dollar leader — a mini-LED that goes far brighter than any OLED here, for less.",
    highlights: [
      "Around 5000 nits peak on a small window — roughly double the OLEDs above",
      "Up to 6000 local dimming zones on the largest size",
      "Goes to 98 in, a size no OLED in this list reaches",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Technology", value: "QD-Mini LED (quantum dot, mini-LED backlight)" },
          { label: "Sizes", value: "65, 75, 85 and 98 in" },
          { label: "Figures given for", value: "65 in" },
          { label: "Resolution", value: "3840 × 2160 (4K)" },
          { label: "Refresh rate", value: "144 Hz native (288 Hz in game accelerator mode)" },
          { label: "Local dimming", value: "Up to 6000 zones (size dependent)" },
          { label: "Screen finish", value: "Anti-reflection with a matte layer" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Processor", value: "AiPQ Pro" },
          { label: "HDR", value: "Dolby Vision IQ, HDR10+, HDR10, HLG — all four formats" },
          { label: "Peak brightness", value: "Around 5000 nits (small window)" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "AMD FreeSync Premium Pro, HDMI VRR" },
          { label: "Features", value: "ALLM, Game Master, 288 Hz game accelerator at reduced resolution" },
        ],
      },
      {
        title: "Sound and connections",
        items: [
          { label: "Audio", value: "2.1 channel Bang & Olufsen tuned, 60W" },
          { label: "Formats", value: "Dolby Atmos, DTS Virtual:X" },
          { label: "HDMI", value: "4 total — 2 × HDMI 2.1 (144 Hz), eARC on one" },
          { label: "Platform", value: "Google TV" },
        ],
      },
    ],
    source: "https://www.tcl.com/us/en/products/home-theater/2025-qm8k-qd-mini-led",
  },
  {
    id: "hisense-u8qg",
    name: "Hisense U8QG",
    brandId: "hisense",
    category: "tv",
    released: "2025-05",
    status: "shipping",
    priceUsd: 1499,
    summary: "The value flagship — mini-LED brightness and a 165 Hz panel at mid-range money.",
    highlights: [
      "165 Hz native panel, matching TVs at twice the price",
      "Built-in subwoofer, which is rare at any price",
      "Supports all four HDR formats including Dolby Vision IQ and HDR10+",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Technology", value: "QD-Mini LED" },
          { label: "Sizes", value: "55, 65, 75, 85 and 100 in" },
          { label: "Figures given for", value: "65 in" },
          { label: "Resolution", value: "3840 × 2160 (4K)" },
          { label: "Refresh rate", value: "165 Hz" },
          { label: "Local dimming", value: "Up to 5000 zones (size dependent)" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Processor", value: "Hi-View AI Engine Pro" },
          { label: "HDR", value: "Dolby Vision IQ, HDR10+, HDR10, HLG" },
          { label: "Peak brightness", value: "Around 5000 nits (small window)" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "AMD FreeSync Premium Pro, HDMI VRR" },
          { label: "Features", value: "ALLM, Game Mode Pro, 165 Hz at 4K" },
        ],
      },
      {
        title: "Sound and connections",
        items: [
          { label: "Audio", value: "4.1.2 channel with built-in subwoofer, 72W" },
          { label: "Formats", value: "Dolby Atmos, DTS:X" },
          { label: "HDMI", value: "4 total — 2 × HDMI 2.1 (165 Hz), eARC on one" },
          { label: "Platform", value: "Google TV" },
        ],
      },
    ],
    source: "https://www.hisense-usa.com/televisions/u8qg-series",
  },
];

export const MONITORS: Product[] = [
  {
    id: "alienware-aw3225qf",
    name: "Alienware AW3225QF",
    brandId: "dell",
    category: "monitor",
    released: "2024-01",
    status: "shipping",
    priceUsd: 1199,
    summary: "The 32-inch 4K QD-OLED that set the template every rival has since copied.",
    highlights: [
      "First 4K QD-OLED at 240 Hz, and still among the few with Dolby Vision",
      "1700R curve — gentle enough to work for desktop use, not just games",
      "Three-year warranty that explicitly covers OLED burn-in",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Size", value: "31.6 in" },
          { label: "Technology", value: "QD-OLED (Samsung Display)" },
          { label: "Resolution", value: "3840 × 2160 (4K, 140 ppi)" },
          { label: "Refresh rate", value: "240 Hz" },
          { label: "Response time", value: "0.03 ms grey-to-grey" },
          { label: "Curvature", value: "1700R" },
          { label: "Contrast", value: "1,500,000:1" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Brightness", value: "250 nits full screen, 1000 nits peak (3% window)" },
          { label: "HDR", value: "Dolby Vision, HDR10, VESA DisplayHDR True Black 400" },
          { label: "Colour", value: "99% DCI-P3, 149% sRGB" },
          { label: "Colour depth", value: "10-bit (1.07 billion colours)" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "Nvidia G-Sync Compatible, AMD FreeSync Premium Pro" },
          { label: "Latency", value: "Under 1 ms" },
        ],
      },
      {
        title: "Connections and stand",
        items: [
          { label: "Video in", value: "2 × HDMI 2.1, 1 × DisplayPort 1.4 (DSC)" },
          { label: "USB", value: "USB-C (15W), 3 × USB-A 3.2, USB-B upstream" },
          { label: "Audio", value: "3.5 mm line out — no built-in speakers" },
          { label: "Adjustment", value: "Height, tilt, swivel; 100 × 100 VESA" },
          { label: "Warranty", value: "3 years, including burn-in cover" },
        ],
      },
    ],
    source: "https://www.dell.com/en-us/shop/dell-monitors/alienware-32-4k-qd-oled-gaming-monitor-aw3225qf/apd/210-bkzb/monitors-monitor-accessories",
  },
  {
    id: "dell-u4025qw",
    name: "Dell UltraSharp U4025QW",
    brandId: "dell",
    category: "monitor",
    released: "2024-02",
    status: "shipping",
    priceUsd: 1899,
    summary: "A 40-inch 5K ultrawide that replaces two monitors and a dock at once.",
    highlights: [
      "5120 × 2160 — the working area of two 2560 × 2160 monitors with no bezel between them",
      "Thunderbolt 4 with 140W of power delivery, so one cable runs a laptop",
      "Built-in KVM switches keyboard and mouse between two machines",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Size", value: "39.7 in" },
          { label: "Technology", value: "IPS Black" },
          { label: "Resolution", value: "5120 × 2160 (5K2K, 140 ppi)" },
          { label: "Aspect ratio", value: "21:9" },
          { label: "Refresh rate", value: "120 Hz" },
          { label: "Response time", value: "8 ms (5 ms fast)" },
          { label: "Curvature", value: "2500R" },
          { label: "Contrast", value: "2000:1" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Brightness", value: "450 nits" },
          { label: "HDR", value: "VESA DisplayHDR 600" },
          { label: "Colour", value: "100% sRGB, 100% Rec.709, 98% DCI-P3, 99% Display P3" },
          { label: "Colour depth", value: "1.07 billion colours" },
          { label: "Calibration", value: "Factory calibrated to Delta-E under 2" },
        ],
      },
      {
        title: "Connections",
        items: [
          { label: "Thunderbolt", value: "Thunderbolt 4 upstream (140W power delivery), Thunderbolt 4 downstream (15W)" },
          { label: "Video in", value: "2 × HDMI 2.1, 1 × DisplayPort 1.4" },
          { label: "USB", value: "5 × USB-A 3.2 Gen 2, 2 × USB-C" },
          { label: "Network", value: "RJ45 gigabit Ethernet" },
          { label: "KVM", value: "Built-in, switches between two connected computers" },
          { label: "Audio", value: "2 × 9W speakers" },
        ],
      },
      {
        title: "Stand",
        items: [
          { label: "Adjustment", value: "Height (120 mm), tilt, swivel, slant" },
          { label: "Mount", value: "100 × 100 VESA" },
        ],
      },
    ],
    source: "https://www.dell.com/en-us/shop/dell-ultrasharp-40-curved-thunderbolt-hub-monitor-u4025qw/apd/210-bktb/monitors-monitor-accessories",
  },
  {
    id: "lg-45gx950a",
    name: "LG UltraGear 45GX950A",
    brandId: "lg",
    category: "monitor",
    released: "2025-03",
    status: "shipping",
    priceUsd: 1999,
    summary: "A 45-inch bendable OLED ultrawide that switches between 5K2K and 4K resolutions.",
    highlights: [
      "Bends from flat to 900R by hand — a physical mechanism, not a setting",
      "Dual-mode: 5120 × 2160 at 165 Hz, or 2560 × 1080 at 330 Hz",
      "First 5K2K OLED panel in a monitor",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Size", value: "44.5 in" },
          { label: "Technology", value: "WOLED (LG Display, 4th gen META)" },
          { label: "Resolution", value: "5120 × 2160 (5K2K, 125 ppi)" },
          { label: "Aspect ratio", value: "21:9" },
          { label: "Refresh rate", value: "165 Hz at 5K2K, 330 Hz at 2560 × 1080" },
          { label: "Response time", value: "0.03 ms grey-to-grey" },
          { label: "Curvature", value: "Bendable, flat to 900R" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Brightness", value: "275 nits full screen, 1300 nits peak" },
          { label: "HDR", value: "VESA DisplayHDR True Black 400" },
          { label: "Colour", value: "98.5% DCI-P3" },
          { label: "Screen finish", value: "Anti-glare, low reflection" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "Nvidia G-Sync Compatible, AMD FreeSync Premium Pro" },
          { label: "Features", value: "Dual-mode resolution switching, Black Stabiliser, Crosshair" },
        ],
      },
      {
        title: "Connections",
        items: [
          { label: "Video in", value: "2 × HDMI 2.1, 1 × DisplayPort 2.1" },
          { label: "USB", value: "USB-C (90W power delivery), 2 × USB-A 3.0, USB-B upstream" },
          { label: "Audio", value: "3.5 mm out, DTS Headphone:X" },
          { label: "Adjustment", value: "Height, tilt, swivel; 100 × 100 VESA" },
        ],
      },
    ],
    source: "https://www.lg.com/us/monitors/lg-45gx950a-w-gaming-monitor",
  },
  {
    id: "asus-pg27aqdp",
    name: "Asus ROG Swift OLED PG27AQDP",
    brandId: "asus",
    category: "monitor",
    released: "2025-01",
    status: "shipping",
    priceUsd: 1099,
    summary: "A 480 Hz 1440p OLED — the fastest panel you can put on a desk.",
    highlights: [
      "480 Hz, the highest refresh rate of any OLED monitor",
      "Third-generation WOLED panel with a custom heatsink for burn-in mitigation",
      "3-year warranty covering burn-in",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Size", value: "26.5 in" },
          { label: "Technology", value: "WOLED (LG Display, 3rd gen)" },
          { label: "Resolution", value: "2560 × 1440 (QHD, 110 ppi)" },
          { label: "Refresh rate", value: "480 Hz" },
          { label: "Response time", value: "0.03 ms grey-to-grey" },
          { label: "Contrast", value: "1,500,000:1" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Brightness", value: "275 nits full screen, 1300 nits peak (3% window)" },
          { label: "HDR", value: "VESA DisplayHDR True Black 500" },
          { label: "Colour", value: "99% DCI-P3" },
          { label: "Screen finish", value: "Anti-glare micro-texture" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "Nvidia G-Sync Compatible, AMD FreeSync Premium Pro" },
          { label: "Features", value: "ASUS OLED Anti-Flicker, Uniform Brightness, custom heatsink" },
        ],
      },
      {
        title: "Connections",
        items: [
          { label: "Video in", value: "2 × HDMI 2.1, 1 × DisplayPort 1.4 (DSC)" },
          { label: "USB", value: "USB-C (DisplayPort Alt Mode), 2 × USB-A 3.2, USB-B upstream" },
          { label: "Audio", value: "3.5 mm out" },
          { label: "Adjustment", value: "Height, tilt, swivel, pivot; 100 × 100 VESA" },
          { label: "Warranty", value: "3 years, including burn-in cover" },
        ],
      },
    ],
    source: "https://rog.asus.com/monitors/27-to-31-5-inches/rog-swift-oled-pg27aqdp/spec/",
  },
  {
    id: "samsung-odyssey-g81sf",
    name: "Samsung Odyssey OLED G8 (G81SF)",
    brandId: "samsung",
    category: "monitor",
    released: "2025-03",
    status: "shipping",
    priceUsd: 999,
    summary: "A 4K QD-OLED at 240 Hz in a flat 27-inch panel — the highest pixel density on this list.",
    highlights: [
      "166 ppi — 4K packed into 27 inches, the sharpest panel here",
      "Flat rather than curved, which suits desktop work better than a 1700R",
      "Includes Samsung's smart TV platform, so it runs apps with no PC attached",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Size", value: "26.9 in" },
          { label: "Technology", value: "QD-OLED" },
          { label: "Resolution", value: "3840 × 2160 (4K, 166 ppi)" },
          { label: "Refresh rate", value: "240 Hz" },
          { label: "Response time", value: "0.03 ms grey-to-grey" },
          { label: "Shape", value: "Flat" },
        ],
      },
      {
        title: "Picture",
        items: [
          { label: "Brightness", value: "250 nits typical, 1000 nits peak" },
          { label: "HDR", value: "VESA DisplayHDR True Black 400" },
          { label: "Colour", value: "99% DCI-P3" },
          { label: "Screen finish", value: "Glare-free matte" },
        ],
      },
      {
        title: "Gaming",
        items: [
          { label: "Variable refresh", value: "AMD FreeSync Premium Pro, Nvidia G-Sync Compatible" },
          { label: "Care", value: "OLED Safeguard+, thermal modulation system" },
        ],
      },
      {
        title: "Connections",
        items: [
          { label: "Video in", value: "2 × HDMI 2.1, 1 × DisplayPort 1.4" },
          { label: "USB", value: "USB-C (65W power delivery), 2 × USB-A" },
          { label: "Smart platform", value: "Samsung Tizen — apps without a PC connected" },
          { label: "Adjustment", value: "Height, tilt, swivel, pivot; 100 × 100 VESA" },
        ],
      },
    ],
    source: "https://www.samsung.com/us/computing/monitors/gaming/27-odyssey-oled-g8-g81sf-4k-uhd-240hz-0-03ms-qd-oled-smart-gaming-monitor-ls27fg812sn/",
  },
  {
    id: "apple-studio-display",
    name: "Apple Studio Display",
    brandId: "apple",
    category: "monitor",
    released: "2022-03",
    status: "shipping",
    priceUsd: 1599,
    summary: "A 5K panel with a computer inside it — included here because nothing else ships 218 ppi.",
    highlights: [
      "218 ppi, which is still the only mainstream way to get a true Retina desktop panel",
      "Runs an A13 Bionic internally for the camera, speakers and Spatial Audio",
      "60 Hz only — the clearest reason to look elsewhere for anything fast-moving",
    ],
    specs: [
      {
        title: "Panel",
        items: [
          { label: "Size", value: "27 in" },
          { label: "Technology", value: "IPS LCD" },
          { label: "Resolution", value: "5120 × 2880 (5K, 218 ppi)" },
          { label: "Refresh rate", value: "60 Hz" },
          { label: "Brightness", value: "600 nits" },
          { label: "Colour", value: "P3 wide colour, True Tone, 1.07 billion colours" },
          { label: "Glass options", value: "Standard or nano-texture" },
        ],
      },
      {
        title: "Built-in system",
        items: [
          { label: "Chip", value: "Apple A13 Bionic" },
          { label: "Camera", value: "12MP ultra wide with Center Stage" },
          { label: "Speakers", value: "Six — four woofers, two tweeters; Spatial Audio" },
          { label: "Microphones", value: "Three-mic array, studio quality" },
        ],
      },
      {
        title: "Connections and stand",
        items: [
          { label: "Video in", value: "1 × Thunderbolt 3 (96W power delivery to a laptop)" },
          { label: "USB", value: "3 × USB-C (10 Gb/s)" },
          { label: "Stand options", value: "Tilt only, tilt-and-height, or VESA mount" },
        ],
      },
    ],
    source: "https://www.apple.com/studio-display/specs/",
  },
];
