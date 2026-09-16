/**
 * Laptops.
 *
 * A laptop is sold as a chassis with a range of chips, memory and storage
 * behind it, so the sheets here give the **range** rather than one
 * configuration — a single-configuration sheet is the most common way a laptop
 * listing misleads, because the price quoted is always the bottom of the range
 * and the specs quoted are usually not.
 *
 * `priceUsd` is therefore the starting configuration's price, and the storage
 * and memory rows say what the range is.
 */

import type { Product } from "../types";

export const LAPTOPS: Product[] = [
  {
    id: "macbook-pro-16-m4",
    name: 'MacBook Pro 16" (M4 Pro / M4 Max)',
    brandId: "apple",
    category: "laptop",
    released: "2024-11",
    status: "shipping",
    priceUsd: 2499,
    summary: "Apple's workstation laptop — the one configuration range that runs 546 GB/s of memory bandwidth.",
    highlights: [
      "Up to 128 GB of unified memory with 546 GB/s of bandwidth on the M4 Max",
      "Thunderbolt 5 (120 Gb/s) on every Pro and Max configuration",
      "Nano-texture glass is a build-to-order option, not a separate model",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "16.2 in Liquid Retina XDR" },
          { label: "Panel", value: "Mini-LED backlit IPS" },
          { label: "Resolution", value: "3456 × 2234 (254 ppi)" },
          { label: "Refresh rate", value: "up to 120 Hz (ProMotion), adaptive" },
          { label: "Brightness", value: "1000 nits sustained full-screen, 1600 nits peak HDR, 1000 nits SDR" },
          { label: "Finish", value: "Standard or nano-texture glass" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Apple M4 Pro or M4 Max" },
          { label: "CPU", value: "12-core or 14-core (M4 Pro); 14-core or 16-core (M4 Max)" },
          { label: "GPU", value: "16-core or 20-core (M4 Pro); 32-core or 40-core (M4 Max)" },
          { label: "Neural Engine", value: "16-core" },
          { label: "Memory", value: "24–48 GB (M4 Pro); 36–128 GB (M4 Max)" },
          { label: "Memory bandwidth", value: "273 GB/s (M4 Pro); 410 or 546 GB/s (M4 Max)" },
          { label: "Storage", value: "512 GB – 8 TB SSD" },
        ],
      },
      {
        title: "Battery and power",
        items: [
          { label: "Capacity", value: "100 Wh" },
          { label: "Video playback", value: "Up to 24 hours" },
          { label: "Charging", value: "MagSafe 3, fast charge to 50% in 30 min (96W or 140W adapter)" },
        ],
      },
      {
        title: "Ports and connectivity",
        items: [
          { label: "Thunderbolt", value: "3 × Thunderbolt 5 (120 Gb/s)" },
          { label: "Other ports", value: "HDMI 2.1, SDXC (UHS-II), 3.5 mm headphone, MagSafe 3" },
          { label: "External displays", value: "Up to 4 (M4 Max)" },
          { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3" },
          { label: "Camera", value: "12MP Center Stage, Desk View" },
          { label: "Audio", value: "Six speakers, Spatial Audio; three-mic array" },
        ],
      },
      {
        title: "Body",
        items: [
          { label: "Dimensions", value: "355.7 × 248.1 × 16.8 mm" },
          { label: "Weight", value: "2.14 kg (M4 Pro) / 2.15 kg (M4 Max)" },
          { label: "Operating system", value: "macOS" },
        ],
      },
    ],
    source: "https://www.apple.com/macbook-pro/specs/",
  },
  {
    id: "macbook-air-13-m4",
    name: 'MacBook Air 13" (M4)',
    brandId: "apple",
    category: "laptop",
    released: "2025-03",
    status: "shipping",
    priceUsd: 999,
    summary: "The default laptop: fanless, 18 hours of battery, and now 16 GB of memory at the base price.",
    highlights: [
      "Base memory doubled to 16 GB with no price rise",
      "Drives two external displays with the lid open — the M3 needed it closed",
      "Completely fanless, so it is silent under any load",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "13.6 in Liquid Retina" },
          { label: "Resolution", value: "2560 × 1664 (224 ppi)" },
          { label: "Brightness", value: "500 nits" },
          { label: "Colour", value: "P3 wide colour, True Tone" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Apple M4" },
          { label: "CPU", value: "10-core (4 performance + 6 efficiency)" },
          { label: "GPU", value: "8-core or 10-core" },
          { label: "Neural Engine", value: "16-core" },
          { label: "Memory", value: "16 GB / 24 GB / 32 GB unified" },
          { label: "Memory bandwidth", value: "120 GB/s" },
          { label: "Storage", value: "256 GB – 2 TB SSD" },
          { label: "Cooling", value: "Fanless" },
        ],
      },
      {
        title: "Battery and ports",
        items: [
          { label: "Capacity", value: "53.8 Wh" },
          { label: "Video playback", value: "Up to 18 hours" },
          { label: "Ports", value: "2 × Thunderbolt 4, MagSafe 3, 3.5 mm headphone" },
          { label: "External displays", value: "Up to 2, with the lid open" },
          { label: "Wireless", value: "Wi-Fi 6E, Bluetooth 5.3" },
          { label: "Camera", value: "12MP Center Stage" },
        ],
      },
      {
        title: "Body",
        items: [
          { label: "Dimensions", value: "304.1 × 215.0 × 11.3 mm" },
          { label: "Weight", value: "1.24 kg" },
          { label: "Operating system", value: "macOS" },
        ],
      },
    ],
    source: "https://www.apple.com/macbook-air/specs/",
  },
  {
    id: "thinkpad-x1-carbon-gen13",
    name: "ThinkPad X1 Carbon Gen 13 Aura",
    brandId: "lenovo",
    category: "laptop",
    released: "2025-02",
    status: "shipping",
    priceUsd: 1729,
    summary: "The business ultrabook — under a kilogram, with the port selection the thin-and-light crowd dropped.",
    highlights: [
      "Under 1 kg with a carbon-fibre lid",
      "Keeps two USB-A ports and HDMI, which most 14-inch rivals have dropped",
      "MIL-STD-810H tested, with a self-healing firmware layer",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "14 in" },
          { label: "Options", value: "WUXGA IPS (1920 × 1200) or 2.8K OLED (2880 × 1800, 120 Hz)" },
          { label: "Brightness", value: "400 nits (IPS) / 500 nits peak HDR (OLED)" },
          { label: "Touch", value: "Optional" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Intel Core Ultra 7 258V / Core Ultra 5 (Series 2, Lunar Lake)" },
          { label: "Graphics", value: "Intel Arc 140V integrated" },
          { label: "NPU", value: "Up to 47 TOPS" },
          { label: "Memory", value: "16 GB or 32 GB LPDDR5X (soldered)" },
          { label: "Storage", value: "512 GB – 2 TB PCIe Gen4 SSD" },
        ],
      },
      {
        title: "Battery and ports",
        items: [
          { label: "Capacity", value: "57 Wh" },
          { label: "Ports", value: "2 × Thunderbolt 4, 2 × USB-A 3.2 Gen 1, HDMI 2.1, 3.5 mm" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 5.4, optional 5G WWAN" },
          { label: "Camera", value: "8MP with privacy shutter, IR for Windows Hello" },
        ],
      },
      {
        title: "Body and security",
        items: [
          { label: "Weight", value: "From 0.99 kg" },
          { label: "Thickness", value: "14.6 mm" },
          { label: "Durability", value: "MIL-STD-810H" },
          { label: "Security", value: "Fingerprint reader, dTPM 2.0, ThinkShield" },
          { label: "Operating system", value: "Windows 11 Pro" },
        ],
      },
    ],
    source: "https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-13-aura-edition",
  },
  {
    id: "dell-14-premium",
    name: "Dell 14 Premium",
    brandId: "dell",
    category: "laptop",
    released: "2025-03",
    status: "shipping",
    priceUsd: 1499,
    summary: "The laptop formerly called the XPS 14, under Dell's renamed lineup.",
    highlights: [
      "Optional 3.2K OLED touch panel at 120 Hz",
      "Discrete RTX 4050 is an option in a 1.7 kg chassis",
      "Capacitive function row and seamless glass touchpad — divisive, and unchanged",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "14.5 in" },
          { label: "Options", value: "FHD+ IPS (1920 × 1200, 120 Hz) or 3.2K OLED touch (3200 × 2000, 120 Hz)" },
          { label: "Brightness", value: "500 nits (IPS) / 400 nits (OLED)" },
          { label: "Colour", value: "100% DCI-P3 (OLED)" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Intel Core Ultra 7 255H / Core Ultra 9 285H" },
          { label: "Graphics", value: "Intel Arc integrated, or Nvidia GeForce RTX 4050 6 GB" },
          { label: "Memory", value: "16 GB / 32 GB / 64 GB LPDDR5X" },
          { label: "Storage", value: "512 GB – 4 TB PCIe SSD" },
        ],
      },
      {
        title: "Battery and ports",
        items: [
          { label: "Capacity", value: "69.5 Wh" },
          { label: "Ports", value: "3 × Thunderbolt 4 (USB-C), microSD, 3.5 mm" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 5.4" },
          { label: "Camera", value: "1080p with IR for Windows Hello" },
        ],
      },
      {
        title: "Body",
        items: [
          { label: "Dimensions", value: "320.0 × 216.0 × 18.0 mm" },
          { label: "Weight", value: "From 1.68 kg" },
          { label: "Build", value: "CNC aluminium with Gorilla Glass 3 palm rest" },
          { label: "Operating system", value: "Windows 11" },
        ],
      },
    ],
    source: "https://www.dell.com/en-us/shop/dell-laptops/14-premium/spd/dell-14-9440-laptop",
  },
  {
    id: "rog-zephyrus-g16-2025",
    name: "ROG Zephyrus G16 (2025)",
    brandId: "asus",
    category: "laptop",
    released: "2025-02",
    status: "shipping",
    priceUsd: 2199,
    summary: "A 1.85 kg gaming laptop with an OLED panel, which used to be a contradiction.",
    highlights: [
      "2.5K 240 Hz OLED — 0.2 ms response, which no gaming IPS panel matches",
      "Up to an RTX 5090 Laptop GPU in a 14.9 mm chassis",
      "Vapour chamber with a liquid-metal thermal interface on the CPU",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "16 in ROG Nebula OLED" },
          { label: "Resolution", value: "2560 × 1600" },
          { label: "Refresh rate", value: "240 Hz" },
          { label: "Response time", value: "0.2 ms" },
          { label: "Brightness", value: "500 nits peak HDR" },
          { label: "Colour", value: "100% DCI-P3, Pantone validated" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "Intel Core Ultra 9 285H" },
          { label: "Graphics", value: "Nvidia GeForce RTX 5070 Ti / RTX 5080 / RTX 5090 Laptop" },
          { label: "Graphics power", value: "Up to 120W with Dynamic Boost" },
          { label: "Memory", value: "32 GB LPDDR5X-8000 (soldered)" },
          { label: "Storage", value: "1 TB / 2 TB PCIe Gen4 SSD" },
          { label: "Cooling", value: "Vapour chamber, liquid metal on CPU, tri-fan" },
        ],
      },
      {
        title: "Battery and ports",
        items: [
          { label: "Capacity", value: "90 Wh" },
          { label: "Ports", value: "1 × Thunderbolt 5, 1 × USB-C 3.2 Gen 2, 2 × USB-A, HDMI 2.1, SD card, 3.5 mm" },
          { label: "Charging", value: "200W barrel, or 100W USB-C Power Delivery" },
          { label: "Wireless", value: "Wi-Fi 7, Bluetooth 5.4" },
        ],
      },
      {
        title: "Body",
        items: [
          { label: "Dimensions", value: "354 × 246 × 14.9–16.4 mm" },
          { label: "Weight", value: "1.85 kg" },
          { label: "Build", value: "CNC aluminium" },
          { label: "Operating system", value: "Windows 11" },
        ],
      },
    ],
    source: "https://rog.asus.com/laptops/rog-zephyrus/rog-zephyrus-g16-2025/spec/",
  },
  {
    id: "framework-laptop-13-2025",
    name: "Framework Laptop 13 (Ryzen AI 300)",
    brandId: "framework",
    category: "laptop",
    released: "2025-04",
    status: "shipping",
    priceUsd: 1099,
    summary: "The repairable laptop — every port, the mainboard and the screen are user-replaceable parts.",
    highlights: [
      "Every component is a documented, orderable spare part with a QR code on it",
      "Four Expansion Card slots — you choose which ports the laptop has",
      "Mainboard upgrades fit every chassis back to the 2021 original",
    ],
    specs: [
      {
        title: "Display",
        items: [
          { label: "Size", value: "13.5 in" },
          { label: "Options", value: "2256 × 1504 (60 Hz) or 2880 × 1920 (120 Hz)" },
          { label: "Aspect ratio", value: "3:2" },
          { label: "Brightness", value: "400 nits (standard) / 500 nits (2.8K)" },
          { label: "Replaceable", value: "Yes — sold as a spare part" },
        ],
      },
      {
        title: "Performance",
        items: [
          { label: "Chip", value: "AMD Ryzen AI 5 340 / Ryzen AI 7 350 / Ryzen AI 9 HX 370" },
          { label: "Graphics", value: "AMD Radeon 840M / 860M / 890M integrated" },
          { label: "NPU", value: "Up to 50 TOPS (XDNA 2)" },
          { label: "Memory", value: "Up to 96 GB DDR5-5600 — two SODIMM slots, user-replaceable" },
          { label: "Storage", value: "Up to 8 TB — M.2 2280 plus M.2 2230, user-replaceable" },
        ],
      },
      {
        title: "Ports and battery",
        items: [
          { label: "Ports", value: "4 × Expansion Card slots — choose USB-C, USB-A, HDMI, DisplayPort, Ethernet, microSD or storage" },
          { label: "Capacity", value: "61 Wh" },
          { label: "Charging", value: "USB-C Power Delivery, 60W" },
          { label: "Wireless", value: "Wi-Fi 7 (AMD RZ717), Bluetooth 5.4" },
        ],
      },
      {
        title: "Body and repairability",
        items: [
          { label: "Dimensions", value: "296.6 × 228.9 × 15.9 mm" },
          { label: "Weight", value: "From 1.3 kg" },
          { label: "Tools", value: "One bundled screwdriver opens the whole machine" },
          { label: "Operating system", value: "Windows 11, or Linux (officially supported)" },
        ],
      },
    ],
    source: "https://frame.work/laptop13",
  },
];
