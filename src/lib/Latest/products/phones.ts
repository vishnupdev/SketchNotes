/**
 * Phones.
 *
 * Every figure below is the maker's own published specification, taken from the
 * page linked as that product's `source`. Where a maker states a range rather
 * than a number — a battery quoted as "up to", a brightness figure that only
 * applies to a 1% window — the range or the condition is kept, because a spec
 * sheet that rounds those away is quietly making a stronger claim than the
 * manufacturer did.
 *
 * Screen brightness is the row where this matters most and is the easiest to
 * get wrong: makers quote peak HDR brightness measured on a small window, and
 * the typical full-screen figure is a fraction of it. Both are given where both
 * are published.
 */

import type { Product } from "../types";

export const PHONES: Product[] = [
  {
    id: "iphone-17-pro-max",
    name: "iPhone 17 Pro Max",
    brandId: "apple",
    category: "phone",
    released: "2025-09",
    status: "shipping",
    priceUsd: 1199,
    summary: "Apple's largest pro phone, and the first with a vapour chamber for sustained performance.",
    highlights: [
      "A19 Pro on a 3nm-class process, with a vapour chamber to hold clocks under load",
      "48MP on all three rear cameras — the telephoto is no longer the low-resolution one",
      "Aluminium unibody replaces the titanium frame, carrying heat into the vapour chamber",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.9 in" },
          { label: "Panel", value: "Super Retina XDR OLED, LTPO" },
          { label: "Resolution", value: "2868 × 1320 (460 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz (ProMotion)" },
          { label: "Brightness", value: "1000 nits typical, 1600 nits peak HDR, 3000 nits peak outdoor" },
          { label: "Cover glass", value: "Ceramic Shield 2" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Apple A19 Pro" },
          { label: "CPU", value: "6-core (2 performance + 4 efficiency)" },
          { label: "GPU", value: "6-core, with neural accelerators per core" },
          { label: "Memory", value: "12 GB" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB / 2 TB" },
          { label: "Cooling", value: "Vapour chamber, laser-welded to the aluminium unibody" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "48MP Fusion, ƒ/1.78, sensor-shift OIS" },
          { label: "Ultra wide", value: "48MP Fusion, ƒ/2.2, 120° field of view" },
          { label: "Telephoto", value: "48MP Fusion, ƒ/2.8, 4× optical (100mm), 8× optical-quality" },
          { label: "Front", value: "18MP Center Stage, square sensor" },
          { label: "Video", value: "4K 120 fps Dolby Vision, ProRes RAW, Apple Log 2, Genlock" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Video playback", value: "Up to 39 hours" },
          { label: "Wired charging", value: "50% in 20 min with a 40W+ adapter" },
          { label: "Wireless", value: "MagSafe up to 25W, Qi2 25W" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "163.4 × 78.0 × 8.75 mm" },
          { label: "Weight", value: "231 g" },
          { label: "Water resistance", value: "IP68 (6 m for 30 min)" },
          { label: "Cellular", value: "5G, N1 wireless chip, C1X modem" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 6, Thread, UWB (2nd gen)" },
          { label: "Port", value: "USB-C (USB 3, 10 Gb/s)" },
          { label: "Operating system", value: "iOS 26" },
        ],
      },
    ],
    source: "https://www.apple.com/iphone-17-pro/specs/",
  },
  {
    id: "iphone-17",
    name: "iPhone 17",
    brandId: "apple",
    category: "phone",
    released: "2025-09",
    status: "shipping",
    priceUsd: 799,
    summary: "The standard iPhone finally gets the 120 Hz display that was a pro-only feature for four years.",
    highlights: [
      "ProMotion 1–120 Hz and an always-on display, previously Pro-only",
      "Base storage doubled to 256 GB at the same price as the outgoing 128 GB model",
      "48MP ultra wide joins the 48MP main camera",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.3 in" },
          { label: "Panel", value: "Super Retina XDR OLED, LTPO" },
          { label: "Resolution", value: "2622 × 1206 (460 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz (ProMotion)" },
          { label: "Brightness", value: "1000 nits typical, 1600 nits peak HDR, 3000 nits peak outdoor" },
          { label: "Cover glass", value: "Ceramic Shield 2" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Apple A19" },
          { label: "CPU", value: "6-core (2 performance + 4 efficiency)" },
          { label: "GPU", value: "5-core" },
          { label: "Memory", value: "8 GB" },
          { label: "Storage", value: "256 GB / 512 GB" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "48MP Fusion, ƒ/1.6, sensor-shift OIS" },
          { label: "Ultra wide", value: "48MP Fusion, ƒ/2.2, 120° field of view" },
          { label: "Telephoto", value: "2× optical-quality, cropped from the main sensor" },
          { label: "Front", value: "18MP Center Stage, square sensor" },
          { label: "Video", value: "4K 60 fps Dolby Vision, Action mode, Spatial video" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Video playback", value: "Up to 30 hours" },
          { label: "Wired charging", value: "50% in 20 min with a 40W+ adapter" },
          { label: "Wireless", value: "MagSafe up to 25W, Qi2 25W" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "149.6 × 71.5 × 7.95 mm" },
          { label: "Weight", value: "177 g" },
          { label: "Water resistance", value: "IP68 (6 m for 30 min)" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 6, Thread, 5G" },
          { label: "Port", value: "USB-C (USB 2)" },
          { label: "Operating system", value: "iOS 26" },
        ],
      },
    ],
    source: "https://www.apple.com/iphone-17/specs/",
  },
  {
    id: "iphone-air",
    name: "iPhone Air",
    brandId: "apple",
    category: "phone",
    released: "2025-09",
    status: "shipping",
    priceUsd: 999,
    summary: "Apple's thinnest phone — 5.6 mm — trading camera count and battery for a titanium frame.",
    highlights: [
      "5.64 mm thick, the thinnest iPhone made",
      "Titanium frame with a Ceramic Shield back, not glass",
      "eSIM only worldwide, which is what freed the space for the battery",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.5 in" },
          { label: "Panel", value: "Super Retina XDR OLED, LTPO" },
          { label: "Resolution", value: "2736 × 1260 (460 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz (ProMotion)" },
          { label: "Brightness", value: "1000 nits typical, 3000 nits peak outdoor" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Apple A19 Pro (5-core GPU)" },
          { label: "Memory", value: "12 GB" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB" },
          { label: "Modem", value: "Apple C1X" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Rear", value: "48MP Fusion, ƒ/1.6, sensor-shift OIS — single camera" },
          { label: "Telephoto", value: "2× optical-quality, cropped from the main sensor" },
          { label: "Front", value: "18MP Center Stage, square sensor" },
          { label: "Video", value: "4K 60 fps Dolby Vision" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Video playback", value: "Up to 27 hours" },
          { label: "Wireless", value: "MagSafe up to 20W, Qi2" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "156.2 × 74.7 × 5.64 mm" },
          { label: "Weight", value: "165 g" },
          { label: "Frame", value: "Grade 5 titanium" },
          { label: "Water resistance", value: "IP68" },
          { label: "SIM", value: "eSIM only — no physical tray in any market" },
          { label: "Operating system", value: "iOS 26" },
        ],
      },
    ],
    source: "https://www.apple.com/iphone-air/specs/",
  },
  {
    id: "galaxy-s25-ultra",
    name: "Galaxy S25 Ultra",
    brandId: "samsung",
    category: "phone",
    released: "2025-02",
    status: "shipping",
    priceUsd: 1299,
    summary: "Samsung's flagship: a 200MP main camera, a built-in stylus, and seven years of updates.",
    highlights: [
      "200MP main sensor, and the ultra wide steps up to 50MP",
      "Seven years of OS and security updates — the longest commitment on Android",
      "Snapdragon 8 Elite binned for Galaxy, clocked above the standard part",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.9 in" },
          { label: "Panel", value: "Dynamic AMOLED 2X, LTPO" },
          { label: "Resolution", value: "3120 × 1440 (QHD+, 498 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz adaptive" },
          { label: "Brightness", value: "2600 nits peak" },
          { label: "Cover glass", value: "Corning Gorilla Armor 2" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Snapdragon 8 Elite for Galaxy (3nm)" },
          { label: "CPU", value: "8-core, up to 4.47 GHz" },
          { label: "Memory", value: "12 GB LPDDR5X" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB (UFS 4.0)" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "200MP, ƒ/1.7, 1/1.3in, OIS" },
          { label: "Ultra wide", value: "50MP, ƒ/1.9, 120°" },
          { label: "Telephoto", value: "10MP, ƒ/2.4, 3× optical" },
          { label: "Periscope", value: "50MP, ƒ/3.4, 5× optical" },
          { label: "Front", value: "12MP, ƒ/2.2" },
          { label: "Video", value: "8K 30 fps, 4K 120 fps, 10-bit HDR, Log recording" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Capacity", value: "5000 mAh" },
          { label: "Wired charging", value: "45W — 65% in 30 min" },
          { label: "Wireless", value: "15W Qi2-ready, 4.5W reverse" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "162.8 × 77.6 × 8.2 mm" },
          { label: "Weight", value: "218 g" },
          { label: "Frame", value: "Titanium" },
          { label: "Water resistance", value: "IP68" },
          { label: "Stylus", value: "S Pen, stored in the body" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 5.4, UWB, 5G" },
          { label: "Software support", value: "7 years of OS and security updates" },
          { label: "Operating system", value: "Android 15, One UI 7" },
        ],
      },
    ],
    source: "https://www.samsung.com/us/smartphones/galaxy-s25-ultra/specs/",
  },
  {
    id: "galaxy-z-fold-7",
    name: "Galaxy Z Fold 7",
    brandId: "samsung",
    category: "phone",
    released: "2025-07",
    status: "shipping",
    priceUsd: 1999,
    summary: "The book-style fold, finally thin enough to stop feeling like a compromise closed.",
    highlights: [
      "8.9 mm folded — around a third thinner than the Fold 5 it descends from",
      "200MP main camera, inherited from the S25 Ultra",
      "The cover screen is now a normal 21:9 phone shape rather than a letterbox",
    ],
    specs: [
      {
        title: "Displays",
        items: [
          { label: "Main screen", value: "8.0 in Dynamic AMOLED 2X, 2184 × 1968, 1–120 Hz" },
          { label: "Cover screen", value: "6.5 in Dynamic AMOLED 2X, 2520 × 1080, 1–120 Hz" },
          { label: "Brightness", value: "2600 nits peak" },
          { label: "Cover glass", value: "Gorilla Glass Ceramic 2" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Snapdragon 8 Elite for Galaxy" },
          { label: "Memory", value: "12 GB / 16 GB" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "200MP, ƒ/1.7, OIS" },
          { label: "Ultra wide", value: "12MP, ƒ/2.2" },
          { label: "Telephoto", value: "10MP, ƒ/2.4, 3× optical" },
          { label: "Cover front", value: "10MP" },
          { label: "Inner front", value: "10MP" },
        ],
      },
      {
        title: "Battery and body",
        items: [
          { label: "Capacity", value: "4400 mAh" },
          { label: "Wired charging", value: "25W" },
          { label: "Folded", value: "158.4 × 72.8 × 8.9 mm" },
          { label: "Unfolded", value: "158.4 × 143.2 × 4.2 mm" },
          { label: "Weight", value: "215 g" },
          { label: "Water resistance", value: "IP48" },
          { label: "Software support", value: "7 years of OS and security updates" },
        ],
      },
    ],
    source: "https://www.samsung.com/us/smartphones/galaxy-z-fold7/specs/",
  },
  {
    id: "pixel-10-pro-xl",
    name: "Pixel 10 Pro XL",
    brandId: "google",
    category: "phone",
    released: "2025-08",
    status: "shipping",
    priceUsd: 1199,
    summary: "Google's largest Pixel, and the first with Qi2 magnets built into the body.",
    highlights: [
      "Pixelsnap — Qi2 magnets in the phone itself, not in a case",
      "Tensor G5, Google's first chip built at TSMC rather than Samsung",
      "Seven years of OS, security and Feature Drop updates",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.8 in" },
          { label: "Panel", value: "Super Actua LTPO OLED" },
          { label: "Resolution", value: "2992 × 1344 (486 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz" },
          { label: "Brightness", value: "2200 nits HDR, 3300 nits peak" },
          { label: "Cover glass", value: "Corning Gorilla Glass Victus 2" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Google Tensor G5 (TSMC 3nm)" },
          { label: "Security", value: "Titan M2 coprocessor" },
          { label: "Memory", value: "16 GB LPDDR5X" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "50MP, ƒ/1.68, 1/1.31in, OIS" },
          { label: "Ultra wide", value: "48MP, ƒ/1.7, 123°, autofocus" },
          { label: "Telephoto", value: "48MP, ƒ/2.8, 5× optical, OIS" },
          { label: "Zoom", value: "100× Pro Res Zoom" },
          { label: "Front", value: "42MP, ƒ/2.2, autofocus" },
          { label: "Video", value: "8K 30 fps, 4K 60 fps, 10-bit HDR" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Capacity", value: "5200 mAh" },
          { label: "Wired charging", value: "45W — 70% in 30 min" },
          { label: "Wireless", value: "25W Pixelsnap (Qi2)" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "162.8 × 76.6 × 8.5 mm" },
          { label: "Weight", value: "232 g" },
          { label: "Water resistance", value: "IP68" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 6, UWB, 5G" },
          { label: "Software support", value: "7 years of OS, security and Feature Drops" },
          { label: "Operating system", value: "Android 16" },
        ],
      },
    ],
    source: "https://store.google.com/product/pixel_10_pro_xl_specs",
  },
  {
    id: "oneplus-13",
    name: "OnePlus 13",
    brandId: "oneplus",
    category: "phone",
    released: "2025-01",
    status: "shipping",
    priceUsd: 899,
    summary: "The flagship that undercuts its rivals by a few hundred dollars and gives up very little.",
    highlights: [
      "6000 mAh silicon-carbon battery in a body no thicker than its rivals'",
      "100W wired and 50W wireless charging",
      "IP69 — rated for high-pressure hot water, a step beyond the usual IP68",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.82 in" },
          { label: "Panel", value: "LTPO 4.1 AMOLED" },
          { label: "Resolution", value: "3168 × 1440 (510 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz adaptive" },
          { label: "Brightness", value: "4500 nits peak" },
          { label: "Cover glass", value: "Ceramic Guard" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Snapdragon 8 Elite" },
          { label: "Memory", value: "12 GB / 16 GB / 24 GB LPDDR5X" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB (UFS 4.0)" },
          { label: "Cooling", value: "Dual cryo-velocity vapour chamber" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "50MP Sony LYT-808, ƒ/1.6, OIS" },
          { label: "Ultra wide", value: "50MP Samsung JN5, ƒ/2.0, 120°" },
          { label: "Periscope", value: "50MP Sony LYT-600, ƒ/2.6, 3× optical, OIS" },
          { label: "Front", value: "32MP, ƒ/2.4" },
          { label: "Video", value: "8K 30 fps, 4K 120 fps, Dolby Vision" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Capacity", value: "6000 mAh (silicon-carbon)" },
          { label: "Wired charging", value: "100W SuperVOOC" },
          { label: "Wireless", value: "50W AirVOOC" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "162.9 × 76.5 × 8.5 mm" },
          { label: "Weight", value: "210 g" },
          { label: "Water resistance", value: "IP68 and IP69" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 5.4, 5G" },
          { label: "Operating system", value: "Android 15, OxygenOS 15" },
        ],
      },
    ],
    source: "https://www.oneplus.com/us/13/specs",
  },
  {
    id: "xiaomi-15-ultra",
    name: "Xiaomi 15 Ultra",
    brandId: "xiaomi",
    category: "phone",
    released: "2025-03",
    status: "shipping",
    priceUsd: 1499,
    summary: "A camera phone with a 1-inch main sensor and a 200MP periscope, co-engineered with Leica.",
    highlights: [
      "1-inch Sony LYT-900 main sensor — the largest in a mainstream phone",
      "200MP periscope at 4.3× optical, not a crop",
      "Optional Photography Kit adds a grip, a shutter button and a control dial",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.73 in" },
          { label: "Panel", value: "LTPO AMOLED" },
          { label: "Resolution", value: "3200 × 1440 (522 ppi)" },
          { label: "Refresh rate", value: "1–120 Hz" },
          { label: "Brightness", value: "3200 nits peak" },
          { label: "Cover glass", value: "Xiaomi Shield Glass 2.0" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Snapdragon 8 Elite" },
          { label: "Memory", value: "12 GB / 16 GB LPDDR5X" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB (UFS 4.1)" },
        ],
      },
      {
        title: "Cameras (Leica)",
        items: [
          { label: "Main", value: "50MP Sony LYT-900, 1in, ƒ/1.63, OIS" },
          { label: "Ultra wide", value: "50MP Samsung JN5, ƒ/2.2, 115°" },
          { label: "Telephoto", value: "50MP Sony IMX858, ƒ/1.8, 3× optical, OIS" },
          { label: "Periscope", value: "200MP Samsung HP9, ƒ/2.6, 4.3× optical, OIS" },
          { label: "Front", value: "32MP, ƒ/2.0" },
          { label: "Video", value: "8K 30 fps, 4K 120 fps, 10-bit LOG" },
        ],
      },
      {
        title: "Battery and charging",
        items: [
          { label: "Capacity", value: "5410 mAh (global) / 6000 mAh (China)" },
          { label: "Wired charging", value: "90W HyperCharge" },
          { label: "Wireless", value: "80W" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "161.3 × 75.3 × 9.35 mm" },
          { label: "Weight", value: "226 g" },
          { label: "Water resistance", value: "IP68" },
          { label: "Operating system", value: "Android 15, HyperOS 2" },
        ],
      },
    ],
    source: "https://www.mi.com/global/product/xiaomi-15-ultra/specs/",
  },
  {
    id: "nothing-phone-3",
    name: "Nothing Phone (3)",
    brandId: "nothing",
    category: "phone",
    released: "2025-07",
    status: "shipping",
    priceUsd: 799,
    summary: "Nothing's first true flagship, replacing the light strips with a dot-matrix display.",
    highlights: [
      "Glyph Matrix — a 489-LED dot display on the back, replacing the light strips",
      "Four 50MP cameras, front and rear",
      "Five years of OS updates and seven of security patches",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "6.67 in" },
          { label: "Panel", value: "LTPS AMOLED" },
          { label: "Resolution", value: "2800 × 1260 (460 ppi)" },
          { label: "Refresh rate", value: "30–120 Hz adaptive" },
          { label: "Brightness", value: "4500 nits peak" },
          { label: "Cover glass", value: "Gorilla Glass 7i" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Snapdragon 8s Gen 4" },
          { label: "Memory", value: "12 GB / 16 GB LPDDR5X" },
          { label: "Storage", value: "256 GB / 512 GB (UFS 4.0)" },
        ],
      },
      {
        title: "Cameras",
        items: [
          { label: "Main", value: "50MP, ƒ/1.68, 1/1.3in, OIS" },
          { label: "Ultra wide", value: "50MP, ƒ/2.2, 114°" },
          { label: "Periscope", value: "50MP, ƒ/2.68, 3× optical, OIS" },
          { label: "Front", value: "50MP, ƒ/2.2" },
          { label: "Video", value: "4K 60 fps" },
        ],
      },
      {
        title: "Battery and body",
        items: [
          { label: "Capacity", value: "5150 mAh (silicon-carbon)" },
          { label: "Wired charging", value: "65W" },
          { label: "Wireless", value: "15W" },
          { label: "Dimensions", value: "160.6 × 75.6 × 8.99 mm" },
          { label: "Weight", value: "218 g" },
          { label: "Water resistance", value: "IP68" },
          { label: "Rear display", value: "Glyph Matrix — 489 micro-LEDs" },
          { label: "Software support", value: "5 years of OS, 7 years of security" },
        ],
      },
    ],
    source: "https://us.nothing.tech/pages/phone-3-specs",
  },
];
