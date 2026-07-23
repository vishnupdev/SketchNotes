/**
 * Static layout for the on-screen Malayalam keyboard. Each key inserts its
 * literal character at the caret, so the data is just grouped glyph strings —
 * no logic. Grouped for a tidy, scannable grid on mobile and desktop alike.
 */

export interface KeyGroup {
  /** Section label shown above the row (also its accessible group name). */
  label: string;
  /** Characters to render as keys, in reading order. */
  keys: string[];
}

export const KEY_GROUPS: KeyGroup[] = [
  {
    label: "Vowels",
    keys: ["അ", "ആ", "ഇ", "ഈ", "ഉ", "ഊ", "ഋ", "എ", "ഏ", "ഐ", "ഒ", "ഓ", "ഔ"],
  },
  {
    label: "Vowel signs",
    keys: ["ാ", "ി", "ീ", "ു", "ൂ", "ൃ", "െ", "േ", "ൈ", "ൊ", "ോ", "ൌ", "ം", "ഃ", "്"],
  },
  {
    label: "Consonants",
    keys: [
      "ക", "ഖ", "ഗ", "ഘ", "ങ",
      "ച", "ഛ", "ജ", "ഝ", "ഞ",
      "ട", "ഠ", "ഡ", "ഢ", "ണ",
      "ത", "ഥ", "ദ", "ധ", "ന",
      "പ", "ഫ", "ബ", "ഭ", "മ",
      "യ", "ര", "ല", "വ", "ശ",
      "ഷ", "സ", "ഹ", "ള", "ഴ", "റ",
    ],
  },
  {
    label: "Chillus & numerals",
    keys: ["ൻ", "ൺ", "ർ", "ൽ", "ൾ", "ൿ", "൦", "൧", "൨", "൩", "൪", "൫", "൬", "൭", "൮", "൯"],
  },
];

/** Spoken names for marks that are otherwise silent to screen readers. */
export const KEY_ARIA: Record<string, string> = {
  "ം": "anusvaram",
  "ഃ": "visargam",
  "്": "chandrakkala",
};
