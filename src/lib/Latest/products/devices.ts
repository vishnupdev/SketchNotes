/**
 * Tablets, consoles, smartwatches, headphones and cameras.
 *
 * Grouped into one file because each of these categories is a handful of
 * products rather than a field: there are four consoles worth listing, not
 * forty. Splitting them into five files of six entries each would make the
 * catalogue harder to read, not easier.
 *
 * Battery figures follow the same rule as everywhere else here — they are the
 * manufacturer's claim under the manufacturer's test conditions, and the
 * condition is kept in the value ("with noise cancelling on", "video playback")
 * because an unqualified hours figure is not comparable with anything.
 */

import type { Product } from "../types";

export const TABLETS: Product[] = [
  {
    id: "ipad-pro-13-m4",
    name: 'iPad Pro 13" (M4)',
    brandId: "apple",
    category: "tablet",
    released: "2024-05",
    status: "shipping",
    priceUsd: 1299,
    summary: "The thinnest product Apple has ever made, with a two-layer OLED panel to make it work.",
    highlights: [
      "Tandem OLED — two panels stacked and driven together to reach 1000 nits full-screen",
      "5.1 mm thick, thinner than the iPod nano it is always compared to",
      "M4 arrived here before it arrived in any Mac",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "13 in Ultra Retina XDR" },
          { label: "Technology", value: "Tandem OLED — two OLED panels stacked" },
          { label: "Resolution", value: "2752 × 2064 (264 ppi)" },
          { label: "Refresh rate", value: "10–120 Hz (ProMotion)" },
          { label: "Brightness", value: "1000 nits full-screen SDR and HDR, 1600 nits peak HDR" },
          { label: "Glass options", value: "Standard or nano-texture (1 TB and 2 TB only)" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Apple M4" },
          { label: "CPU", value: "9-core or 10-core" },
          { label: "GPU", value: "10-core with hardware ray tracing" },
          { label: "Neural Engine", value: "16-core, 38 TOPS" },
          { label: "Memory", value: "8 GB (256 GB / 512 GB) or 16 GB (1 TB / 2 TB)" },
          { label: "Storage", value: "256 GB – 2 TB" },
        ],
      },
      {
        title: "Cameras and audio",
        items: [
          { label: "Rear", value: "12MP wide, ƒ/1.8, with adaptive True Tone flash" },
          { label: "Front", value: "12MP ultra wide, ƒ/2.0, landscape-mounted, Center Stage" },
          { label: "Audio", value: "Four speakers, four studio-quality microphones" },
        ],
      },
      {
        title: "Body and accessories",
        items: [
          { label: "Dimensions", value: "281.6 × 215.5 × 5.1 mm" },
          { label: "Weight", value: "579 g (Wi-Fi)" },
          { label: "Port", value: "Thunderbolt / USB 4 (40 Gb/s)" },
          { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3, optional 5G" },
          { label: "Stylus", value: "Apple Pencil Pro — squeeze, barrel roll, haptics" },
          { label: "Keyboard", value: "Magic Keyboard with function row and aluminium palm rest" },
          { label: "Operating system", value: "iPadOS" },
        ],
      },
    ],
    source: "https://www.apple.com/ipad-pro/specs/",
  },
  {
    id: "galaxy-tab-s11-ultra",
    name: "Galaxy Tab S11 Ultra",
    brandId: "samsung",
    category: "tablet",
    released: "2025-09",
    status: "shipping",
    priceUsd: 1199,
    summary: "A 14.6-inch Android tablet with a stylus in the box — the one Apple has no direct answer to.",
    highlights: [
      "14.6 in, larger than any iPad",
      "S Pen included rather than sold separately",
      "DeX mode gives a desktop-style windowed interface on an external display",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "14.6 in Dynamic AMOLED 2X" },
          { label: "Resolution", value: "2960 × 1848" },
          { label: "Refresh rate", value: "120 Hz adaptive" },
          { label: "Finish", value: "Anti-reflective coating" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "MediaTek Dimensity 9400+" },
          { label: "Memory", value: "12 GB / 16 GB" },
          { label: "Storage", value: "256 GB / 512 GB / 1 TB, plus microSD" },
        ],
      },
      {
        title: "Cameras and audio",
        items: [
          { label: "Rear", value: "13MP wide" },
          { label: "Front", value: "12MP ultra wide" },
          { label: "Audio", value: "Quad speakers tuned by AKG, Dolby Atmos" },
        ],
      },
      {
        title: "Battery and body",
        items: [
          { label: "Capacity", value: "11,600 mAh" },
          { label: "Charging", value: "45W wired" },
          { label: "Thickness", value: "5.1 mm" },
          { label: "Weight", value: "692 g" },
          { label: "Water resistance", value: "IP68" },
          { label: "Stylus", value: "S Pen included" },
          { label: "Software support", value: "7 years of OS and security updates" },
        ],
      },
    ],
    source: "https://www.samsung.com/us/tablets/galaxy-tab-s11-ultra/",
  },
];

export const CONSOLES: Product[] = [
  {
    id: "nintendo-switch-2",
    name: "Nintendo Switch 2",
    brandId: "nintendo",
    category: "console",
    released: "2025-06",
    status: "shipping",
    priceUsd: 449,
    summary: "The fastest-selling console launch on record — a bigger screen, and DLSS in a handheld.",
    highlights: [
      "1080p 120 Hz HDR handheld screen, up from 720p 60 Hz",
      "Docked output reaches 4K, using Nvidia DLSS upscaling",
      "Joy-Con 2 attach magnetically and work as a mouse on a flat surface",
    ],
    specs: [
      {
        title: "Display and output",
        items: [
          { label: "Screen", value: "7.9 in LCD" },
          { label: "Resolution", value: "1920 × 1080 (handheld)" },
          { label: "Refresh rate", value: "Up to 120 Hz, VRR" },
          { label: "HDR", value: "Yes" },
          { label: "Docked output", value: "Up to 3840 × 2160 at 60 Hz, or 1080p/1440p at 120 Hz" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Custom Nvidia processor" },
          { label: "Graphics features", value: "DLSS upscaling, hardware ray tracing" },
          { label: "Memory", value: "12 GB" },
          { label: "Storage", value: "256 GB UFS internal" },
          { label: "Expansion", value: "microSD Express only — older microSD cards will not work" },
        ],
      },
      {
        title: "Controllers",
        items: [
          { label: "Joy-Con 2", value: "Magnetic attachment, larger, with HD Rumble 2" },
          { label: "Mouse mode", value: "Either Joy-Con works as a mouse on a flat surface" },
          { label: "C button", value: "Opens GameChat — voice, screen sharing and camera" },
        ],
      },
      {
        title: "Body and connectivity",
        items: [
          { label: "Dimensions", value: "272 × 116 × 13.9 mm (with Joy-Con 2)" },
          { label: "Weight", value: "534 g (with Joy-Con 2)" },
          { label: "Battery", value: "5220 mAh — 2 to 6.5 hours depending on the game" },
          { label: "Ports", value: "2 × USB-C, 3.5 mm audio, game card slot" },
          { label: "Wireless", value: "Wi-Fi 6, Bluetooth" },
          { label: "Backwards compatible", value: "Most original Switch games, physical and digital" },
        ],
      },
    ],
    source: "https://www.nintendo.com/us/gaming-systems/switch-2/",
  },
  {
    id: "ps5-pro",
    name: "PlayStation 5 Pro",
    brandId: "sony",
    category: "console",
    released: "2024-11",
    status: "shipping",
    priceUsd: 699,
    summary: "A mid-generation upgrade aimed at removing the choice between resolution and frame rate.",
    highlights: [
      "67% more compute units than the base PS5, and 28% faster memory",
      "PSSR — Sony's own machine-learning upscaler, running on dedicated hardware",
      "No disc drive included; the drive is a separate purchase",
    ],
    specs: [
      {
        title: "Performance",
        items: [
          { label: "GPU", value: "Custom AMD RDNA — 67% more compute units than PS5" },
          { label: "Ray tracing", value: "Up to 3× the ray-casting rate of PS5" },
          { label: "Upscaling", value: "PlayStation Spectral Super Resolution (PSSR)" },
          { label: "CPU", value: "8-core AMD Zen 2, with a High CPU Frequency Mode" },
          { label: "Memory", value: "16 GB GDDR6 at 576 GB/s, plus 2 GB DDR5 for the system" },
        ],
      },
      {
        title: "Storage and output",
        items: [
          { label: "Storage", value: "2 TB NVMe SSD" },
          { label: "Expansion", value: "M.2 NVMe slot" },
          { label: "Disc drive", value: "Not included — sold separately" },
          { label: "Video output", value: "Up to 8K, 4K at 120 Hz, VRR" },
        ],
      },
      {
        title: "Connectivity",
        items: [
          { label: "Ports", value: "HDMI 2.1, 2 × USB-C (10 Gb/s), 2 × USB-A, Ethernet" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 5.1" },
          { label: "Backwards compatible", value: "PS4 games, with enhancements" },
        ],
      },
    ],
    source: "https://www.playstation.com/en-us/ps5/ps5-pro/",
  },
  {
    id: "steam-deck-oled",
    name: "Steam Deck OLED",
    brandId: "valve",
    category: "console",
    released: "2023-11",
    status: "shipping",
    priceUsd: 549,
    summary: "A handheld PC running Linux, and still the benchmark the Windows handhelds are measured against.",
    highlights: [
      "HDR OLED at 90 Hz, a genuine upgrade over the original LCD",
      "50% more battery life than the LCD model, from a larger cell and a smaller process node",
      "Runs SteamOS, but the bootloader is unlocked — it will run Windows or any Linux",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "7.4 in HDR OLED" },
          { label: "Resolution", value: "1280 × 800" },
          { label: "Refresh rate", value: "Up to 90 Hz" },
          { label: "Brightness", value: "1000 nits peak HDR, 600 nits SDR" },
          { label: "Colour", value: "110% P3" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "APU", value: "Custom AMD Sephiroth (6nm)" },
          { label: "CPU", value: "4-core / 8-thread Zen 2, 2.4–3.5 GHz" },
          { label: "GPU", value: "8 RDNA 2 compute units, 1.0–1.6 GHz" },
          { label: "Memory", value: "16 GB LPDDR5-6400" },
          { label: "Storage", value: "512 GB or 1 TB NVMe SSD, plus microSD" },
        ],
      },
      {
        title: "Battery and body",
        items: [
          { label: "Capacity", value: "50 Wh — 3 to 12 hours depending on the game" },
          { label: "Dimensions", value: "298 × 117 × 49 mm" },
          { label: "Weight", value: "640 g" },
          { label: "Ports", value: "USB-C (DisplayPort 1.4, 45W charging), 3.5 mm, microSD" },
          { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3" },
          { label: "Operating system", value: "SteamOS 3 (Arch Linux), unlocked bootloader" },
        ],
      },
    ],
    source: "https://www.steamdeck.com/en/tech/deck",
  },
];

export const WATCHES: Product[] = [
  {
    id: "apple-watch-ultra-3",
    name: "Apple Watch Ultra 3",
    brandId: "apple",
    category: "watch",
    released: "2025-09",
    status: "shipping",
    priceUsd: 799,
    summary: "The rugged Apple Watch, now with satellite messaging when there is no phone or network.",
    highlights: [
      "Satellite connectivity for messages and emergency SOS with no network at all",
      "Widest display Apple has made, in the same 49 mm case",
      "42 hours of normal use, up from 36",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Type", value: "LTPO3 OLED Always-On Retina" },
          { label: "Size", value: "Up to 1.2 in² display area" },
          { label: "Refresh rate", value: "1–60 Hz" },
          { label: "Brightness", value: "3000 nits peak, 1 nit minimum" },
          { label: "Cover", value: "Flat sapphire crystal" },
        ],
      },
      {
        title: "Health and sensors",
        items: [
          { label: "Heart", value: "Electrical and optical heart sensors, ECG, irregular rhythm notifications" },
          { label: "Blood oxygen", value: "Blood Oxygen app" },
          { label: "Sleep", value: "Sleep stages and Sleep Score" },
          { label: "Other", value: "Temperature, hypertension notifications, depth gauge to 40 m, water temperature" },
          { label: "Safety", value: "Crash Detection, Fall Detection, 86 dB siren" },
        ],
      },
      {
        title: "Case and durability",
        items: [
          { label: "Case", value: "49 mm titanium" },
          { label: "Water resistance", value: "100 m, WR100, EN13319 dive certified" },
          { label: "Dust", value: "IP6X" },
          { label: "Standard", value: "MIL-STD 810H" },
          { label: "Operating range", value: "−20 °C to 55 °C" },
        ],
      },
      {
        title: "Battery and connectivity",
        items: [
          { label: "Battery", value: "Up to 42 hours normal use, 72 hours in low power mode" },
          { label: "Charging", value: "Fast charge — 80% in about an hour" },
          { label: "Satellite", value: "Messages, Find My and Emergency SOS off-grid" },
          { label: "Cellular", value: "5G, with international roaming" },
          { label: "Navigation", value: "Dual-frequency GPS (L1 and L5)" },
          { label: "Operating system", value: "watchOS 26" },
        ],
      },
    ],
    source: "https://www.apple.com/apple-watch-ultra/specs/",
  },
  {
    id: "garmin-fenix-8",
    name: "Garmin fēnix 8",
    brandId: "garmin",
    category: "watch",
    released: "2024-09",
    status: "shipping",
    priceUsd: 999,
    summary: "The multi-sport watch measured in weeks rather than days — 16 days with an AMOLED screen on.",
    highlights: [
      "Up to 16 days of battery in smartwatch mode, against roughly two for its rivals",
      "Dive computer to 40 m, with a leak-proof speaker and microphone",
      "Available with AMOLED or solar MIP — the solar version runs even longer",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Options", value: "AMOLED, or solar-charging memory-in-pixel (MIP)" },
          { label: "Sizes", value: "43 mm, 47 mm and 51 mm cases" },
          { label: "Resolution", value: "454 × 454 (47 mm AMOLED)" },
          { label: "Lens", value: "Sapphire crystal (Sapphire editions)" },
        ],
      },
      {
        title: "Battery (47 mm AMOLED)",
        items: [
          { label: "Smartwatch mode", value: "Up to 16 days" },
          { label: "Always-on", value: "Up to 6 days" },
          { label: "GPS only", value: "Up to 47 hours" },
          { label: "All satellite systems + multi-band", value: "Up to 27 hours" },
          { label: "Expedition GPS", value: "Up to 42 days" },
        ],
      },
      {
        title: "Sensors and navigation",
        items: [
          { label: "Navigation", value: "Multi-band GNSS — GPS, GLONASS, Galileo, BeiDou, QZSS; SatIQ" },
          { label: "Maps", value: "Full-colour TopoActive maps, multi-continent" },
          { label: "Health", value: "Elevate Gen 5 heart rate, ECG, pulse oximeter, skin temperature" },
          { label: "Environment", value: "Barometric altimeter, compass, gyroscope, thermometer" },
          { label: "Diving", value: "Dive computer to 40 m, ANSI/CAN/UL 62133-2:2020" },
        ],
      },
      {
        title: "Durability and features",
        items: [
          { label: "Water rating", value: "10 ATM and EN13319" },
          { label: "Standard", value: "MIL-STD-810" },
          { label: "Audio", value: "Built-in speaker and microphone, leak-proof" },
          { label: "Storage", value: "32 GB, with offline music" },
          { label: "Payments", value: "Garmin Pay" },
        ],
      },
    ],
    source: "https://www.garmin.com/en-US/p/1223951",
  },
];

export const AUDIO: Product[] = [
  {
    id: "airpods-pro-3",
    name: "AirPods Pro 3",
    brandId: "apple",
    category: "audio",
    released: "2025-09",
    status: "shipping",
    priceUsd: 249,
    summary: "The earbuds that added a heart-rate sensor and live translation to noise cancelling.",
    highlights: [
      "Heart-rate sensing in an earbud, using photoplethysmography at 256 samples a second",
      "Live Translation between languages, processed on the paired iPhone",
      "IP57 on both the buds and the case — the first AirPods rated for sweat and water",
    ],
    specs: [
      {
        title: "Audio",
        items: [
          { label: "Driver", value: "Custom high-excursion Apple driver" },
          { label: "Noise cancelling", value: "Active, up to 2× the AirPods Pro 2" },
          { label: "Transparency", value: "Adaptive Audio, Conversation Awareness, Loud Sound Reduction" },
          { label: "Spatial audio", value: "Personalised, with dynamic head tracking" },
          { label: "Codec", value: "AAC, with Apple's own low-latency link" },
        ],
      },
      {
        title: "Health and sensing",
        items: [
          { label: "Heart rate", value: "Photoplethysmography, 256 samples per second" },
          { label: "Hearing", value: "Hearing Test, Hearing Aid feature, Hearing Protection" },
          { label: "Motion", value: "Accelerometer and gyroscope for head gestures" },
        ],
      },
      {
        title: "Battery",
        items: [
          { label: "Listening", value: "Up to 8 hours with noise cancelling on" },
          { label: "With case", value: "Up to 24 hours total" },
          { label: "Case charging", value: "USB-C, MagSafe, Qi wireless, Apple Watch charger" },
        ],
      },
      {
        title: "Fit and durability",
        items: [
          { label: "Ear tips", value: "Five sizes, including extra small; foam-infused" },
          { label: "Water resistance", value: "IP57 — buds and case" },
          { label: "Requires", value: "iOS 26 or later for full feature set" },
        ],
      },
    ],
    source: "https://www.apple.com/airpods-pro/specs/",
  },
  {
    id: "sony-wh-1000xm6",
    name: "Sony WH-1000XM6",
    brandId: "sony",
    category: "audio",
    released: "2025-05",
    status: "shipping",
    priceUsd: 449,
    summary: "The noise-cancelling benchmark, with the folding hinge restored after the XM5 dropped it.",
    highlights: [
      "Twelve microphones feeding the QN3 processor — seven times the processing of the XM5",
      "Folds again, which the XM5 notably did not",
      "30 hours with noise cancelling on, and 3 hours from a 3-minute charge",
    ],
    specs: [
      {
        title: "Audio",
        items: [
          { label: "Driver", value: "30 mm carbon-fibre composite dome" },
          { label: "Frequency response", value: "4 Hz – 40,000 Hz (LDAC, 990 kbps)" },
          { label: "Processor", value: "QN3 HD noise-cancelling processor" },
          { label: "Microphones", value: "12, for noise cancelling and calls" },
          { label: "Codecs", value: "LDAC, AAC, SBC, LC3" },
          { label: "Spatial", value: "360 Reality Audio, cinema upmix" },
        ],
      },
      {
        title: "Battery",
        items: [
          { label: "With noise cancelling", value: "Up to 30 hours" },
          { label: "Without", value: "Up to 40 hours" },
          { label: "Quick charge", value: "3 minutes for 3 hours" },
          { label: "Full charge", value: "About 3.5 hours" },
        ],
      },
      {
        title: "Features and body",
        items: [
          { label: "Multipoint", value: "Two devices at once, with LDAC" },
          { label: "Controls", value: "Touch panel, Speak-to-Chat, wear detection" },
          { label: "Weight", value: "254 g" },
          { label: "Folding", value: "Yes — case is a magnetic-clasp design" },
          { label: "Wireless", value: "Bluetooth 5.3, Auracast" },
          { label: "Wired", value: "3.5 mm, works with the headphones off" },
        ],
      },
    ],
    source: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm6",
  },
  {
    id: "bose-qc-ultra-2",
    name: "Bose QuietComfort Ultra (2nd gen)",
    brandId: "bose",
    category: "audio",
    released: "2025-09",
    status: "shipping",
    priceUsd: 449,
    summary: "The strongest noise cancelling on the market, now with adaptive tuning to your ear.",
    highlights: [
      "Widely measured as the deepest noise cancelling available",
      "Immersive Audio places the soundstage in front of you rather than inside your head",
      "Adjusts cancellation continuously to the seal your ears actually make",
    ],
    specs: [
      {
        title: "Audio",
        items: [
          { label: "Noise cancelling", value: "Adaptive, with CustomTune ear calibration" },
          { label: "Spatial", value: "Bose Immersive Audio — still and motion modes" },
          { label: "Codecs", value: "aptX Adaptive, AAC, SBC" },
          { label: "Modes", value: "Quiet, Aware with ActiveSense, Immersion" },
        ],
      },
      {
        title: "Battery",
        items: [
          { label: "With noise cancelling", value: "Up to 30 hours" },
          { label: "With Immersive Audio", value: "Up to 23 hours" },
          { label: "Quick charge", value: "15 minutes for 2.5 hours" },
        ],
      },
      {
        title: "Features and body",
        items: [
          { label: "Multipoint", value: "Two devices at once" },
          { label: "Weight", value: "250 g" },
          { label: "Wireless", value: "Bluetooth 5.3" },
          { label: "Wired", value: "2.5 mm to 3.5 mm cable, and USB-C audio" },
          { label: "Folding", value: "Yes, with a hard case" },
        ],
      },
    ],
    source: "https://www.bose.com/p/headphones/bose-quietcomfort-ultra-headphones/QCUH-HEADPHONEARN.html",
  },
];

export const CAMERAS: Product[] = [
  {
    id: "canon-eos-r5-ii",
    name: "Canon EOS R5 Mark II",
    brandId: "canon",
    category: "camera",
    released: "2024-08",
    status: "shipping",
    priceUsd: 4299,
    summary: "A 45MP stacked-sensor body that shoots 30 frames a second and 8K RAW.",
    highlights: [
      "Stacked sensor cuts rolling shutter enough to make the electronic shutter usable for sport",
      "Eye Control AF — the viewfinder tracks where you are actually looking",
      "8K 60p RAW internally, with a cooling grip available for long takes",
    ],
    specs: [
      {
        title: "Sensor",
        items: [
          { label: "Type", value: "45MP full-frame stacked back-illuminated CMOS" },
          { label: "Size", value: "36 × 24 mm" },
          { label: "Processor", value: "DIGIC X with a DIGIC Accelerator" },
          { label: "ISO", value: "100–51,200 (expandable to 102,400)" },
          { label: "Stabilisation", value: "In-body, up to 8.5 stops with a compatible lens" },
        ],
      },
      {
        title: "Autofocus and shooting",
        items: [
          { label: "System", value: "Dual Pixel CMOS AF II, 1053 zones" },
          { label: "Subject detection", value: "People, animals, vehicles; Action Priority for sport" },
          { label: "Eye Control AF", value: "Yes — selects the AF point from where you look" },
          { label: "Burst (electronic)", value: "30 fps" },
          { label: "Burst (mechanical)", value: "12 fps" },
          { label: "Pre-capture", value: "Up to 15 frames before the shutter press" },
        ],
      },
      {
        title: "Video",
        items: [
          { label: "Maximum", value: "8K 60p RAW internal (12-bit)" },
          { label: "4K", value: "Up to 120p, oversampled from 8K" },
          { label: "Codecs", value: "Canon RAW Light, XF-AVC, XF-HEVC S, MP4" },
          { label: "Log", value: "Canon Log 2 and Canon Log 3" },
        ],
      },
      {
        title: "Body",
        items: [
          { label: "Viewfinder", value: "5.76M-dot OLED, 120 fps" },
          { label: "Screen", value: "3.2 in vari-angle touchscreen, 2.1M dots" },
          { label: "Storage", value: "1 × CFexpress Type B, 1 × SD UHS-II" },
          { label: "Weight", value: "746 g with battery and card" },
          { label: "Weather sealing", value: "Yes" },
          { label: "Mount", value: "Canon RF" },
        ],
      },
    ],
    source: "https://www.usa.canon.com/shop/p/eos-r5-mark-ii",
  },
  {
    id: "fujifilm-x100vi",
    name: "Fujifilm X100VI",
    brandId: "fujifilm",
    category: "camera",
    released: "2024-02",
    status: "shipping",
    priceUsd: 1599,
    summary: "A fixed-lens compact with a hybrid viewfinder — the camera that sold out for a year.",
    highlights: [
      "In-body stabilisation in a fixed-lens compact, which is what the previous five versions lacked",
      "Hybrid viewfinder switches between optical and electronic with a front lever",
      "40MP from an APS-C sensor behind a fixed 23mm ƒ/2 lens",
    ],
    specs: [
      {
        title: "Sensor and lens",
        items: [
          { label: "Sensor", value: "40.2MP X-Trans CMOS 5 HR, APS-C" },
          { label: "Processor", value: "X-Processor 5" },
          { label: "Lens", value: "Fixed 23mm ƒ/2 (35mm equivalent)" },
          { label: "Filter", value: "Built-in 4-stop neutral density" },
          { label: "ISO", value: "125–12,800 (expandable to 51,200)" },
          { label: "Stabilisation", value: "In-body, up to 6 stops" },
        ],
      },
      {
        title: "Viewfinder and screen",
        items: [
          { label: "Viewfinder", value: "Hybrid — optical (0.52×) or 3.69M-dot OLED electronic" },
          { label: "Screen", value: "3 in tilting touchscreen, 1.62M dots" },
        ],
      },
      {
        title: "Shooting",
        items: [
          { label: "Burst", value: "11 fps mechanical, 20 fps electronic (1.29× crop)" },
          { label: "Autofocus", value: "Hybrid phase and contrast, with subject detection" },
          { label: "Film simulations", value: "20, including Reala Ace" },
          { label: "Shutter", value: "Leaf shutter — flash sync at any speed" },
        ],
      },
      {
        title: "Video and body",
        items: [
          { label: "Video", value: "6.2K 30p, 4K 60p, 10-bit 4:2:2 internal" },
          { label: "Log", value: "F-Log and F-Log2" },
          { label: "Storage", value: "1 × SD UHS-I" },
          { label: "Weight", value: "521 g with battery and card" },
          { label: "Weather sealing", value: "With an optional adapter ring and filter" },
        ],
      },
    ],
    source: "https://fujifilm-x.com/en-us/products/cameras/x100vi/specifications/",
  },
];
