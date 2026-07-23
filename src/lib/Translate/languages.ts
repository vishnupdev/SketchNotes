/**
 * Translate app catalog — the single source of truth for the languages offered
 * in the translator. Imported by the client (dropdowns, labels) and the server
 * route (`/api/translate`) that validates the requested pair, so codes never
 * drift between the two.
 *
 * `code` is a BCP-47 language tag understood by both the on-device Chrome
 * Translator API (offline) and the network provider (online), so a single
 * catalog drives both engines. `AUTO` is a source-only sentinel meaning
 * "detect the language for me".
 */

export interface Language {
  /** BCP-47 code, e.g. "en", "es", "zh". */
  code: string;
  /** English display name. */
  name: string;
  /** Endonym (native name) shown as a subtle secondary label. */
  native: string;
}

/** Source-only "detect the language" sentinel. Never a valid target. */
export const AUTO = "auto";

/**
 * Supported languages. Kept to widely-used tongues that the network provider
 * covers; the on-device engine supports a subset, and the UI falls back to
 * online automatically when a pair can't run offline.
 */
export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-Hant", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** Look up a language by code (case-sensitive BCP-47). */
export function languageByCode(code: string): Language | undefined {
  return BY_CODE.get(code);
}

/** Human label for a code, tolerating the AUTO sentinel and unknown codes. */
export function languageLabel(code: string): string {
  if (code === AUTO) return "Detect language";
  return BY_CODE.get(code)?.name ?? code;
}

/** True when `code` is a real language (not AUTO) that we offer. */
export function isKnownLanguage(code: string): boolean {
  return BY_CODE.has(code);
}

/** Sensible starting pair. */
export const DEFAULT_SOURCE = AUTO;
export const DEFAULT_TARGET = "en";
