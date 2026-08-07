/**
 * The 148 CSS named colours, and a nearest-name lookup.
 *
 * Matching is done in CIE L*a*b* with a plain CIE76 ΔE: it is perceptually far
 * closer to "which name would a person say" than an RGB distance, and cheap
 * enough to run on every pointer move while picking.
 */

import { hexToRgb, rgbToLab } from "./convert";
import type { ColorName, LAB, RGB } from "./types";

/** name → hex, exactly as the CSS Color specification defines them. */
export const CSS_COLORS: Record<string, string> = {
  aliceblue: "#f0f8ff", antiquewhite: "#faebd7", aqua: "#00ffff", aquamarine: "#7fffd4",
  azure: "#f0ffff", beige: "#f5f5dc", bisque: "#ffe4c4", black: "#000000",
  blanchedalmond: "#ffebcd", blue: "#0000ff", blueviolet: "#8a2be2", brown: "#a52a2a",
  burlywood: "#deb887", cadetblue: "#5f9ea0", chartreuse: "#7fff00", chocolate: "#d2691e",
  coral: "#ff7f50", cornflowerblue: "#6495ed", cornsilk: "#fff8dc", crimson: "#dc143c",
  cyan: "#00ffff", darkblue: "#00008b", darkcyan: "#008b8b", darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9", darkgreen: "#006400", darkkhaki: "#bdb76b", darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f", darkorange: "#ff8c00", darkorchid: "#9932cc", darkred: "#8b0000",
  darksalmon: "#e9967a", darkseagreen: "#8fbc8f", darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f", darkturquoise: "#00ced1", darkviolet: "#9400d3",
  deeppink: "#ff1493", deepskyblue: "#00bfff", dimgray: "#696969", dodgerblue: "#1e90ff",
  firebrick: "#b22222", floralwhite: "#fffaf0", forestgreen: "#228b22", fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc", ghostwhite: "#f8f8ff", gold: "#ffd700", goldenrod: "#daa520",
  gray: "#808080", green: "#008000", greenyellow: "#adff2f", honeydew: "#f0fff0",
  hotpink: "#ff69b4", indianred: "#cd5c5c", indigo: "#4b0082", ivory: "#fffff0",
  khaki: "#f0e68c", lavender: "#e6e6fa", lavenderblush: "#fff0f5", lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd", lightblue: "#add8e6", lightcoral: "#f08080", lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2", lightgray: "#d3d3d3", lightgreen: "#90ee90",
  lightpink: "#ffb6c1", lightsalmon: "#ffa07a", lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa", lightslategray: "#778899", lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0", lime: "#00ff00", limegreen: "#32cd32", linen: "#faf0e6",
  magenta: "#ff00ff", maroon: "#800000", mediumaquamarine: "#66cdaa", mediumblue: "#0000cd",
  mediumorchid: "#ba55d3", mediumpurple: "#9370db", mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee", mediumspringgreen: "#00fa9a", mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585", midnightblue: "#191970", mintcream: "#f5fffa",
  mistyrose: "#ffe4e1", moccasin: "#ffe4b5", navajowhite: "#ffdead", navy: "#000080",
  oldlace: "#fdf5e6", olive: "#808000", olivedrab: "#6b8e23", orange: "#ffa500",
  orangered: "#ff4500", orchid: "#da70d6", palegoldenrod: "#eee8aa", palegreen: "#98fb98",
  paleturquoise: "#afeeee", palevioletred: "#db7093", papayawhip: "#ffefd5",
  peachpuff: "#ffdab9", peru: "#cd853f", pink: "#ffc0cb", plum: "#dda0dd",
  powderblue: "#b0e0e6", purple: "#800080", rebeccapurple: "#663399", red: "#ff0000",
  rosybrown: "#bc8f8f", royalblue: "#4169e1", saddlebrown: "#8b4513", salmon: "#fa8072",
  sandybrown: "#f4a460", seagreen: "#2e8b57", seashell: "#fff5ee", sienna: "#a0522d",
  silver: "#c0c0c0", skyblue: "#87ceeb", slateblue: "#6a5acd", slategray: "#708090",
  snow: "#fffafa", springgreen: "#00ff7f", steelblue: "#4682b4", tan: "#d2b48c",
  teal: "#008080", thistle: "#d8bfd8", tomato: "#ff6347", turquoise: "#40e0d0",
  violet: "#ee82ee", wheat: "#f5deb3", white: "#ffffff", whitesmoke: "#f5f5f5",
  yellow: "#ffff00", yellowgreen: "#9acd32",
};

/** Title-cased display labels ("darkslateblue" → "Dark Slate Blue"). */
const DISPLAY_WORDS = [
  "aliceblue", "antique", "white", "aqua", "marine", "azure", "beige", "bisque", "black",
  "blanched", "almond", "blue", "violet", "brown", "burly", "wood", "cadet", "chartreuse",
  "chocolate", "coral", "cornflower", "cornsilk", "crimson", "cyan", "dark", "goldenrod",
  "gray", "green", "khaki", "magenta", "olive", "orange", "orchid", "red", "salmon", "sea",
  "slate", "turquoise", "deep", "pink", "sky", "dim", "dodger", "fire", "brick", "floral",
  "forest", "fuchsia", "gainsboro", "ghost", "gold", "yellow", "honeydew", "hot", "indian",
  "indigo", "ivory", "lavender", "blush", "lawn", "lemon", "chiffon", "light", "steel",
  "lime", "linen", "maroon", "medium", "spring", "midnight", "mint", "cream", "misty",
  "rose", "moccasin", "navajo", "navy", "old", "lace", "drab", "pale", "papaya", "whip",
  "peach", "puff", "peru", "plum", "powder", "purple", "rebecca", "rosy", "royal", "saddle",
  "sandy", "shell", "sienna", "silver", "snow", "tan", "teal", "thistle", "tomato", "wheat",
  "smoke",
];

/**
 * Split a CSS colour keyword into words for display. The keywords are all
 * lowercase concatenations, so we greedily match the known vocabulary above
 * (longest word first) rather than shipping 148 hand-written labels.
 */
function titleCase(keyword: string): string {
  const vocab = [...DISPLAY_WORDS].sort((a, b) => b.length - a.length);
  const out: string[] = [];
  let rest = keyword;
  while (rest.length > 0) {
    const word = vocab.find((w) => rest.startsWith(w));
    if (!word) {
      // Unknown remainder — emit it whole rather than dropping characters.
      out.push(rest);
      break;
    }
    out.push(word);
    rest = rest.slice(word.length);
  }
  return out.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

interface NamedEntry {
  keyword: string;
  label: string;
  hex: string;
  lab: LAB;
}

/**
 * The lookup table, built once. `aqua`/`cyan` and `fuchsia`/`magenta` are exact
 * duplicates; the first spelling wins so a match is stable.
 */
const TABLE: NamedEntry[] = (() => {
  const seen = new Set<string>();
  const rows: NamedEntry[] = [];
  for (const [keyword, hex] of Object.entries(CSS_COLORS)) {
    if (seen.has(hex)) continue;
    seen.add(hex);
    rows.push({ keyword, label: titleCase(keyword), hex, lab: rgbToLab(hexToRgb(hex)) });
  }
  return rows;
})();

/** CIE76 colour difference — Euclidean distance in L*a*b*. */
function deltaE(a: LAB, b: LAB): number {
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

/** The named CSS colour closest to `rgb`, with how far off it is. */
export function nearestName(rgb: RGB): ColorName {
  const lab = rgbToLab(rgb);
  let best = TABLE[0];
  let bestDelta = Infinity;
  for (const entry of TABLE) {
    const d = deltaE(lab, entry.lab);
    if (d < bestDelta) {
      bestDelta = d;
      best = entry;
    }
  }
  return {
    name: best.label,
    hex: best.hex,
    // ΔE < 1 is below the threshold most people can see at all.
    exact: bestDelta < 1,
    delta: Math.round(bestDelta * 10) / 10,
  };
}
