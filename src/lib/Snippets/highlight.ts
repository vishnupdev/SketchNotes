/*
 * The highlighter used to live here. It now lives in `lib/code-highlight.ts`,
 * shared, because Markdown Studio renders fenced code blocks with the same
 * tokeniser and rule #5 forbids it reaching into this app for it.
 *
 * Re-exported rather than moved outright, so every existing Snippets import is
 * unchanged.
 */
export {
  LANGUAGES,
  LANGUAGE_BY_ID,
  guessLanguage,
  tokenize,
  type LanguageDef,
  type Token,
  type TokenKind,
} from "@/lib/code-highlight";
