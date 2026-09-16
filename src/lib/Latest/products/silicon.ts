/**
 * Graphics cards and processors.
 *
 * Two conventions, both for the same reason — a silicon sheet is unusually easy
 * to write in a way that flatters the part:
 *
 * **Graphics cards are listed at their reference specification**, and the
 * sheets say so. Nearly every card is actually sold as a partner board with a
 * higher boost clock, a larger cooler and a higher price, so quoting a partner
 * figure as *the* specification would overstate the reference card and
 * understate the price.
 *
 * **Clock speeds are boost figures**, which are a ceiling rather than a
 * sustained rate: whether a part holds its boost depends on cooling and on the
 * power limit the board or laptop sets. Base clocks are given alongside where
 * the maker publishes them.
 */

import type { Product } from "../types";

export const GPUS: Product[] = [
  {
    id: "rtx-5090",
    name: "GeForce RTX 5090",
    brandId: "nvidia",
    category: "gpu",
    released: "2025-01",
    status: "shipping",
    priceUsd: 1999,
    summary: "The fastest consumer graphics card made, and the first with 32 GB of GDDR7.",
    highlights: [
      "32 GB of GDDR7 on a 512-bit bus — 1792 GB/s, roughly double the previous generation",
      "575W total board power; Nvidia specifies a 1000W system supply",
      "DLSS 4 with multi-frame generation is exclusive to this generation",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Nvidia Blackwell" },
          { label: "Process", value: "TSMC 4N (custom 5nm-class)" },
          { label: "Transistors", value: "92.2 billion" },
          { label: "Die size", value: "750 mm²" },
        ],
      },
      {
        title: "Compute",
        items: [
          { label: "CUDA cores", value: "21,760" },
          { label: "RT cores", value: "170 (4th generation)" },
          { label: "Tensor cores", value: "680 (5th generation)" },
          { label: "Base clock", value: "2.01 GHz" },
          { label: "Boost clock", value: "2.41 GHz" },
          { label: "AI performance", value: "3352 TOPS" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "32 GB GDDR7" },
          { label: "Bus width", value: "512-bit" },
          { label: "Bandwidth", value: "1792 GB/s" },
        ],
      },
      {
        title: "Power and physical",
        items: [
          { label: "Total board power", value: "575W" },
          { label: "Recommended PSU", value: "1000W" },
          { label: "Power connector", value: "1 × 16-pin (12V-2×6)" },
          { label: "Founders Edition size", value: "2 slots, 304 mm long" },
          { label: "Interface", value: "PCIe 5.0 ×16" },
        ],
      },
      {
        title: "Display output",
        items: [
          { label: "Outputs", value: "3 × DisplayPort 2.1b, 1 × HDMI 2.1b" },
          { label: "Maximum resolution", value: "4K at 480 Hz, or 8K at 165 Hz (DSC)" },
          { label: "Encoding", value: "9th-gen NVENC (×3), 6th-gen NVDEC; AV1 encode and decode" },
        ],
      },
    ],
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/",
  },
  {
    id: "rtx-5080",
    name: "GeForce RTX 5080",
    brandId: "nvidia",
    category: "gpu",
    released: "2025-01",
    status: "shipping",
    priceUsd: 999,
    summary: "Half the RTX 5090's memory and core count for half the price — the practical 4K card.",
    highlights: [
      "16 GB of GDDR7 at 960 GB/s",
      "360W board power, so a 850W supply is enough",
      "Two slots and 304 mm in Founders Edition trim — it fits cases the 5090 will not",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Nvidia Blackwell" },
          { label: "Process", value: "TSMC 4N" },
          { label: "Transistors", value: "45.6 billion" },
          { label: "Die size", value: "378 mm²" },
        ],
      },
      {
        title: "Compute",
        items: [
          { label: "CUDA cores", value: "10,752" },
          { label: "RT cores", value: "84 (4th generation)" },
          { label: "Tensor cores", value: "336 (5th generation)" },
          { label: "Base clock", value: "2.30 GHz" },
          { label: "Boost clock", value: "2.62 GHz" },
          { label: "AI performance", value: "1801 TOPS" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "16 GB GDDR7" },
          { label: "Bus width", value: "256-bit" },
          { label: "Bandwidth", value: "960 GB/s" },
        ],
      },
      {
        title: "Power and physical",
        items: [
          { label: "Total board power", value: "360W" },
          { label: "Recommended PSU", value: "850W" },
          { label: "Power connector", value: "1 × 16-pin (12V-2×6)" },
          { label: "Interface", value: "PCIe 5.0 ×16" },
        ],
      },
      {
        title: "Display output",
        items: [
          { label: "Outputs", value: "3 × DisplayPort 2.1b, 1 × HDMI 2.1b" },
          { label: "Encoding", value: "9th-gen NVENC (×2), 6th-gen NVDEC; AV1" },
        ],
      },
    ],
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/",
  },
  {
    id: "rtx-5070-ti",
    name: "GeForce RTX 5070 Ti",
    brandId: "nvidia",
    category: "gpu",
    released: "2025-02",
    status: "shipping",
    priceUsd: 749,
    summary: "The 1440p and entry-4K card, and the cheapest RTX 50 with 16 GB of memory.",
    highlights: [
      "16 GB of GDDR7 — the memory capacity the tier below does not get",
      "300W board power on a 750W supply",
      "No Founders Edition; partner cards only",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Nvidia Blackwell" },
          { label: "Process", value: "TSMC 4N" },
          { label: "Transistors", value: "31.1 billion" },
        ],
      },
      {
        title: "Compute",
        items: [
          { label: "CUDA cores", value: "8,960" },
          { label: "RT cores", value: "70 (4th generation)" },
          { label: "Tensor cores", value: "280 (5th generation)" },
          { label: "Base clock", value: "2.30 GHz" },
          { label: "Boost clock", value: "2.45 GHz" },
          { label: "AI performance", value: "1406 TOPS" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "16 GB GDDR7" },
          { label: "Bus width", value: "256-bit" },
          { label: "Bandwidth", value: "896 GB/s" },
        ],
      },
      {
        title: "Power and physical",
        items: [
          { label: "Total board power", value: "300W" },
          { label: "Recommended PSU", value: "750W" },
          { label: "Power connector", value: "1 × 16-pin (12V-2×6)" },
          { label: "Interface", value: "PCIe 5.0 ×16" },
        ],
      },
    ],
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/",
  },
  {
    id: "radeon-rx-9070-xt",
    name: "Radeon RX 9070 XT",
    brandId: "amd",
    category: "gpu",
    released: "2025-03",
    status: "shipping",
    priceUsd: 599,
    summary: "AMD's RDNA 4 flagship, aimed squarely at the price bracket below Nvidia's 5070 Ti.",
    highlights: [
      "16 GB of GDDR6 at $599 — the memory-per-dollar argument of this generation",
      "FSR 4 introduces a machine-learning upscaler, closing the main gap to DLSS",
      "Ray-tracing throughput roughly doubled per compute unit over RDNA 3",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "AMD RDNA 4" },
          { label: "Process", value: "TSMC N4P" },
          { label: "Transistors", value: "53.9 billion" },
          { label: "Die size", value: "357 mm²" },
        ],
      },
      {
        title: "Compute",
        items: [
          { label: "Compute units", value: "64" },
          { label: "Stream processors", value: "4,096" },
          { label: "Ray accelerators", value: "64 (3rd generation)" },
          { label: "AI accelerators", value: "128 (2nd generation)" },
          { label: "Game clock", value: "2.40 GHz" },
          { label: "Boost clock", value: "2.97 GHz" },
          { label: "Peak compute", value: "48.7 TFLOPS (FP32)" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "16 GB GDDR6" },
          { label: "Bus width", value: "256-bit" },
          { label: "Bandwidth", value: "645 GB/s" },
          { label: "Infinity Cache", value: "64 MB" },
        ],
      },
      {
        title: "Power and physical",
        items: [
          { label: "Total board power", value: "304W" },
          { label: "Recommended PSU", value: "750W" },
          { label: "Power connectors", value: "2 × 8-pin" },
          { label: "Interface", value: "PCIe 5.0 ×16" },
        ],
      },
      {
        title: "Display output",
        items: [
          { label: "Outputs", value: "DisplayPort 2.1a, HDMI 2.1b" },
          { label: "Encoding", value: "AV1 encode and decode, H.264, HEVC" },
          { label: "Upscaling", value: "FidelityFX Super Resolution 4 (machine learning)" },
        ],
      },
    ],
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html",
  },
  {
    id: "radeon-rx-9060-xt",
    name: "Radeon RX 9060 XT 16GB",
    brandId: "amd",
    category: "gpu",
    released: "2025-06",
    status: "shipping",
    priceUsd: 349,
    summary: "The 1440p value card — 16 GB of memory at a price where rivals ship 8.",
    highlights: [
      "16 GB at $349, against 8 GB in the directly competing tier",
      "160W board power runs on a 500W supply with no 16-pin connector",
      "An 8 GB version exists at $299 — check which one a listing is offering",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "AMD RDNA 4" },
          { label: "Process", value: "TSMC N4P" },
          { label: "Transistors", value: "29.7 billion" },
          { label: "Die size", value: "199 mm²" },
        ],
      },
      {
        title: "Compute",
        items: [
          { label: "Compute units", value: "32" },
          { label: "Stream processors", value: "2,048" },
          { label: "Ray accelerators", value: "32 (3rd generation)" },
          { label: "AI accelerators", value: "64 (2nd generation)" },
          { label: "Game clock", value: "2.53 GHz" },
          { label: "Boost clock", value: "3.13 GHz" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "16 GB GDDR6 (an 8 GB version is also sold)" },
          { label: "Bus width", value: "128-bit" },
          { label: "Bandwidth", value: "322 GB/s" },
          { label: "Infinity Cache", value: "32 MB" },
        ],
      },
      {
        title: "Power and physical",
        items: [
          { label: "Total board power", value: "160W" },
          { label: "Recommended PSU", value: "500W" },
          { label: "Power connector", value: "1 × 8-pin" },
          { label: "Interface", value: "PCIe 5.0 ×16" },
        ],
      },
    ],
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9060xt.html",
  },
  {
    id: "intel-arc-b580",
    name: "Intel Arc B580",
    brandId: "intel",
    category: "gpu",
    released: "2024-12",
    status: "shipping",
    priceUsd: 249,
    summary: "The budget card that reset expectations — 12 GB of memory at $249.",
    highlights: [
      "12 GB on a 192-bit bus, unusual at this price",
      "190W board power, single 8-pin connector",
      "Needs Resizable BAR enabled to perform as specified — a real caveat on older systems",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Intel Xe2 (Battlemage)" },
          { label: "Process", value: "TSMC N5" },
          { label: "Transistors", value: "19.6 billion" },
          { label: "Die size", value: "272 mm²" },
        ],
      },
      {
        title: "Compute",
        items: [
          { label: "Xe cores", value: "20" },
          { label: "Ray tracing units", value: "20" },
          { label: "XMX engines", value: "160" },
          { label: "Graphics clock", value: "2.67 GHz" },
          { label: "Peak compute", value: "13.6 TFLOPS (FP32)" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "12 GB GDDR6" },
          { label: "Bus width", value: "192-bit" },
          { label: "Bandwidth", value: "456 GB/s" },
        ],
      },
      {
        title: "Power and requirements",
        items: [
          { label: "Total board power", value: "190W" },
          { label: "Recommended PSU", value: "600W" },
          { label: "Power connector", value: "1 × 8-pin" },
          { label: "Interface", value: "PCIe 4.0 ×8" },
          { label: "Required", value: "Resizable BAR must be enabled" },
        ],
      },
      {
        title: "Display output",
        items: [
          { label: "Outputs", value: "3 × DisplayPort 2.1, 1 × HDMI 2.1" },
          { label: "Encoding", value: "AV1 encode and decode, H.264, HEVC" },
          { label: "Upscaling", value: "XeSS 2 with frame generation" },
        ],
      },
    ],
    source: "https://www.intel.com/content/www/us/en/products/sku/241598/intel-arc-b580-graphics/specifications.html",
  },
];

export const CPUS: Product[] = [
  {
    id: "ryzen-9-9950x3d",
    name: "Ryzen 9 9950X3D",
    brandId: "amd",
    category: "cpu",
    released: "2025-03",
    status: "shipping",
    priceUsd: 699,
    summary: "Sixteen cores with 3D V-Cache — the part that stopped forcing a choice between gaming and work.",
    highlights: [
      "128 MB of L3 via 3D V-Cache stacked under the compute die, not over it",
      "Second-generation packaging lets it hold full boost clocks, unlike the 5800X3D",
      "170W TDP on the same AM5 socket as every Ryzen 7000 and 9000 part",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "AMD Zen 5" },
          { label: "Process", value: "TSMC N4P" },
          { label: "Socket", value: "AM5" },
          { label: "Packaging", value: "2nd-gen 3D V-Cache, stacked beneath the compute die" },
        ],
      },
      {
        title: "Cores and clocks",
        items: [
          { label: "Cores", value: "16" },
          { label: "Threads", value: "32" },
          { label: "Base clock", value: "4.3 GHz" },
          { label: "Boost clock", value: "Up to 5.7 GHz" },
          { label: "L2 cache", value: "16 MB" },
          { label: "L3 cache", value: "128 MB (64 MB + 64 MB 3D V-Cache)" },
        ],
      },
      {
        title: "Memory and I/O",
        items: [
          { label: "Memory", value: "DDR5-5600 (dual channel, up to 192 GB)" },
          { label: "PCIe", value: "28 lanes of PCIe 5.0" },
          { label: "Integrated graphics", value: "AMD Radeon (2 compute units)" },
        ],
      },
      {
        title: "Power and cooling",
        items: [
          { label: "TDP", value: "170W" },
          { label: "Peak package power", value: "230W" },
          { label: "Maximum temperature", value: "95 °C" },
          { label: "Cooler", value: "Not included — liquid cooling recommended" },
        ],
      },
    ],
    source: "https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d.html",
  },
  {
    id: "ryzen-7-9800x3d",
    name: "Ryzen 7 9800X3D",
    brandId: "amd",
    category: "cpu",
    released: "2024-11",
    status: "shipping",
    priceUsd: 479,
    summary: "The fastest gaming processor made, and the one most builds should actually use.",
    highlights: [
      "96 MB of L3 cache, which is what the frame-rate lead comes from",
      "Fully unlocked for overclocking — the first X3D part that is",
      "120W TDP, so air cooling is genuinely adequate",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "AMD Zen 5" },
          { label: "Process", value: "TSMC N4P" },
          { label: "Socket", value: "AM5" },
          { label: "Packaging", value: "2nd-gen 3D V-Cache" },
        ],
      },
      {
        title: "Cores and clocks",
        items: [
          { label: "Cores", value: "8" },
          { label: "Threads", value: "16" },
          { label: "Base clock", value: "4.7 GHz" },
          { label: "Boost clock", value: "Up to 5.2 GHz" },
          { label: "L2 cache", value: "8 MB" },
          { label: "L3 cache", value: "96 MB (32 MB + 64 MB 3D V-Cache)" },
          { label: "Overclocking", value: "Fully unlocked" },
        ],
      },
      {
        title: "Memory and I/O",
        items: [
          { label: "Memory", value: "DDR5-5600 (dual channel)" },
          { label: "PCIe", value: "28 lanes of PCIe 5.0" },
          { label: "Integrated graphics", value: "AMD Radeon (2 compute units)" },
        ],
      },
      {
        title: "Power and cooling",
        items: [
          { label: "TDP", value: "120W" },
          { label: "Peak package power", value: "162W" },
          { label: "Maximum temperature", value: "95 °C" },
        ],
      },
    ],
    source: "https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9800x3d.html",
  },
  {
    id: "core-ultra-9-285k",
    name: "Core Ultra 9 285K",
    brandId: "intel",
    category: "cpu",
    released: "2024-10",
    status: "shipping",
    priceUsd: 589,
    summary: "Intel's desktop flagship — a tiled design that trades peak gaming speed for much lower power.",
    highlights: [
      "24 cores with no hyper-threading at all, which is the generation's biggest change",
      "First desktop Intel part with an NPU, at 13 TOPS",
      "Runs markedly cooler than the 14900K it replaces, at some cost in games",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Intel Arrow Lake (Core Ultra 200S)" },
          { label: "Process", value: "TSMC N3B compute tile, Foveros packaging" },
          { label: "Socket", value: "LGA 1851" },
        ],
      },
      {
        title: "Cores and clocks",
        items: [
          { label: "Cores", value: "24 — 8 performance + 16 efficient" },
          { label: "Threads", value: "24 (no hyper-threading)" },
          { label: "P-core boost", value: "Up to 5.7 GHz" },
          { label: "E-core boost", value: "Up to 4.6 GHz" },
          { label: "L2 cache", value: "40 MB" },
          { label: "L3 cache", value: "36 MB" },
        ],
      },
      {
        title: "Memory and I/O",
        items: [
          { label: "Memory", value: "DDR5-6400 (dual channel, up to 192 GB)" },
          { label: "PCIe", value: "20 lanes of PCIe 5.0 + 4 of PCIe 4.0" },
          { label: "Integrated graphics", value: "Intel Arc (4 Xe cores)" },
          { label: "NPU", value: "Intel AI Boost, 13 TOPS" },
          { label: "Thunderbolt", value: "Thunderbolt 4 integrated" },
        ],
      },
      {
        title: "Power",
        items: [
          { label: "Base power", value: "125W" },
          { label: "Maximum turbo power", value: "250W" },
          { label: "Maximum temperature", value: "105 °C" },
        ],
      },
    ],
    source: "https://www.intel.com/content/www/us/en/products/sku/241060/intel-core-ultra-9-processor-285k-36m-cache-up-to-5-70-ghz/specifications.html",
  },
  {
    id: "apple-m4-max",
    name: "Apple M4 Max",
    brandId: "apple",
    category: "cpu",
    released: "2024-10",
    status: "shipping",
    priceUsd: null,
    summary: "Apple's laptop workstation chip — 546 GB/s of memory bandwidth in a 2 kg machine.",
    highlights: [
      "Up to 128 GB of unified memory, all of it addressable by the GPU",
      "546 GB/s of bandwidth, which is what makes large local models practical on a laptop",
      "Sold only inside a Mac — there is no socketed version and no list price",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Apple silicon (ARM64)" },
          { label: "Process", value: "TSMC N3E (second-generation 3nm)" },
          { label: "Transistors", value: "92 billion" },
          { label: "Packaging", value: "System on a chip with unified memory on package" },
        ],
      },
      {
        title: "Cores",
        items: [
          { label: "CPU", value: "14-core or 16-core (10 or 12 performance + 4 efficiency)" },
          { label: "GPU", value: "32-core or 40-core, with hardware ray tracing" },
          { label: "Neural Engine", value: "16-core, 38 TOPS" },
          { label: "Media engine", value: "2 × video encode, 2 × ProRes; H.264, HEVC, ProRes, AV1 decode" },
        ],
      },
      {
        title: "Memory",
        items: [
          { label: "Capacity", value: "36 GB, 48 GB, 64 GB or 128 GB unified" },
          { label: "Bandwidth", value: "410 GB/s (36 GB) or 546 GB/s (48 GB and above)" },
          { label: "Type", value: "LPDDR5X, on package" },
        ],
      },
      {
        title: "I/O",
        items: [
          { label: "Thunderbolt", value: "Thunderbolt 5 (120 Gb/s)" },
          { label: "External displays", value: "Up to 4" },
          { label: "Found in", value: 'MacBook Pro 14" and 16", Mac Studio' },
        ],
      },
    ],
    source: "https://www.apple.com/macbook-pro/specs/",
  },
  {
    id: "snapdragon-8-elite",
    name: "Snapdragon 8 Elite",
    brandId: "qualcomm",
    category: "cpu",
    released: "2024-10",
    status: "shipping",
    priceUsd: null,
    summary: "The phone chip in nearly every 2025 Android flagship, and the first with Qualcomm's own CPU cores.",
    highlights: [
      "Oryon CPU cores — Qualcomm's own design, not ARM's, in a phone for the first time",
      "Only 8 cores, and no efficiency-core cluster in the usual sense",
      "Ships in the Galaxy S25, OnePlus 13 and Xiaomi 15 lines",
    ],
    specs: [
      {
        title: "Architecture",
        items: [
          { label: "Architecture", value: "Qualcomm Oryon (2nd generation), ARM64" },
          { label: "Process", value: "TSMC N3E (3nm)" },
        ],
      },
      {
        title: "Cores and clocks",
        items: [
          { label: "CPU", value: "8-core — 2 prime + 6 performance" },
          { label: "Prime clock", value: "4.32 GHz" },
          { label: "Performance clock", value: "3.53 GHz" },
          { label: "GPU", value: "Adreno 830, with sliced architecture" },
          { label: "NPU", value: "Hexagon, 45 TOPS" },
        ],
      },
      {
        title: "Memory and media",
        items: [
          { label: "Memory", value: "LPDDR5X-5300, up to 24 GB" },
          { label: "Camera", value: "Up to 320MP; 108MP with zero shutter lag" },
          { label: "Video", value: "8K 30 fps, 4K 120 fps, Dolby Vision, 10-bit HDR" },
          { label: "Display", value: "Up to 4K at 144 Hz on device, QHD+ at 240 Hz" },
        ],
      },
      {
        title: "Connectivity",
        items: [
          { label: "Modem", value: "Snapdragon X80 5G — 10 Gb/s down" },
          { label: "Wi-Fi", value: "FastConnect 7900, Wi-Fi 7" },
          { label: "Bluetooth", value: "6.0" },
        ],
      },
    ],
    source: "https://www.qualcomm.com/products/mobile/snapdragon/smartphones/snapdragon-8-series-mobile-platforms/snapdragon-8-elite-mobile-platform",
  },
];
