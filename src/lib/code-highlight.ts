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

const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c);
const isIdent = (c: string) => /[A-Za-z0-9_$]/.test(c);
const isDigit = (c: string) => /[0-9]/.test(c);

/**
 * Tokenise `code` for `languageId`.
 *
 * A single left-to-right scan with no backtracking: at each position, whichever
 * construct starts here consumes as much as it owns. Order matters — comments are
 * tested before strings, because `// "not a string"` is a comment, and strings
 * before punctuation, because `"{"` is not a brace.
 *
 * Adjacent plain characters are merged into one token at the end, so a 200-line
 * snippet renders as a few hundred spans rather than a few thousand.
 */
export function tokenize(code: string, languageId: string): Token[] {
  const lang = LANGUAGE_BY_ID[languageId];
  if (!lang || lang.id === "plain" || lang.id === "markdown") return [{ text: code, kind: "plain" }];

  const out: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };

  const keywords = new Set(lang.keywords);
  const quotes = lang.quotes ?? [];
  let i = 0;

  while (i < code.length) {
    const rest = code.slice(i);

    // Block comment.
    if (lang.block && rest.startsWith(lang.block[0])) {
      const close = code.indexOf(lang.block[1], i + lang.block[0].length);
      const end = close === -1 ? code.length : close + lang.block[1].length;
      push(code.slice(i, end), "comment");
      i = end;
      continue;
    }

    // Line comment.
    const marker = lang.lineComment.find((m) => rest.startsWith(m));
    if (marker) {
      const nl = code.indexOf("\n", i);
      const end = nl === -1 ? code.length : nl;
      push(code.slice(i, end), "comment");
      i = end;
      continue;
    }

    // String. Escapes are honoured so "a\"b" does not end early.
    const quote = quotes.find((q) => rest.startsWith(q));
    if (quote) {
      let j = i + quote.length;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code.startsWith(quote, j)) {
          j += quote.length;
          break;
        }
        // An unterminated single-quoted string stops at the line end rather than
        // swallowing the rest of the file — which is what an apostrophe in a
        // comment-free line of prose would otherwise do.
        if (code[j] === "\n" && quote !== "`") break;
        j++;
      }
      push(code.slice(i, j), "string");
      i = j;
      continue;
    }

    const ch = code[i];

    // Number, including hex and decimals.
    if (isDigit(ch)) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxXoObB._]/.test(code[j])) j++;
      push(code.slice(i, j), "number");
      i = j;
      continue;
    }

    // Word: keyword or plain identifier.
    if (isIdentStart(ch)) {
      let j = i;
      while (j < code.length && isIdent(code[j])) j++;
      const word = code.slice(i, j);
      push(word, keywords.has(word) || keywords.has(word.toLowerCase()) ? "keyword" : "plain");
      i = j;
      continue;
    }

    if (C_FAMILY_PUNCT.includes(ch)) {
      push(ch, "punctuation");
      i++;
      continue;
    }

    push(ch, "plain");
    i++;
  }

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
