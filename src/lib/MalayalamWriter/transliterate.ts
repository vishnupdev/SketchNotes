/**
 * Offline Manglish → Malayalam transliterator (a Mozhi-style phonetic scheme).
 * Fully client-side — no network, no dictionary — so it works offline and keeps
 * every keystroke in the browser. It is phonetic, not a spell-checker: it maps
 * the sounds you type to the closest Malayalam letters and handles the script's
 * structural rules (inherent-vowel consonants, dependent vowel signs/matras,
 * consonant clusters via chandrakkala, word-final chillus and anusvara).
 *
 * Conventions worth knowing while typing:
 *  - Long vowels: aa/ii(=ee)/uu(=oo), or capitals A/I/U/E/O.
 *  - Retroflex/hard letters use capitals: T D N S L R (ട ഡ ണ ഷ ള റ).
 *  - Doubled consonants geminate: "amma" → അമ്മ.
 *  - Word-final n/N/r/l/L become chillus (ൻ ൺ ർ ൽ ൾ); final m → anusvara ം.
 *  - Capital M forces an anusvara (ം) mid-word; "_" forces a bare consonant (്).
 */

/** Independent vowels — used at a word start or after another vowel. */
const VOWEL_INDEP: Record<string, string> = {
  a: "അ", aa: "ആ", A: "ആ",
  i: "ഇ", ii: "ഈ", I: "ഈ", ee: "ഈ",
  u: "ഉ", uu: "ഊ", U: "ഊ", oo: "ഊ",
  "R^i": "ഋ",
  e: "എ", E: "ഏ", ai: "ഐ",
  o: "ഒ", O: "ഓ", au: "ഔ", ou: "ഔ",
};

/** Dependent vowel signs (matras) — used after a consonant. "a" is inherent. */
const VOWEL_SIGN: Record<string, string> = {
  a: "", aa: "ാ", A: "ാ",
  i: "ി", ii: "ീ", I: "ീ", ee: "ീ",
  u: "ു", uu: "ൂ", U: "ൂ", oo: "ൂ",
  "R^i": "ൃ",
  e: "െ", E: "േ", ai: "ൈ",
  o: "ൊ", O: "ോ", au: "ൌ", ou: "ൌ",
};

/** Consonants (base letter, carrying an inherent "a" until resolved). */
const CONSONANT: Record<string, string> = {
  k: "ക", kh: "ഖ", g: "ഗ", gh: "ഘ", ng: "ങ",
  ch: "ച", Ch: "ഛ", chh: "ഛ", j: "ജ", jh: "ഝ", nj: "ഞ",
  T: "ട", Th: "ഠ", D: "ഡ", Dh: "ഢ", N: "ണ",
  t: "ത", th: "ഥ", d: "ദ", dh: "ധ", n: "ന",
  p: "പ", ph: "ഫ", f: "ഫ", b: "ബ", bh: "ഭ", m: "മ",
  y: "യ", r: "ര", l: "ല", v: "വ", w: "വ",
  sh: "ശ", Sh: "ഷ", S: "ഷ", s: "സ", h: "ഹ",
  L: "ള", zh: "ഴ", R: "റ",
  ksh: "ക്ഷ", jn: "ജ്ഞ", gy: "ജ്ഞ",
};

/** Standalone marks addressable directly. */
const MARK: Record<string, string> = {
  M: "ം", // anusvara
  H: "ഃ", // visarga
  _: "്", // explicit chandrakkala / virama
};

const VIRAMA = "്";

/** Word-final resolution of a bare consonant into its chillu / anusvara form. */
const FINAL_FORM: Record<string, string> = {
  n: "ൻ", N: "ൺ", r: "ർ", R: "ർ", l: "ൽ", L: "ൾ", m: "ം",
};

/** All romanization keys, longest first, so greedy matching prefers "kh" over "k". */
const KEYS = Array.from(
  new Set([
    ...Object.keys(CONSONANT),
    ...Object.keys(VOWEL_INDEP),
    ...Object.keys(VOWEL_SIGN),
    ...Object.keys(MARK),
  ]),
).sort((a, b) => b.length - a.length);

const isLetter = (c: string) => /[A-Za-z^]/.test(c);

/** Match the longest romanization key present at position `i` in `s`. */
function matchKey(s: string, i: number): string | null {
  for (const key of KEYS) {
    if (s.startsWith(key, i)) return key;
  }
  return null;
}

/**
 * Transliterate a run of romanized letters (no spaces/punctuation inside).
 * `pending` tracks a consonant awaiting resolution: another consonant turns it
 * into a cluster (insert virama), a vowel attaches a matra, and the word end
 * turns it into a chillu/anusvara or leaves the inherent "a".
 */
function transliterateWord(s: string): string {
  let out = "";
  let i = 0;
  // The latin key of the consonant currently pending, and its index in `out`.
  let pendingLatin: string | null = null;
  let pendingAt = -1;

  const resolveFinal = () => {
    if (pendingLatin && FINAL_FORM[pendingLatin]) {
      // Replace the trailing base consonant with its chillu/anusvara form.
      out = out.slice(0, pendingAt) + FINAL_FORM[pendingLatin];
    }
    pendingLatin = null;
    pendingAt = -1;
  };

  while (i < s.length) {
    const key = matchKey(s, i);

    if (key && key in CONSONANT) {
      if (pendingLatin !== null) out += VIRAMA; // cluster: close the previous one
      pendingAt = out.length;
      out += CONSONANT[key];
      pendingLatin = key;
      i += key.length;
      continue;
    }

    if (key && key in MARK) {
      pendingLatin = null;
      out += MARK[key];
      i += key.length;
      continue;
    }

    if (key && pendingLatin !== null && key in VOWEL_SIGN) {
      out += VOWEL_SIGN[key];
      pendingLatin = null;
      i += key.length;
      continue;
    }

    if (key && pendingLatin === null && key in VOWEL_INDEP) {
      out += VOWEL_INDEP[key];
      i += key.length;
      continue;
    }

    // Unmatched (or an uppercase variant we don't key): a pending consonant
    // keeps its inherent "a"; emit the raw character and move on.
    pendingLatin = null;
    pendingAt = -1;
    out += s[i];
    i += 1;
  }

  resolveFinal();
  return out;
}

/**
 * Transliterate arbitrary text: letter-runs are converted phonetically while
 * spaces, digits and punctuation pass through unchanged.
 */
export function transliterate(input: string): string {
  let out = "";
  let run = "";
  for (const ch of input) {
    if (isLetter(ch)) {
      run += ch;
    } else {
      if (run) {
        out += transliterateWord(run);
        run = "";
      }
      out += ch;
    }
  }
  if (run) out += transliterateWord(run);
  return out;
}
