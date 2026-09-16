/**
 * Browsing, as opposed to searching.
 *
 * Search answers "what are the specs of the thing I already named". This file
 * answers the other question — *show me the phones* — which needs an
 * enumerable list rather than a query.
 *
 * ## Why encyclopedia categories, and not Wikidata
 *
 * Wikidata looks like the right tool (`?item wdt:P31 wd:Q22645`) and measurably
 * is not. Its `smartphone` class holds almost nothing, because real phone items
 * are typed as *smartphone model* instead; its laptop subtree had **35** items
 * with an English article, against hundreds in the categories below; and the
 * query service answered one of these probes with a 502 after thirty seconds.
 * A browse tab is the most latency-sensitive surface in the app, and that is
 * not a foundation to put under it.
 *
 * Wikipedia's own categories are maintained by the same people who write the
 * articles, come from the API this app already uses, and answered every probe
 * in under a second.
 *
 * ## Why the names are written down rather than derived
 *
 * There is no rule to derive them from. "Samsung mobile phones" exists and
 * "Samsung smartphones" also exists with a different 93 members; "Asus
 * smartphones" exists but "Asus laptops" does not; Apple's phones are under
 * "IPhone" and its laptops under "MacBook". **Every category name in this file
 * was checked against the live API and its member count recorded in the
 * comment beside it.** A name that cannot be verified is not guessed at — that
 * maker gets a `search` instead, which always resolves to something.
 */

/** One way into a kind of product: a maker, a segment, or a year. */
export interface BrowseSource {
  id: string;
  /** Chip label — a maker's name, or what the list is. */
  name: string;
  /** A verified Wikipedia category. Preferred: it is an enumeration. */
  category?: string;
  /** Fallback for a maker with no usable category. Always resolves. */
  search?: string;
}

/** A kind of product, and the lists it can be browsed by. */
export interface BrowseKind {
  id: string;
  /** Tab-chip label. */
  name: string;
  /** One line under the chips, saying what this list is and is not. */
  note: string;
  sources: BrowseSource[];
}

/**
 * The catalogue.
 *
 * Member counts are from the live API at the time of writing and will drift;
 * they are recorded so a future reader can tell a category that shrank from one
 * that was renamed out from under us.
 */
export const BROWSE_KINDS: BrowseKind[] = [
  {
    id: "phones",
    name: "Phones",
    note: "Around a thousand handsets across these makers — every one with an encyclopedia article.",
    sources: [
      { id: "iphone", name: "Apple", category: "IPhone" }, // 90
      // Two Samsung categories exist and they are not interchangeable:
      // "Samsung smartphones" is the Galaxy line, while "Samsung mobile phones"
      // turned out to be the pre-Galaxy feature phones — its newest member is
      // from 2010. The modern one is the default; the other is kept, labelled,
      // because those handsets are genuinely what someone looking for an
      // SGH-A717 wants.
      { id: "samsung", name: "Samsung", category: "Samsung smartphones" }, // 93
      { id: "samsung-legacy", name: "Samsung (pre-Galaxy)", category: "Samsung mobile phones" }, // 117
      { id: "pixel", name: "Google Pixel", category: "Google Pixel" }, // 51
      { id: "xiaomi", name: "Xiaomi", category: "Xiaomi smartphones" }, // 118
      { id: "oneplus", name: "OnePlus", category: "OnePlus mobile phones" }, // 37
      { id: "oppo", name: "Oppo", category: "Oppo smartphones" }, // 92
      { id: "vivo", name: "Vivo", category: "Vivo smartphones" }, // 56
      { id: "motorola", name: "Motorola", category: "Motorola mobile phones" }, // 71
      { id: "nokia", name: "Nokia", category: "Nokia mobile phones" }, // 222
      { id: "sony-phone", name: "Sony", category: "Sony mobile phones" }, // 28
      { id: "htc", name: "HTC", category: "HTC mobile phones" }, // 116
      { id: "huawei", name: "Huawei", category: "Huawei mobile phones" }, // 12
      { id: "asus-phone", name: "Asus", category: "Asus smartphones" }, // 15
      { id: "realme", name: "Realme", search: "Realme smartphone" },
      { id: "nothing", name: "Nothing", search: "Nothing Phone" },
      { id: "phones-2026", name: "New in 2026", category: "Mobile phones introduced in 2026" }, // 41
      { id: "phones-2025", name: "New in 2025", category: "Mobile phones introduced in 2025" }, // 69
      { id: "phones-2024", name: "New in 2024", category: "Mobile phones introduced in 2024" }, // 88
    ],
  },
  {
    id: "laptops",
    name: "Laptops",
    note: "Most laptop articles cover a whole line (MacBook Air, ThinkPad X series) rather than one year's model, so a sheet here often describes a family.",
    sources: [
      { id: "macbook", name: "Apple", category: "MacBook" }, // 11
      { id: "thinkpad", name: "ThinkPad", category: "ThinkPad" }, // 51
      { id: "lenovo", name: "Lenovo", category: "Lenovo laptops" }, // 35
      { id: "dell", name: "Dell", category: "Dell laptops" }, // 10
      { id: "hp", name: "HP", category: "HP laptops" }, // 18
      { id: "surface", name: "Microsoft", category: "Microsoft Surface" }, // 35
      { id: "toshiba", name: "Toshiba", category: "Toshiba laptops" }, // 24
      { id: "asus-laptop", name: "Asus", search: "Asus Zenbook Vivobook laptop" },
      { id: "acer", name: "Acer", search: "Acer Aspire Swift laptop" },
      { id: "msi", name: "MSI", search: "MSI laptop series" },
      { id: "framework", name: "Framework", search: "Framework Laptop" },
      { id: "laptops-all", name: "Notable", category: "Laptops" }, // 45
      { id: "subnotebooks", name: "Ultraportable", category: "Subnotebooks" }, // 36
      { id: "netbooks", name: "Netbooks", category: "Netbooks" }, // 35
    ],
  },
  {
    id: "tablets",
    name: "Tablets",
    note: "Tablets and 2-in-1s.",
    sources: [
      { id: "ipad", name: "Apple", category: "IPad" }, // 47
      { id: "surface-tab", name: "Microsoft", category: "Microsoft Surface" }, // 35
      { id: "galaxy-tab", name: "Samsung", search: "Samsung Galaxy Tab" },
      { id: "fire", name: "Amazon", search: "Amazon Fire tablet" },
      { id: "tablets-all", name: "All tablets", category: "Tablet computers" }, // 156
    ],
  },
  {
    id: "cameras",
    name: "Cameras",
    note: "Camera coverage is thinner than phones — the encyclopedia documents landmark bodies rather than every release.",
    sources: [
      { id: "sony-cam", name: "Sony", category: "Sony cameras" }, // 11
      { id: "canon", name: "Canon EOS", category: "Canon EOS cameras" }, // 10
      { id: "nikon", name: "Nikon", category: "Nikon cameras" }, // 4
      { id: "fujifilm", name: "Fujifilm", category: "Fujifilm cameras" }, // 4
      { id: "olympus", name: "Olympus", category: "Olympus cameras" }, // 8
      { id: "leica", name: "Leica", category: "Leica cameras" }, // 5
      { id: "mirrorless", name: "Mirrorless", category: "Mirrorless cameras" }, // 5
      { id: "digital-cams", name: "All digital", category: "Digital cameras" }, // 39
    ],
  },
  {
    id: "consoles",
    name: "Consoles",
    note: "Games consoles, home and handheld.",
    sources: [
      { id: "gen9", name: "Current gen", category: "Ninth-generation video game consoles" }, // 15
      { id: "gen8", name: "Previous gen", category: "Eighth-generation video game consoles" }, // 36
      { id: "nintendo", name: "Nintendo", category: "Nintendo consoles" }, // 11
      { id: "playstation", name: "PlayStation", search: "PlayStation console" },
      { id: "xbox", name: "Xbox", search: "Xbox console" },
      { id: "handhelds", name: "Handhelds", category: "Handheld game consoles" }, // 77
      { id: "consoles-all", name: "All consoles", category: "Video game consoles" }, // 10
    ],
  },
  {
    id: "components",
    name: "Graphics",
    note: "Graphics cards and the processors on them.",
    sources: [
      { id: "gpu-cards", name: "Graphics cards", category: "Graphics cards" }, // 142
      { id: "nvidia", name: "Nvidia", category: "Nvidia graphics processors" }, // 15
      { id: "amd-gpu", name: "AMD", search: "AMD Radeon graphics card series" },
      { id: "intel-arc", name: "Intel", search: "Intel Arc graphics" },
      { id: "gpus-all", name: "All GPUs", category: "Graphics processing units" }, // 61
    ],
  },
  {
    id: "watches",
    name: "Watches",
    note: "Smartwatches and wearables.",
    sources: [
      { id: "apple-watch", name: "Apple Watch", category: "Apple Watch" }, // 24
      { id: "wear-os", name: "Wear OS", category: "Wear OS devices" }, // 27
      { id: "galaxy-watch", name: "Samsung", search: "Samsung Galaxy Watch" },
      { id: "watches-all", name: "All smartwatches", category: "Smartwatches" }, // 81
    ],
  },
  {
    id: "cars",
    name: "Cars",
    note: "By maker or by year. A car article usually covers one generation, so a sheet may list several engines.",
    sources: [
      { id: "toyota", name: "Toyota", category: "Toyota vehicles" }, // 303
      { id: "ford", name: "Ford", category: "Ford vehicles" }, // 211
      { id: "honda-car", name: "Honda", category: "Honda vehicles" }, // 144
      { id: "bmw", name: "BMW", category: "BMW vehicles" }, // 136
      { id: "hyundai", name: "Hyundai", category: "Hyundai vehicles" }, // 92
      { id: "tesla", name: "Tesla", category: "Tesla vehicles" }, // 14
      { id: "maruti", name: "Maruti Suzuki", search: "Maruti Suzuki car" },
      { id: "electric-cars", name: "Electric", category: "Electric cars" }, // 20
      { id: "cars-2026", name: "New in 2026", category: "Cars introduced in 2026" }, // 134
      { id: "cars-2025", name: "New in 2025", category: "Cars introduced in 2025" }, // 141
      { id: "cars-2024", name: "New in 2024", category: "Cars introduced in 2024" }, // 155
    ],
  },
  {
    id: "motorcycles",
    name: "Motorcycles",
    note: "By maker. Honda and Yamaha alone run to hundreds of models.",
    sources: [
      { id: "honda-moto", name: "Honda", category: "Honda motorcycles" }, // 348
      { id: "yamaha", name: "Yamaha", category: "Yamaha motorcycles" }, // 219
      { id: "harley", name: "Harley-Davidson", category: "Harley-Davidson motorcycles" }, // 34
      { id: "ktm", name: "KTM", category: "KTM motorcycles" }, // 31
      { id: "royal-enfield", name: "Royal Enfield", category: "Royal Enfield motorcycles" }, // 15
      { id: "bajaj", name: "Bajaj", search: "Bajaj Auto motorcycle" },
      { id: "tvs", name: "TVS", search: "TVS Motor motorcycle" },
    ],
  },
  {
    id: "audio",
    name: "Audio",
    note: "Headphones and speakers.",
    sources: [
      { id: "headphones", name: "Headphones", category: "Headphones" }, // 31
      { id: "bt-speakers", name: "Bluetooth speakers", category: "Bluetooth speakers" }, // 18
      { id: "loudspeakers", name: "Loudspeakers", category: "Loudspeakers" }, // 88
      { id: "airpods", name: "Apple", search: "Apple AirPods" },
      { id: "sony-audio", name: "Sony", search: "Sony WH headphones" },
    ],
  },
];

/** A kind by id, falling back to the first rather than to nothing. */
export const kindById = (id: string): BrowseKind =>
  BROWSE_KINDS.find((k) => k.id === id) ?? BROWSE_KINDS[0];

/** A source within a kind, falling back to that kind's first. */
export const sourceById = (kind: BrowseKind, id: string): BrowseSource =>
  kind.sources.find((s) => s.id === id) ?? kind.sources[0];

/** Every source in the catalogue, for the lookup the API route does. */
export function findSource(kindId: string, sourceId: string): { kind: BrowseKind; source: BrowseSource } {
  const kind = kindById(kindId);
  return { kind, source: sourceById(kind, sourceId) };
}
