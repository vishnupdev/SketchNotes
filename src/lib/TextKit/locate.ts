/**
 * Finding *where* a JSON document goes wrong.
 *
 * `JSON.parse` tells you that it failed, and where it failed only if the engine
 * feels like it: V8 used to append "at position 428", newer versions quote a
 * fragment instead, and Safari and Firefox each word it differently again.
 * Parsing those messages is a losing game — and on a 400-line document the
 * position is the only part that matters.
 *
 * So this is a small validator that walks the text itself and reports the exact
 * index it gave up at, along with what it was expecting. It runs only when
 * `JSON.parse` has already failed, so the happy path stays the engine's fast
 * native parse; this is purely for the error message.
 */

export interface JsonFault {
  /** Character offset the document stops making sense at. */
  index: number;
  /** What was wrong, in the terms someone fixing it would use. */
  message: string;
}

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

/**
 * Walk `text` as JSON and return the first fault, or null if it is valid.
 *
 * Recursive descent, one pass, no allocation of the parsed value — the point is
 * the position, not the data.
 */
export function findJsonFault(text: string): JsonFault | null {
  let i = 0;

  const fault = (message: string): JsonFault => ({ index: i, message });
  const skipSpace = () => {
    while (i < text.length && WHITESPACE.has(text[i])) i++;
  };
  const expect = (ch: string): JsonFault | null => {
    skipSpace();
    if (text[i] !== ch) return fault(`expected ${ch === "," ? "a comma" : `“${ch}”`}`);
    i++;
    return null;
  };

  const parseString = (): JsonFault | null => {
    // Called with text[i] === '"'
    i++;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '"') {
        i++;
        return null;
      }
      if (ch === "\\") {
        const next = text[i + 1];
        if (next === undefined) return fault("the string ends in a backslash");
        if (next === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
            return fault("a \\u escape needs four hex digits");
          }
          i += 6;
          continue;
        }
        if (!'"\\/bfnrt'.includes(next)) return fault(`“\\${next}” isn't a valid escape`);
        i += 2;
        continue;
      }
      // Raw control characters are not allowed inside a JSON string, and an
      // unclosed quote usually shows up as exactly this.
      if (ch < " ") return fault("a line break inside a string — escape it as \\n");
      i++;
    }
    return fault("the string is never closed");
  };

  const parseNumber = (): JsonFault | null => {
    const start = i;
    if (text[i] === "-") i++;
    if (text[i] === "0") i++;
    else if (/[1-9]/.test(text[i] ?? "")) while (/\d/.test(text[i] ?? "")) i++;
    else return fault("expected a digit");
    if (text[i] === ".") {
      i++;
      if (!/\d/.test(text[i] ?? "")) return fault("expected a digit after the decimal point");
      while (/\d/.test(text[i] ?? "")) i++;
    }
    if (text[i] === "e" || text[i] === "E") {
      i++;
      if (text[i] === "+" || text[i] === "-") i++;
      if (!/\d/.test(text[i] ?? "")) return fault("expected a digit in the exponent");
      while (/\d/.test(text[i] ?? "")) i++;
    }
    // A leading zero followed by digits ("01") is invalid JSON, however normal
    // it looks.
    if (text[start] === "0" && /\d/.test(text[start + 1] ?? "")) {
      i = start;
      return fault("a number can't start with a leading zero");
    }
    return null;
  };

  const parseValue = (depth: number): JsonFault | null => {
    if (depth > 200) return fault("nested too deeply");
    skipSpace();
    if (i >= text.length) return fault("the document ends here, expecting a value");
    const ch = text[i];

    if (ch === '"') return parseString();
    if (ch === "{") {
      i++;
      skipSpace();
      if (text[i] === "}") {
        i++;
        return null;
      }
      for (;;) {
        skipSpace();
        if (text[i] !== '"') return fault("expected a quoted key");
        const keyFault = parseString();
        if (keyFault) return keyFault;
        const colon = expect(":");
        if (colon) return colon;
        const value = parseValue(depth + 1);
        if (value) return value;
        skipSpace();
        if (text[i] === ",") {
          i++;
          skipSpace();
          // A comma before the closing brace is the most common JSON mistake
          // there is, so it gets its own words.
          if (text[i] === "}") return fault("a trailing comma before “}”");
          continue;
        }
        if (text[i] === "}") {
          i++;
          return null;
        }
        return fault("expected a comma or “}”");
      }
    }
    if (ch === "[") {
      i++;
      skipSpace();
      if (text[i] === "]") {
        i++;
        return null;
      }
      for (;;) {
        const value = parseValue(depth + 1);
        if (value) return value;
        skipSpace();
        if (text[i] === ",") {
          i++;
          skipSpace();
          if (text[i] === "]") return fault("a trailing comma before “]”");
          continue;
        }
        if (text[i] === "]") {
          i++;
          return null;
        }
        return fault("expected a comma or “]”");
      }
    }
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, i)) {
        i += literal.length;
        return null;
      }
    }
    if (ch === "-" || /\d/.test(ch)) return parseNumber();

    // Anything else: name what was found, since a bare word is usually a missing
    // pair of quotes.
    const word = /^[\w.+-]+/.exec(text.slice(i))?.[0];
    return fault(
      word
        ? `“${word}” isn't valid here — strings need quotes`
        : `unexpected “${ch}”`,
    );
  };

  const top = parseValue(0);
  if (top) return top;
  skipSpace();
  if (i < text.length) return fault("unexpected extra content after the value");
  return null;
}
