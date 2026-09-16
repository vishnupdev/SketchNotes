/**
 * Reading a spec table out of encyclopedia wikitext.
 *
 * The specifications this app exists to show live in an article's *infobox* — a
 * template invocation at the top of the source, `{{Infobox mobile phone | soc =
 * … | battery = … }}`. The rendered HTML of that box is a table built by dozens
 * of nested templates and would have to be scraped; the wikitext is the same
 * data before any of that happened, which is why this module reads the source
 * rather than the page.
 *
 * What makes it non-trivial is that the *values* are themselves wikitext:
 * templates inside templates ({@link resolveTemplate}), links with display text,
 * reference tags, HTML line breaks and bullet lists. All of it has to come out
 * as one readable line without swallowing the content — and a value is often a
 * *list* ("S24: 4000 mAh; S24+: 4900 mAh"), which must survive intact, because
 * keeping only the first variant is how a comparison quietly becomes wrong.
 *
 * Everything here is pure text in, plain data out, and is covered by
 * `specs.test.ts` against fixtures taken from real articles.
 */

/**
 * Separator for the parts of a multi-valued spec. A middle dot rather than a
 * comma or a semicolon: both of those occur *inside* values ("1/1.56\", 1.0µm")
 * and a reader could not tell the app's separator from the source's own.
 */
export const PART_SEP = " · ";

/** Marks a line break while templates and links are still being resolved. */
const BREAK = "\u0001";

/**
 * Words a `{{convert}}` uses between two numbers to mean "a range", as opposed
 * to a unit. `{{convert|3552|-|4048|lb|kg}}` is one weight range; without this
 * set it reads as the number 3552 in units of "-".
 */
const RANGE_WORDS = new Set(["-", "–", "—", "to", "and", "or", "+/-", "±"]);

/** Separators a `{{convert}}` uses to mean "these are dimensions". */
const DIMENSION_WORDS = new Set(["x", "xx", "by", "×"]);

/**
 * Split on `|`, but only where it separates arguments — not where it sits
 * inside a nested template, a wikilink, or a table. Every pipe-separated
 * structure in wikitext needs this; doing it with `String.split("|")` is the
 * single most common way a wikitext parser mangles `[[Page name|display text]]`
 * into two arguments.
 */
function splitPipes(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";

  for (let i = 0; i < source.length; i += 1) {
    const pair = source.slice(i, i + 2);
    if (pair === "{{" || pair === "[[" || pair === "{|") {
      depth += 1;
      cur += pair;
      i += 1;
      continue;
    }
    if (pair === "}}" || pair === "]]" || pair === "|}") {
      depth -= 1;
      cur += pair;
      i += 1;
      continue;
    }
    if (source[i] === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += source[i];
  }
  parts.push(cur);
  return parts;
}

/**
 * The plain text one template invocation should become.
 *
 * Called on *innermost* invocations only (see {@link resolveTemplates}), so the
 * body handed in never contains another template and can be split directly.
 *
 * The unknown-template case matters more than any of the named ones: articles
 * use hundreds of formatting templates this app will never enumerate. The rule
 * is to keep the first argument when it reads like content and drop the
 * invocation otherwise, which turns `{{small|Wi-Fi 6E}}` into "Wi-Fi 6E" and
 * `{{cite web|url=…|title=…}}` into nothing, without either being listed.
 */
export function resolveTemplate(body: string): string {
  const args = splitPipes(body).map((a) => a.trim());
  const name = (args[0] ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const rest = args.slice(1);
  /** Arguments given by position — `foo=bar` ones are settings, not content. */
  const positional = rest.filter((a) => !/^[\w\s-]+=/.test(a));

  // Unit conversions: "{{convert|146.6|mm|in}}" and its range and dimension
  // forms. Only the source's own figure is kept — the converted one is a second
  // number saying the same thing, and two of them in a spec row reads as two
  // specs.
  if (name === "convert" || name === "cvt") {
    const [first, second, third] = positional;
    if (second && DIMENSION_WORDS.has(second.toLowerCase())) {
      const numbers = positional.filter((a) => /^[\d.,]+$/.test(a));
      const unit = positional.find((a) => /^[a-zA-Z]+$/.test(a) && !DIMENSION_WORDS.has(a.toLowerCase()));
      return `${numbers.join(" × ")}${unit ? ` ${unit}` : ""}`.trim();
    }
    if (second && RANGE_WORDS.has(second.toLowerCase())) {
      return `${first}–${third ?? ""} ${positional[3] ?? ""}`.trim();
    }
    return `${first ?? ""} ${second ?? ""}`.trim();
  }

  // Dates. Every form reduces to the numbers a reader would recognise as one.
  if (/^(start|end)[ _]date/.test(name) || name === "birth date" || name === "dts") {
    return positional.filter((a) => /^\d{1,4}$/.test(a)).slice(0, 3).join("-");
  }

  // Game-console and software release tables: "{{vgrelease|WW|June 5, 2025}}"
  // pairs a region code with a date. The bare code is not a release date, so
  // the codes are dropped and the dates kept — without this, a console's
  // "Released" row reads "WW".
  // Named exactly rather than by prefix: `{{Release date|2023|09|22}}` is a
  // date template, and stripping "region codes" out of it would turn a date
  // into three loose numbers.
  if (["vgrelease", "vgrelease new", "video game release", "vgr"].includes(name)) {
    return positional
      .filter((a) => !/^(?:WW|NA|EU|JP|AU|UK|PAL|INT|WW\b.*)$/i.test(a.trim()))
      .filter(Boolean)
      .join(PART_SEP);
  }

  // List templates — the reason a value can hold several variants at all.
  if (
    [
      "ubl",
      "unbulleted list",
      "plainlist",
      "plain list",
      "hlist",
      "flatlist",
      "collapsible list",
      "cslist",
      "comma separated entries",
    ].includes(name)
  ) {
    return positional.filter(Boolean).join(PART_SEP);
  }

  // Pure formatting wrappers: keep the content, drop the wrapper.
  if (["nowrap", "nobold", "nobr", "small", "smaller", "big", "sort", "sortname", "val", "nts"].includes(name)) {
    return positional.filter(Boolean).join(" ");
  }

  if (name === "abbr" || name === "tooltip") return positional[0] ?? "";
  if (name === "frac" || name === "fraction") return positional.join("/");
  if (name === "circa" || name === "c.") return `c. ${positional[0] ?? ""}`.trim();
  if (name === "nbsp" || name === "spaces" || name === "space") return " ";

  // Citations, footnotes and colour swatches carry no spec content.
  if (/^(cite|citation|sfn|efn|refn|r|colou?r sample|color box|nowiki)\b/.test(name)) return "";

  const first = positional[0] ?? "";
  return /^[\w\s.,%'"()/×–-]{1,80}$/.test(first) ? first : "";
}

/**
 * Resolve every template in a fragment, innermost first.
 *
 * Repeated passes rather than recursion: each pass can only match invocations
 * with no `{` or `}` inside them, so the innermost layer collapses, which
 * exposes the next. The iteration cap is a guard against a malformed article
 * (an unclosed `{{`) spinning the request rather than failing it; anything still
 * unresolved after it is dropped.
 */
function resolveTemplates(source: string): string {
  let text = source;
  for (let pass = 0; pass < 24; pass += 1) {
    const next = text.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => resolveTemplate(body));
    if (next === text) break;
    text = next;
  }
  return text.replace(/\{\{[\s\S]*?\}\}/g, " ");
}

/**
 * One infobox value as a reader would see it: templates resolved, links reduced
 * to their display text, markup gone, and the value's own line structure kept as
 * {@link PART_SEP}-joined parts.
 */
export function cleanValue(raw: string): string {
  let text = raw;

  // References are the article's sourcing, not the product's specification.
  text = text.replace(/<ref[^>]*\/>/gi, "").replace(/<ref[\s\S]*?<\/ref>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Line structure is captured before the tags are stripped, because it *is*
  // the value's structure: a phone's four sizes are four `<br>`-separated runs.
  text = text.replace(/<br\s*\/?>/gi, BREAK).replace(/<\/?(?:li|p|div|tr)[^>]*>/gi, BREAK);

  text = resolveTemplates(text);

  // Wikilinks: "[[iOS 17]]" and "[[Apple Inc.|Apple]]" both become what a reader
  // sees. A section link keeps only the page part — "Reluctance motor#Synchronous
  // reluctance" is one link, not two facts.
  text = text.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1");
  text = text.replace(/\[\[([^\]#]*)(?:#[^\]]*)?\]\]/g, "$1");
  text = text.replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1").replace(/\[https?:\/\/\S+\]/g, "");

  text = text.replace(/'''?/g, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/^[*#:;]+\s*/gm, BREAK);
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&(?:#\d+|[a-z]+);/gi, " ");
  text = text.replace(/[\r\n]+/g, BREAK);

  return text
    .split(BREAK)
    // A part can still open with the bullet or separator its list template used,
    // which reads as debris once the list is a " · " run.
    .map((part) => part.replace(/\s+/g, " ").trim().replace(/^[·*,;:–-]+\s*/, "").trim())
    // A part with no letter or digit left is punctuation debris from a dropped
    // template, not a value — "website = *" is the common one.
    .filter((part) => /[a-z0-9]/i.test(part))
    .join(PART_SEP);
}

/** The full `{{Infobox …}}` invocation in an article, braces included. */
export function findInfobox(wikitext: string): string | null {
  const opener = /\{\{\s*Infobox[ _]/i.exec(wikitext);
  if (!opener) return null;

  let depth = 0;
  for (let i = opener.index; i < wikitext.length; i += 1) {
    if (wikitext.startsWith("{{", i)) {
      depth += 1;
      i += 1;
    } else if (wikitext.startsWith("}}", i)) {
      depth -= 1;
      i += 1;
      if (depth === 0) return wikitext.slice(opener.index, i + 1);
    }
  }
  return null; // unclosed — treated as "no infobox"
}

/**
 * Keys that describe the *article's presentation* rather than the product:
 * which picture to use, how wide to draw it, what the caption says. They are
 * dropped rather than shown, because a spec sheet row reading "image_size =
 * 187px" is noise that makes every other row look less trustworthy.
 */
const PRESENTATION_KEYS = new Set([
  "name",
  "camera_name",
  "image",
  "image2",
  "image_size",
  "imagesize",
  "image_alt",
  "image_caption",
  "image_upright",
  "img",
  "logo",
  "logo_size",
  "logo_upright",
  "logo_alt",
  "caption",
  "caption2",
  "alt",
  "module",
  "footnotes",
  "references",
  "sp",
  "embed",
  "child",
  "title",
  "header",
  "list_title",
]);

/** An infobox reduced to its template name and its content fields. */
export interface ParsedInfobox {
  /** Lower-cased template name, e.g. "infobox mobile phone". */
  template: string;
  /** Content fields in article order — presentation keys already dropped. */
  fields: { key: string; value: string }[];
}

/**
 * Parse an article's infobox into ordered key/value pairs.
 *
 * Article order is kept deliberately. The people who maintain these templates
 * have already put the fields in a sensible reading order for that kind of
 * product, and re-sorting them alphabetically would throw that away.
 */
export function parseInfobox(wikitext: string): ParsedInfobox | null {
  const box = findInfobox(wikitext);
  if (!box) return null;

  const parts = splitPipes(box.slice(2, -2));
  const template = (parts[0] ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ")
    .trim();

  const fields: { key: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;

    const key = part.slice(0, eq).trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!key || PRESENTATION_KEYS.has(key) || seen.has(key)) continue;

    const value = cleanValue(part.slice(eq + 1));
    if (!value) continue;

    seen.add(key);
    fields.push({ key, value });
  }

  return { template, fields };
}

/**
 * The titles a wikilinked infobox value points at, e.g. the `predecessor` and
 * `related` rows. Read from the *raw* value, before {@link cleanValue} reduces
 * each link to its display text — the target is the thing that can be looked
 * up, and the display text often is not ("iPhone 14 Pro and Pro Max" is not an
 * article).
 */
export function linkedTitles(rawValue: string): string[] {
  const titles: string[] = [];
  for (const match of rawValue.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    const title = match[1].trim();
    // Category/file/template links are article furniture, not other products.
    // The colon is required: a bare `^image` would also reject "Imagen 3",
    // which is a product, and dropping a real neighbour is the worse mistake.
    if (!title || /^\s*:?\s*(?:category|file|image|template|wikt|help|portal|wikipedia)\s*:/i.test(title)) {
      continue;
    }
    if (!titles.includes(title)) titles.push(title);
  }
  return titles;
}

/**
 * The raw (unparsed) value of one infobox field — what {@link linkedTitles}
 * needs. Separate from {@link parseInfobox} because that one deliberately hands
 * back cleaned text, and re-deriving links from cleaned text is impossible.
 */
export function rawField(wikitext: string, key: string): string | null {
  const box = findInfobox(wikitext);
  if (!box) return null;

  for (const part of splitPipes(box.slice(2, -2)).slice(1)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim().toLowerCase().replace(/[\s-]+/g, "_") === key) {
      return part.slice(eq + 1);
    }
  }
  return null;
}
