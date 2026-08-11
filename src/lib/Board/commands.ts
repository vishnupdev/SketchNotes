import { escapeRe, hasPhrase } from "@/lib/utils";
import { KIND_BY_TYPE, STARTER_PROMPTS, TYPE_PHRASES } from "./catalog";
import { itemsRemaining, sectionsRemaining, splitLink } from "./board-api";
import { dayKey } from "./days";
import type {
  BoardCommand,
  BoardSection,
  NumField,
  ParsedPrompt,
  Placement,
  SectionItem,
  SectionType,
} from "./types";

/**
 * The prompt parser — how a line of plain English becomes one board edit.
 *
 * It is deliberately a *deterministic, local* parser rather than a language
 * model: it runs with no network, no API key and no cost, it cannot invent an
 * edit that wasn't asked for, and it can explain precisely why it didn't
 * understand something. That matters here because every command mutates the
 * user's own data.
 *
 * Shape of the thing: a fixed pipeline of matchers, most specific first (see
 * MATCH ORDER below). Each matcher either produces a {@link BoardCommand} with
 * every reference already resolved to an id — so `applyCommand` never guesses —
 * or declines and lets the next one try. Anything that reaches the end comes back
 * as a failure carrying examples, never as a silent no-op.
 *
 * MATCH ORDER is load-bearing. Generic verbs are shared across intents ("make",
 * "put", "clear"), so the narrow readings have to be tried before the broad
 * ones: "make groceries wide" is a resize, "make the goal 8" sets a field, and
 * only "make a checklist for groceries" is an add. Moving a matcher earlier or
 * later changes which reading wins.
 */

/** Politeness and filler that wraps a real instruction. */
const PREAMBLE_RE =
  /^(?:(?:hey|hi|hello|ok|okay|yo)[,!.\s]+)?(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+|pls\s+|kindly\s+)?(?:i(?:'d)?\s+(?:want|need|like)\s+(?:to\s+)?)?(?:let's\s+)?/i;

/** Words that mean "the board itself" rather than a section on it. */
const BOARD_WORDS = ["board", "page", "dashboard", "screen", "everything", "all", "sections", "here"];

/** Generic container nouns a person adds for clarity; never part of a title. */
const CONTAINER_RE = /\b(?:sections?|cards?|widgets?|blocks?|panels?|tiles?)\b/gi;

/** A leading article/possessive on a reference. */
const LEAD_RE = /^(?:the|my|a|an|this|that)\s+/i;

/** Number words worth understanding, so "add ten" doesn't need digits. */
const WORD_NUMS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, twentyfive: 25,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100,
};


const fail = (message: string, examples: string[] = STARTER_PROMPTS.slice(0, 3)): ParsedPrompt => ({
  ok: false,
  message,
  examples,
});

const done = (command: BoardCommand): ParsedPrompt => ({ ok: true, command });

/* ------------------------------ small helpers ------------------------------ */

/** Strip articles and container nouns off a section reference. */
function stripRef(raw: string): string {
  return raw
    .replace(LEAD_RE, "")
    .replace(CONTAINER_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,.;:'"]+|[,.;:'"]+$/g, "")
    .trim();
}

const isBoardWord = (ref: string) => BOARD_WORDS.includes(ref.toLowerCase());

/** The section type a phrase names, plus the phrase that named it. */
function typeIn(text: string): { type: SectionType; phrase: string } | null {
  const low = text.toLowerCase();
  for (const { phrase, type } of TYPE_PHRASES) if (hasPhrase(low, phrase)) return { type, phrase };
  return null;
}

/** Remove one occurrence of `phrase`, keeping the words either side apart. */
function withoutPhrase(text: string, phrase: string): string {
  return text
    .replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(phrase)}($|[^\\p{L}\\p{N}])`, "iu"), "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** First integer in a string, as digits or a number word. */
function intIn(text: string): number | null {
  const digits = /-?\d{1,7}/.exec(text.replace(/,/g, ""));
  if (digits) return Number(digits[0]);
  const word = text.toLowerCase().replace(/[\s-]/g, "");
  return word in WORD_NUMS ? WORD_NUMS[word] : null;
}

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Groceries" (checklist) — how a section is named back to the user. */
export const describe = (s: BoardSection) => `“${s.title}” (${KIND_BY_TYPE[s.type].label.toLowerCase()})`;

/** Titles already on the board, for a "which one did you mean?" message. */
const titleList = (sections: BoardSection[]) =>
  sections.map((s) => `“${s.title}”`).join(", ");

/* ------------------------------- resolution -------------------------------- */

/**
 * Find the section a reference points at.
 *
 * An empty reference is legitimate — "set the goal to 8" on a board with one
 * counter is unambiguous — so it resolves by type, then by there being only one
 * section at all. Matching is progressively looser (exact title → prefix →
 * substring → the reference containing the title → type name) and stops at the
 * first tier that yields exactly one candidate, so a loose match can never
 * silently beat an exact one.
 */
function resolve(
  sections: BoardSection[],
  rawRef: string,
  wanted?: SectionType,
): { section: BoardSection } | { error: string } {
  if (!sections.length) return { error: "The board is empty — add a section first." };
  const ref = stripRef(rawRef);

  if (!ref) {
    const pool = wanted ? sections.filter((s) => s.type === wanted) : sections;
    if (pool.length === 1) return { section: pool[0] };
    if (!pool.length) {
      return {
        error: wanted
          ? `There's no ${KIND_BY_TYPE[wanted].label.toLowerCase()} section yet.`
          : "The board is empty — add a section first.",
      };
    }
    return { error: `Which one? Name it — ${titleList(pool)}.` };
  }

  const low = ref.toLowerCase();
  const tiers: Array<(s: BoardSection) => boolean> = [
    (s) => s.title.toLowerCase() === low,
    (s) => s.title.toLowerCase().startsWith(low),
    (s) => s.title.toLowerCase().includes(low),
    (s) => low.includes(s.title.toLowerCase()),
  ];
  for (const test of tiers) {
    const hits = sections.filter(test);
    if (hits.length === 1) return { section: hits[0] };
    if (hits.length > 1) return { error: `More than one matches “${ref}” — ${titleList(hits)}.` };
  }

  // Nothing matched by title: the reference may name a type ("the checklist").
  const named = typeIn(ref);
  if (named) {
    const hits = sections.filter((s) => s.type === named.type);
    if (hits.length === 1) return { section: hits[0] };
    if (hits.length > 1) return { error: `Which ${named.phrase}? ${titleList(hits)}.` };
  }

  return { error: `I couldn't find a section called “${ref}”. On the board: ${titleList(sections)}.` };
}

/** Resolve without complaining — for matchers that fall through when unsure. */
function softResolve(sections: BoardSection[], rawRef: string): BoardSection | null {
  const r = resolve(sections, rawRef);
  return "section" in r ? r.section : null;
}

/** Find a row inside a section by its text. */
function findItem(section: BoardSection, rawText: string): SectionItem | null {
  const low = stripRef(rawText).toLowerCase();
  if (!low) return null;
  return (
    section.items.find((i) => i.text.toLowerCase() === low) ??
    section.items.find((i) => i.text.toLowerCase().startsWith(low)) ??
    section.items.find((i) => i.text.toLowerCase().includes(low)) ??
    null
  );
}

/** The day a phrase names, when it names one. */
function dayIn(text: string): string | null {
  const low = stripRef(text).toLowerCase();
  if (/^(today|now)$/.test(low)) return dayKey();
  if (/^yesterday$/.test(low)) return dayKey(Date.now() - 864e5);
  return null;
}


const PLACEMENTS: Record<string, Placement> = {
  top: "top", start: "top", beginning: "top", first: "top", front: "top",
  bottom: "bottom", end: "bottom", last: "bottom",
  up: "up", earlier: "up",
  down: "down", later: "down",
};

/* -------------------------------- the parser ------------------------------- */

/**
 * Turn one line of input into a resolved command against `sections`.
 *
 * `sections` is passed in (rather than the parser being pure over text alone) so
 * references resolve here, where a failure can be explained in the user's own
 * words — and so type-dependent readings are possible: "add 5 to pushups" is an
 * increment when "pushups" is a counter and a new row when it's a checklist.
 */
export function parsePrompt(input: string, sections: BoardSection[]): ParsedPrompt {
  const src = input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/, "")
    .replace(PREAMBLE_RE, "")
    .trim();
  if (!src) return fail("Type what you'd like on the board.");
  const low = src.toLowerCase();

  /* 1 ── help ------------------------------------------------------------- */
  if (/^(help|examples?|commands?|what can i (?:say|do|type)|how (?:does this work|do i use (?:this|it)))$/.test(low)) {
    return done({ kind: "help" });
  }

  /* 2 ── undo ------------------------------------------------------------- */
  if (/^(undo|undo that|undo last|undo it|revert|take that back|go back)$/.test(low)) {
    return done({ kind: "undo" });
  }

  /* 3 ── clear the whole board ------------------------------------------- */
  if (
    /^start (?:over|fresh|again)$/.test(low) ||
    /^(?:clear|reset|empty|wipe|delete|remove|drop)\s+(?:the\s+|my\s+|this\s+)?(?:whole\s+|entire\s+|all\s+(?:the\s+)?)?(?:everything|all|sections?|board|page|dashboard)$/.test(low)
  ) {
    if (!sections.length) return fail("The board is already empty.");
    return done({ kind: "clear" });
  }

  /* 4 ── move a section -------------------------------------------------- */
  const moveM =
    /^(?:move|shift|push|send|pin|put)\s+(?:the\s+|my\s+)?(.+?)\s+(?:to\s+(?:the\s+)?|at\s+(?:the\s+)?|)(top|bottom|start|end|beginning|first|last|front|up|down|earlier|later)$/i.exec(src);
  if (moveM) {
    const r = resolve(sections, moveM[1]);
    if ("error" in r) return fail(r.error, ["move groceries to top", "move ideas down"]);
    return done({ kind: "move", id: r.section.id, to: PLACEMENTS[moveM[2].toLowerCase()] });
  }

  /* 5 ── collapse / expand ----------------------------------------------- */
  const foldM = /^(collapse|fold|minimi[sz]e|hide|expand|unfold|reveal)\s+(?:the\s+|my\s+)?(.+)$/i.exec(src);
  if (foldM) {
    const collapsed = /^(collapse|fold|minimi|hide)/i.test(foldM[1]);
    const r = resolve(sections, foldM[2]);
    if ("error" in r) return fail(r.error, ["collapse ideas", "expand groceries"]);
    return done({ kind: "collapse", id: r.section.id, collapsed });
  }

  /* 6 ── width ----------------------------------------------------------- */
  const sizeM =
    /^(?:make|set|turn)\s+(?:the\s+|my\s+)?(.+?)\s+(?:to\s+)?(wide|wider|full[- ]?width|full|big|bigger|large|narrow|narrower|small|smaller|half|compact)$/i.exec(src);
  if (sizeM) {
    const wide = /^(wide|full|big|large)/i.test(sizeM[2]);
    const r = resolve(sections, sizeM[1]);
    if ("error" in r) return fail(r.error, ["make ideas wide", "make ideas narrow"]);
    return done({ kind: "resize", id: r.section.id, wide });
  }

  /* 7 ── rename ---------------------------------------------------------- */
  const renameM =
    /^(?:rename|retitle|re-title)\s+(?:the\s+|my\s+)?(.+?)\s+(?:to|as|into)\s+(.+)$/i.exec(src) ??
    /^(?:change|set|update)\s+(?:the\s+|my\s+)?(.*?)(?:'s)?\s*(?:title|name)\s+(?:to|as)\s+(.+)$/i.exec(src);
  if (renameM) {
    const r = resolve(sections, renameM[1]);
    if ("error" in r) return fail(r.error, ["rename groceries to shopping"]);
    const title = stripRef(renameM[2]);
    if (!title) return fail("What should it be called?", ["rename groceries to shopping"]);
    return done({ kind: "rename", id: r.section.id, title: titleCase(title) });
  }

  /* 8 ── set a field (goal / step / value / unit) ------------------------- */
  const fieldM =
    /^(?:set|change|update|make|put)\s+(?:the\s+|my\s+)?(.*?)\s*\b(goal|target|step|value|count|unit|units)\b\s*(?:to|=|:|at|of)?\s*(.+)$/i.exec(src);
  if (fieldM) {
    const raw = fieldM[2].toLowerCase();
    // "target" and "count" are the everyday words for the goal and the value.
    const field: NumField | "unit" =
      raw === "target" ? "goal" : raw === "count" ? "value" : raw === "units" ? "unit" : (raw as NumField | "unit");
    const r = resolve(sections, fieldM[1], "counter");
    if ("error" in r) return fail(r.error, ["set the water goal to 8", "set the water unit to glasses"]);
    if (r.section.type !== "counter") {
      return fail(
        `${describe(r.section)} has no ${raw} — that's a counter setting.`,
        ["add a counter for water", "set the water goal to 8"],
      );
    }
    if (field === "unit") {
      const unit = stripRef(fieldM[3]);
      if (!unit) return fail("What should it count?", ["set the water unit to glasses"]);
      return done({ kind: "setUnit", id: r.section.id, unit });
    }
    const value = intIn(fieldM[3]);
    if (value === null) return fail(`“${fieldM[3]}” isn't a number.`, ["set the water goal to 8"]);
    if (field === "step" && value < 1) return fail("The step has to be at least 1.");
    if (field === "goal" && value < 0) return fail("A goal can't be negative.");
    return done({ kind: "setNum", id: r.section.id, field, value });
  }

  /* 9 ── change a section's type ----------------------------------------- */
  const retypeM =
    /^(?:turn|convert|change|make)\s+(?:the\s+|my\s+)?(.+?)\s+(?:in)?to\s+(?:a\s+|an\s+)?(.+)$/i.exec(src) ??
    /^(?:make)\s+(?:the\s+|my\s+)?(.+?)\s+(?:a|an)\s+(.+)$/i.exec(src);
  if (retypeM) {
    const named = typeIn(retypeM[2]);
    const target = named ? softResolve(sections, retypeM[1]) : null;
    // Only a real section plus a real type is a retype; anything else is
    // probably an "add", so fall through rather than guess.
    if (named && target) {
      if (target.type === named.type) {
        return fail(`${describe(target)} is already a ${KIND_BY_TYPE[named.type].label.toLowerCase()}.`);
      }
      return done({ kind: "retype", id: target.id, type: named.type });
    }
  }

  /* 10 ── step a counter -------------------------------------------------- */
  const bumpM =
    /^(increase|increment|bump|raise|add to|decrease|decrement|reduce|lower|subtract from)\s+(?:the\s+|my\s+)?(.+?)(?:\s+by\s+(.+))?$/i.exec(src);
  if (bumpM) {
    const sign = /^(decrease|decrement|reduce|lower|subtract)/i.test(bumpM[1]) ? -1 : 1;
    const r = resolve(sections, bumpM[2], "counter");
    if ("error" in r) return fail(r.error, ["add 5 to pushups", "increase pushups by 10"]);
    if (r.section.type !== "counter") {
      return fail(`${describe(r.section)} isn't a counter, so there's nothing to step.`);
    }
    const by = bumpM[3] ? intIn(bumpM[3]) : r.section.step;
    if (by === null) return fail(`“${bumpM[3]}” isn't a number.`, ["increase pushups by 10"]);
    return done({ kind: "bump", id: r.section.id, by: sign * by });
  }

  /* 11 ── tick / untick --------------------------------------------------- */
  const tickM =
    /^(check|tick|complete|finish|mark|uncheck|untick|unmark|unfinish|reopen)\s+(?:off\s+)?(.+)$/i.exec(src);
  if (tickM) {
    const ticked = !/^(un|reopen)/i.test(tickM[1]);
    const rest = tickM[2]
      .replace(/\s+(?:as\s+)?(?:done|complete|completed|undone|incomplete)$/i, "")
      .replace(/\s+off$/i, "")
      .trim();
    const split = /^(.+?)\s+(?:in|on|from|of)\s+(?:the\s+|my\s+)?(.+)$/i.exec(rest);
    const itemRef = split ? split[1] : rest;
    const secRef = split ? split[2] : "";

    // "check today" / "tick today on reading" — a habit day rather than a row.
    const day = dayIn(itemRef);
    if (day) {
      const r = resolve(sections, secRef, "habit");
      if ("error" in r) return fail(r.error, ["check today on reading"]);
      if (r.section.type !== "habit") return fail(`${describe(r.section)} doesn't track days.`);
      return done({ kind: "tick", id: r.section.id, itemId: day, done: ticked });
    }

    // A named section: tick today (habit) or complain helpfully.
    const asSection = softResolve(sections, itemRef);
    if (asSection?.type === "habit" && !secRef) {
      return done({ kind: "tick", id: asSection.id, itemId: dayKey(), done: ticked });
    }

    // Otherwise it names a row. With no section given, search the whole board —
    // "check milk" should work without naming the list it's on.
    if (secRef) {
      const r = resolve(sections, secRef);
      if ("error" in r) return fail(r.error, ["check milk in groceries"]);
      const item = findItem(r.section, itemRef);
      if (!item) return fail(`${describe(r.section)} has no “${stripRef(itemRef)}”.`);
      return done({ kind: "tick", id: r.section.id, itemId: item.id, done: ticked });
    }
    const hits = sections
      .map((s) => ({ s, item: findItem(s, itemRef) }))
      .filter((h): h is { s: BoardSection; item: SectionItem } => h.item !== null);
    if (hits.length === 1) {
      return done({ kind: "tick", id: hits[0].s.id, itemId: hits[0].item.id, done: ticked });
    }
    if (hits.length > 1) {
      return fail(
        `“${stripRef(itemRef)}” is on more than one section — ${titleList(hits.map((h) => h.s))}.`,
        ["check milk in groceries"],
      );
    }
    return fail(`I couldn't find “${stripRef(itemRef)}” on the board.`, [
      "add milk to groceries",
      "check milk",
    ]);
  }

  /* 12 ── reset one section ---------------------------------------------- */
  const resetM = /^(?:reset|clear|empty|blank)\s+(?:the\s+|my\s+)?(.+)$/i.exec(src);
  if (resetM) {
    const r = resolve(sections, resetM[1]);
    if ("error" in r) return fail(r.error, ["reset pushups", "clear groceries"]);
    return done({ kind: "reset", id: r.section.id });
  }

  /* 13 ── add a row to a section ----------------------------------------- */
  const itemM = /^(?:add|append|put|insert|log)\s+(.+?)\s+(?:to|into|onto|on|in)\s+(?:the\s+|my\s+)?(.+)$/i.exec(src);
  if (itemM && !isBoardWord(stripRef(itemM[2]))) {
    const r = resolve(sections, itemM[2]);
    if ("error" in r) return fail(r.error, ["add milk to groceries"]);
    const section = r.section;
    const text = itemM[1].trim();

    if (section.type === "counter") {
      const by = intIn(text);
      if (by === null) {
        return fail(`${describe(section)} counts a number — say how much to add.`, [
          `add 5 to ${section.title.toLowerCase()}`,
        ]);
      }
      return done({ kind: "bump", id: section.id, by });
    }
    if (section.type === "habit") {
      const day = dayIn(text) ?? dayKey();
      return done({ kind: "tick", id: section.id, itemId: day, done: true });
    }
    if (!itemsRemaining(section)) return fail(`${describe(section)} is full.`);
    if (section.type === "links") {
      const { label, url } = splitLink(text);
      if (!url) {
        return fail("A links row needs a web address.", [
          `add docs example.com to ${section.title.toLowerCase()}`,
        ]);
      }
      return done({ kind: "addItem", id: section.id, text: label, url });
    }
    // note: appended as a new line; checklist: a new row.
    return done({ kind: "addItem", id: section.id, text, url: "" });
  }

  /* 14 ── remove a row --------------------------------------------------- */
  const rmItemM =
    /^(?:remove|delete|drop|take off|take out|subtract)\s+(.+?)\s+(?:from|off|out of)\s+(?:the\s+|my\s+)?(.+)$/i.exec(src);
  if (rmItemM) {
    const r = resolve(sections, rmItemM[2]);
    if ("error" in r) return fail(r.error, ["remove milk from groceries"]);
    const section = r.section;
    const text = rmItemM[1].trim();

    if (section.type === "counter") {
      const by = intIn(text);
      if (by === null) return fail(`${describe(section)} counts a number — say how much to subtract.`);
      return done({ kind: "bump", id: section.id, by: -by });
    }
    if (section.type === "habit") {
      const day = dayIn(text) ?? dayKey();
      return done({ kind: "tick", id: section.id, itemId: day, done: false });
    }
    const item = findItem(section, text);
    if (!item) return fail(`${describe(section)} has no “${stripRef(text)}”.`);
    return done({ kind: "removeItem", id: section.id, itemId: item.id });
  }

  /* 15 ── remove a section ----------------------------------------------- */
  const rmM = /^(?:remove|delete|drop|discard|get rid of|bin|kill)\s+(?:the\s+|my\s+)?(.+)$/i.exec(src);
  if (rmM) {
    if (isBoardWord(stripRef(rmM[1]))) return sections.length ? done({ kind: "clear" }) : fail("The board is already empty.");
    const r = resolve(sections, rmM[1]);
    if ("error" in r) return fail(r.error, ["remove groceries", "clear the board"]);
    return done({ kind: "remove", id: r.section.id });
  }

  /* 16 ── add a section -------------------------------------------------- */
  const addM =
    /^(?:add|create|make|new|start|insert|set up|give me)\s+(?:me\s+)?(?:a\s+|an\s+|another\s+|the\s+|some\s+)?(?:new\s+)?(.*)$/i.exec(src);
  // A bare noun phrase counts too, but only when it plainly names a type
  // ("checklist for groceries") — never for free text, which stays a failure.
  const bare = !addM && typeIn(src) ? src : null;
  if (addM || bare) {
    if (!sectionsRemaining(sections)) {
      return fail("The board is full — remove a section before adding another.");
    }
    let rest = (addM ? addM[1] : bare!)
      .replace(/\s+(?:to|on|in)\s+(?:the\s+|my\s+)?(?:board|page|dashboard|here)$/i, "")
      .replace(CONTAINER_RE, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!rest) return fail("What kind of section? Name it and I'll add it.", STARTER_PROMPTS.slice(0, 3));

    // "with a goal of 8" / "out of 8" sets up a counter in one breath. Pulled
    // out before the title is read so the number never lands in the title.
    let goal: number | null = null;
    const goalM = /\s*(?:,\s*)?(?:with\s+)?(?:a\s+)?(?:goal|target)\s*(?:of|=|:)?\s*(\d{1,6})\b/i.exec(rest);
    const outOfM = /\s+out\s+of\s+(\d{1,6})\b/i.exec(rest);
    if (goalM) {
      goal = Number(goalM[1]);
      rest = rest.replace(goalM[0], " ").replace(/\s+/g, " ").trim();
    } else if (outOfM) {
      goal = Number(outOfM[1]);
      rest = rest.replace(outOfM[0], " ").replace(/\s+/g, " ").trim();
    }
    rest = rest.replace(/\s+(?:and|with)$/i, "").trim();
    if (!rest) return fail("What kind of section? Name it and I'll add it.", STARTER_PROMPTS.slice(0, 3));

    const titleM = /^(.*?)\s*(?:\bfor\b|\bcalled\b|\bnamed\b|\btitled\b|\babout\b|:)\s+(.+)$/i.exec(rest);
    const typePart = titleM ? titleM[1].trim() : rest;
    let title = titleM ? stripRef(titleM[2]) : "";

    const named = typeIn(typePart) ?? typeIn(title);
    const type = named?.type ?? inferType(rest);
    if (!title) {
      // Nothing was named explicitly, so the words left over once the type word
      // is removed become the title: "water tracker" → a counter called Water.
      let leftover = named ? withoutPhrase(typePart, named.phrase) : typePart;
      // A multi-word phrase can swallow the title whole ("shopping list" is one
      // of the checklist phrases), leaving nothing to name the section. Drop just
      // the generic noun off the end instead: "shopping list" → "Shopping".
      if (!leftover.trim() && named?.phrase.includes(" ")) {
        leftover = withoutPhrase(typePart, named.phrase.slice(named.phrase.lastIndexOf(" ") + 1));
      }
      title = stripRef(leftover.replace(/\s+(?:a|an)$/i, ""));
    }
    title = titleCase(title) || KIND_BY_TYPE[type].defaultTitle;

    // A goal only means something on a counter; it's dropped elsewhere rather
    // than refusing an otherwise valid section.
    return done({
      kind: "add",
      type,
      title,
      ...(goal !== null && type === "counter" ? { goal } : {}),
      ...(named ? {} : { inferred: true }),
    });
  }

  return fail(`I didn't understand “${input.trim()}”.`, STARTER_PROMPTS.slice(0, 3));
}

/**
 * Last-resort type guess for an "add" that named no type — read off what the
 * words imply, defaulting to a note because it's the type that loses least when
 * the guess is wrong (all its content is free text either way).
 */
function inferType(text: string): SectionType {
  const low = text.toLowerCase();
  if (/\b(habit|streak|routine|every ?day|daily|each day)\b/.test(low)) return "habit";
  if (/\b(track|tracking|tracker|count|counting|tally|how many|number of|reps|score)\b/.test(low)) {
    return "counter";
  }
  if (/\b(links?|urls?|bookmarks?|websites?|sites?|https?)\b/.test(low)) return "links";
  if (/\b(list|items|buy|shopping|groceries|packing|pack|steps|checklist|todos?|tasks?)\b/.test(low)) {
    return "checklist";
  }
  return "note";
}

/** The grammar, grouped for the help sheet. */
export const HELP_GRAMMAR: Array<{ heading: string; lines: string[] }> = [
  {
    heading: "Add",
    lines: [
      "add a checklist for groceries",
      "add a counter for water with a goal of 8",
      "add a habit for reading",
      "add a note called Ideas",
      "add a links section for work",
    ],
  },
  {
    heading: "Modify",
    lines: [
      "rename groceries to shopping",
      "set the water goal to 10",
      "set the water unit to glasses",
      "turn ideas into a checklist",
      "make ideas wide",
      "move groceries to top",
      "collapse ideas",
    ],
  },
  {
    heading: "Fill in",
    lines: [
      "add milk to groceries",
      "add docs example.com to work",
      "check milk",
      "uncheck milk",
      "add 5 to water",
      "check today on reading",
    ],
  },
  {
    heading: "Remove",
    lines: [
      "remove milk from groceries",
      "remove groceries",
      "reset water",
      "clear the board",
      "undo",
    ],
  },
];
