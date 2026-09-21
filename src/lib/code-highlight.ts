/**
 * A small, dependency-free syntax highlighter.
 *
 * Two decisions worth defending:
 *
 *  - **No highlighting library.** Shiki and Prism are excellent and both cost
 *    more than this whole app in bundle weight (rule #7 — and rule #1 does not
 *    ask for a dependency the project does not need). A snippet manager needs
 *    code to be *scannable*, not to be a compiler front end, and the five token
 *    classes below deliver that for every C-family language at once.
 *  - **Tokens out, not HTML.** The function returns an array of `{ text, kind }`
 *    and the component renders each as a `<span>`. Returning a marked-up string
 *    would mean `dangerouslySetInnerHTML` over text the user pasted — the exact
 *    shape of an injection bug, in an app whose entire purpose is storing text
 *    from elsewhere.
 *
 * Deliberately approximate. It will mis-colour a regex literal containing a
 * quote, and it does not know types from identifiers. Both are acceptable when
 * the alternative is a real parser per language.
 */

export type TokenKind = "plain" | "comment" | "string" | "number" | "keyword" | "punctuation";

export interface Token {
  text: string;
  kind: TokenKind;
}

export interface LanguageDef {
  id: string;
  label: string;
  /** File extension used when a snippet is saved. */
  ext: string;
  keywords: string[];
  /** Line-comment markers, longest first. */
  lineComment: string[];
  /** Block comment open/close, if the language has them. */
  block?: [string, string];
  /** Quote characters that open a string. */
  quotes?: string[];
}

const C_FAMILY_PUNCT = "{}[]()<>;,.:?=+-*/%!&|^~";

const JS_KEYWORDS = [
  "abstract", "as", "async", "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "declare", "default", "delete", "do", "else", "enum", "export", "extends", "false",
  "finally", "for", "from", "function", "get", "if", "implements", "import", "in", "instanceof",
  "interface", "is", "keyof", "let", "namespace", "new", "null", "of", "private", "protected",
  "public", "readonly", "return", "satisfies", "set", "static", "super", "switch", "this", "throw",
  "true", "try", "type", "typeof", "undefined", "var", "void", "while", "yield",
];

const PY_KEYWORDS = [
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif",
  "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is",
  "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while",
  "with", "yield",
];

const SQL_KEYWORDS = [
  "alter", "and", "as", "asc", "between", "by", "case", "create", "delete", "desc", "distinct",
  "drop", "else", "end", "exists", "from", "group", "having", "in", "index", "inner", "insert",
  "into", "join", "left", "like", "limit", "not", "null", "offset", "on", "or", "order", "outer",
  "primary", "select", "set", "table", "then", "union", "update", "values", "when", "where", "with",
];

const SHELL_KEYWORDS = [
  "case", "do", "done", "echo", "elif", "else", "esac", "exit", "export", "fi", "for", "function",
  "if", "in", "local", "return", "set", "then", "unset", "until", "while",
];

const GO_KEYWORDS = [
  "break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for",
  "func", "go", "goto", "if", "import", "interface", "map", "nil", "package", "range", "return",
  "select", "struct", "switch", "type", "var",
];

const RUST_KEYWORDS = [
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern",
  "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub",
  "ref", "return", "self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use",
  "where", "while",
];

/** The languages offered. Ordered by how often code gets saved in them. */
export const LANGUAGES: LanguageDef[] = [
  { id: "typescript", label: "TypeScript", ext: "ts", keywords: JS_KEYWORDS, lineComment: ["//"], block: ["/*", "*/"], quotes: ['"', "'", "`"] },
  { id: "javascript", label: "JavaScript", ext: "js", keywords: JS_KEYWORDS, lineComment: ["//"], block: ["/*", "*/"], quotes: ['"', "'", "`"] },
  { id: "tsx", label: "TSX / JSX", ext: "tsx", keywords: JS_KEYWORDS, lineComment: ["//"], block: ["/*", "*/"], quotes: ['"', "'", "`"] },
  { id: "python", label: "Python", ext: "py", keywords: PY_KEYWORDS, lineComment: ["#"], quotes: ['"', "'"] },
  { id: "shell", label: "Shell", ext: "sh", keywords: SHELL_KEYWORDS, lineComment: ["#"], quotes: ['"', "'"] },
  { id: "sql", label: "SQL", ext: "sql", keywords: SQL_KEYWORDS, lineComment: ["--"], block: ["/*", "*/"], quotes: ["'", '"'] },
  { id: "json", label: "JSON", ext: "json", keywords: ["true", "false", "null"], lineComment: [], quotes: ['"'] },
  { id: "css", label: "CSS", ext: "css", keywords: ["important", "media", "supports", "theme", "layer", "import"], lineComment: [], block: ["/*", "*/"], quotes: ['"', "'"] },
  { id: "html", label: "HTML", ext: "html", keywords: [], lineComment: [], block: ["<!--", "-->"], quotes: ['"', "'"] },
  { id: "yaml", label: "YAML", ext: "yml", keywords: ["true", "false", "null"], lineComment: ["#"], quotes: ['"', "'"] },
  { id: "go", label: "Go", ext: "go", keywords: GO_KEYWORDS, lineComment: ["//"], block: ["/*", "*/"], quotes: ['"', "`"] },
  { id: "rust", label: "Rust", ext: "rs", keywords: RUST_KEYWORDS, lineComment: ["//"], block: ["/*", "*/"], quotes: ['"'] },
  { id: "java", label: "Java / C-like", ext: "java", keywords: [...JS_KEYWORDS, "final", "int", "long", "float", "double", "boolean", "char", "package"], lineComment: ["//"], block: ["/*", "*/"], quotes: ['"', "'"] },
  { id: "markdown", label: "Markdown", ext: "md", keywords: [], lineComment: [], quotes: [] },
  { id: "plain", label: "Plain text", ext: "txt", keywords: [], lineComment: [], quotes: [] },
];

export const LANGUAGE_BY_ID: Record<string, LanguageDef> = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l]),
);

/*
 * Character classes as code-point ranges rather than regexes.
 *
 * Every one of these is asked about every character of every code block on
 * screen, and `/[0-9]/.test(code[j])` allocates a one-character string before it
 * can answer. The codes: `0`-`9` is 48-57, `A`-`Z` 65-90, `a`-`z` 97-122,
 * `.` 46, `_` 95, `$` 36, `\` 92, newline 10.
 */
const isDigitCode = (c: number) => c >= 48 && c <= 57;
const isIdentStartCode = (c: number) =>
  (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 36;
const isIdentCode = (c: number) => isIdentStartCode(c) || isDigitCode(c);
/** Continues a numeric literal: digits, hex letters, the `0x`/`0o`/`0b` marks, `.` and `_`. */
const isNumberCode = (c: number) =>
  isDigitCode(c) ||
  (c >= 97 && c <= 102) || // a-f
  (c >= 65 && c <= 70) || // A-F
  c === 120 || // x
  c === 88 || // X
  c === 111 || // o
  c === 79 || // O
  c === 46 || // .
  c === 95; // _

/** ASCII lookup for `C_FAMILY_PUNCT`; a table read beats a scan of the string. */
const IS_PUNCT = (() => {
  const table = new Uint8Array(128);
  for (const ch of C_FAMILY_PUNCT) table[ch.charCodeAt(0)] = 1;
  return table;
})();

/**
 * What can begin at a given character, as a bit set indexed by char code.
 *
 * Without this, every position in the file tests every comment marker and every
 * quote — six `startsWith` calls per character for TypeScript, all but a handful
 * of them doomed. One table read says "nothing starts here" for letters, digits
 * and whitespace, which is almost the whole file.
 *
 * Index 128 is a catch-all bucket for anything above ASCII, so a language whose
 * markers are not ASCII still scans correctly rather than silently losing them.
 */
const TRIG_BLOCK = 1;
const TRIG_LINE = 2;
const TRIG_QUOTE = 4;

interface Scan {
  keywords: Set<string>;
  hasKeywords: boolean;
  trigger: Uint8Array;
  quotes: string[];
  blockOpen: string;
  blockClose: string;
}

/**
 * The scan tables for a language, built once and kept.
 *
 * `tokenize` runs once per code block rendered — a Snippets list is a dozen of
 * them, and Markdown Studio re-renders on every keystroke — so rebuilding a
 * keyword Set of fifty strings each time is work that never changes.
 */
const SCANS = new Map<string, Scan>();

function scanFor(lang: LanguageDef): Scan {
  const cached = SCANS.get(lang.id);
  if (cached) return cached;

  const trigger = new Uint8Array(129);
  const mark = (marker: string, bit: number) => {
    if (!marker) return;
    const code = marker.charCodeAt(0);
    trigger[code < 128 ? code : 128] |= bit;
  };
  const quotes = lang.quotes ?? [];
  mark(lang.block?.[0] ?? "", TRIG_BLOCK);
  for (const marker of lang.lineComment) mark(marker, TRIG_LINE);
  for (const quote of quotes) mark(quote, TRIG_QUOTE);

  const scan: Scan = {
    keywords: new Set(lang.keywords),
    hasKeywords: lang.keywords.length > 0,
    trigger,
    quotes,
    blockOpen: lang.block?.[0] ?? "",
    blockClose: lang.block?.[1] ?? "",
  };
  SCANS.set(lang.id, scan);
  return scan;
}

/** The first of `markers` that sits at `at`, or `""`. Callers order them longest first. */
function markerAt(code: string, at: number, markers: string[]): string {
  for (let m = 0; m < markers.length; m++) {
    if (code.startsWith(markers[m], at)) return markers[m];
  }
  return "";
}

/**
 * Where the string opened by `quote` at `at` ends, exclusive.
 *
 * Escapes are honoured so `"a\"b"` does not end early. An unterminated
 * single-quoted string stops at the line end rather than swallowing the rest of
 * the file — which is what an apostrophe in a comment-free line of prose would
 * otherwise do. A backtick may legitimately span lines, so it is exempt.
 */
function stringEnd(code: string, at: number, quote: string): number {
  const len = code.length;
  const quoteHead = quote.charCodeAt(0);
  const multiline = quote === "`";
  let j = at + quote.length;

  while (j < len) {
    const c = code.charCodeAt(j);
    if (c === 92) {
      j += 2; // An escape takes the next character with it, whatever it is.
      continue;
    }
    if (c === quoteHead && code.startsWith(quote, j)) return j + quote.length;
    if (c === 10 && !multiline) return j;
    j++;
  }
  return j;
}

/**
 * Tokenise `code` for `languageId`.
 *
 * A single left-to-right scan with no backtracking: at each position, whichever
 * construct starts here consumes as much as it owns. Order matters — comments are
 * tested before strings, because `// "not a string"` is a comment, and strings
 * before punctuation, because `"{"` is not a brace.
 *
 * Adjacent characters of the same kind come out as one token, so a 200-line
 * snippet renders as a few hundred spans rather than a few thousand.
 *
 * The scan is index-based throughout: no `slice` of the remainder per character,
 * no regex per character, and no per-call rebuild of the language's tables. What
 * it costs is one slice per token emitted, which is the output itself.
 */
export function tokenize(code: string, languageId: string): Token[] {
  const lang = LANGUAGE_BY_ID[languageId];
  if (!lang || lang.id === "plain" || lang.id === "markdown") return [{ text: code, kind: "plain" }];

  const { keywords, hasKeywords, trigger, quotes, blockOpen, blockClose } = scanFor(lang);
  const len = code.length;
  const out: Token[] = [];

  /*
   * The open run, as two indices and a kind.
   *
   * Every token is a contiguous slice of `code` and the scan never goes back, so
   * a run of one kind is fully described by where it started — which means the
   * merge costs one `slice` per token emitted instead of a `slice` per construct
   * plus a string concatenation per merge.
   */
  let runStart = 0;
  let runKind: TokenKind | null = null;
  let i = 0;

  while (i < len) {
    const c = code.charCodeAt(i);
    let end = -1;
    let kind: TokenKind = "plain";

    // Constructs that announce themselves with a known first character. Order
    // matters — comments before strings, because `// "not a string"` is a comment.
    const trig = trigger[c < 128 ? c : 128];
    if (trig !== 0) {
      if ((trig & TRIG_BLOCK) !== 0 && code.startsWith(blockOpen, i)) {
        const close = code.indexOf(blockClose, i + blockOpen.length);
        end = close === -1 ? len : close + blockClose.length;
        kind = "comment";
      } else if ((trig & TRIG_LINE) !== 0 && markerAt(code, i, lang.lineComment) !== "") {
        const nl = code.indexOf("\n", i);
        end = nl === -1 ? len : nl;
        kind = "comment";
      } else if ((trig & TRIG_QUOTE) !== 0) {
        const quote = markerAt(code, i, quotes);
        if (quote !== "") {
          end = stringEnd(code, i, quote);
          kind = "string";
        }
      }
    }

    if (end === -1) {
      if (isDigitCode(c)) {
        // Number, including hex and decimals.
        let j = i + 1;
        while (j < len && isNumberCode(code.charCodeAt(j))) j++;
        end = j;
        kind = "number";
      } else if (isIdentStartCode(c)) {
        // Word: keyword or plain identifier.
        let j = i + 1;
        let upper = c >= 65 && c <= 90;
        while (j < len) {
          const cc = code.charCodeAt(j);
          if (!isIdentCode(cc)) break;
          if (cc >= 65 && cc <= 90) upper = true;
          j++;
        }
        end = j;
        /*
         * The lowercased lookup is what makes SQL's `SELECT` a keyword. It can
         * only ever match when there is an uppercase letter to lower, and the
         * scan above already knows whether there was one — so the common case,
         * an all-lowercase identifier, skips both the copy and the second probe.
         */
        if (hasKeywords) {
          const word = code.slice(i, j);
          if (keywords.has(word) || (upper && keywords.has(word.toLowerCase()))) kind = "keyword";
        }
      } else {
        end = i + 1;
        if (c < 128 && IS_PUNCT[c] === 1) kind = "punctuation";
      }
    }

    if (kind !== runKind) {
      if (runKind !== null) out.push({ text: code.slice(runStart, i), kind: runKind });
      runStart = i;
      runKind = kind;
    }
    i = end;
  }

  // `end` can overshoot on a trailing escape (`"a\`), which `slice` clamps.
  if (runKind !== null) out.push({ text: code.slice(runStart, len), kind: runKind });
  return out;
}

/** Guess a language from a snippet's text — used when pasting into a new snippet. */
export function guessLanguage(code: string): string {
  const head = code.slice(0, 2000);
  if (/^\s*[{[]/.test(head) && /"\s*:/.test(head)) return "json";
  if (/^\s*#!\s*\/.*\b(bash|sh|zsh)\b/.test(head)) return "shell";
  if (/\b(def|elif)\b|^\s*from\s+\w+\s+import\b/m.test(head)) return "python";
  if (/\bfunc\s+\w+\s*\(|^package\s+\w+/m.test(head)) return "go";
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b/.test(head)) return "rust";
  if (/^\s*(SELECT|INSERT|UPDATE|CREATE|ALTER)\b/im.test(head)) return "sql";
  if (/^\s*</.test(head) && /<\/[a-z]/i.test(head)) return "html";
  if (/^\s*[\w-]+\s*:\s*[^:\n]+$/m.test(head) && !/[;{]/.test(head)) return "yaml";
  if (/[.#][\w-]+\s*\{[^}]*:/.test(head)) return "css";
  if (/<[A-Z]\w*[\s/>]/.test(head)) return "tsx";
  if (/\b(interface|type)\s+\w+\s*[={]|:\s*(string|number|boolean)\b/.test(head)) return "typescript";
  if (/\b(const|let|function|=>)\b/.test(head)) return "javascript";
  return "plain";
}
