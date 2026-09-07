/**
 * The expression language Calc evaluates — tokenizer, parser and evaluator.
 *
 * A pure function of the text, the variables in scope and the angle mode, with
 * no state of its own, so the same line always produces the same answer and the
 * whole thing is testable without a screen (see `calc.test.ts`).
 *
 * Three decisions are worth naming, because they are the ones calculators
 * disagree about:
 *
 * 1. **`%` is contextual.** `50 + 10%` is 55, not 50.1 — a percent added to
 *    something means a percent *of that something*, which is how every phone
 *    calculator behaves and what a person typing a tip or a tax expects. But
 *    `10% * 200` is 20, because there the percent is just the number 0.1. So a
 *    percent literal carries a flag through evaluation ({@link Val}) rather than
 *    being converted at the point it is read, and only `+` and `-` consult it.
 * 2. **Modulo is spelled `mod`.** It cannot be `%` when `%` is percent, and a
 *    calculator that silently gives one when you meant the other is worse than
 *    one that makes you write the word.
 * 3. **`-2^2` is -4.** Exponentiation binds tighter than unary minus, as in
 *    mathematical convention and unlike most spreadsheet software.
 */

/** Whether the trigonometric functions read and return degrees or radians. */
export type Angle = "deg" | "rad";

/**
 * A value mid-evaluation: the number, plus whether it arrived as a percent
 * literal. The flag is what makes `50 + 10%` differ from `50 + 0.1`; everywhere
 * other than the two additive operators a percent simply *is* its fraction.
 */
interface Val {
  n: number;
  pct: boolean;
}

const plain = (n: number): Val => ({ n, pct: false });

export type EvalResult = { ok: true; value: number } | { ok: false; error: string };

/** Constants available by name, in any case. */
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
  inf: Infinity,
};

/** Words that are operators rather than names, so a name can never shadow one. */
const KEYWORDS = new Set(["mod", "of"]);

interface Fn {
  /** Fixed arity, or null for the variadic ones. */
  arity: number | null;
  /** Receives plain numbers — a percent argument has already decayed to 0.1. */
  apply: (args: number[], angle: Angle) => number;
}

const toRad = (v: number, angle: Angle): number => (angle === "deg" ? (v * Math.PI) / 180 : v);
const fromRad = (v: number, angle: Angle): number => (angle === "deg" ? (v * 180) / Math.PI : v);

/**
 * Every named function. Trigonometry is the only place the angle mode is read;
 * everything else is a plain wrapper, which is deliberate — the value of this
 * table is that it is boring and complete, not that it is clever.
 */
const FUNCTIONS: Record<string, Fn> = {
  sqrt: { arity: 1, apply: ([a]) => Math.sqrt(a) },
  cbrt: { arity: 1, apply: ([a]) => Math.cbrt(a) },
  abs: { arity: 1, apply: ([a]) => Math.abs(a) },
  sign: { arity: 1, apply: ([a]) => Math.sign(a) },
  round: { arity: null, apply: (a) => roundTo(a) },
  floor: { arity: 1, apply: ([a]) => Math.floor(a) },
  ceil: { arity: 1, apply: ([a]) => Math.ceil(a) },
  trunc: { arity: 1, apply: ([a]) => Math.trunc(a) },
  min: { arity: null, apply: (a) => Math.min(...a) },
  max: { arity: null, apply: (a) => Math.max(...a) },
  sum: { arity: null, apply: (a) => a.reduce((total, v) => total + v, 0) },
  avg: { arity: null, apply: (a) => a.reduce((total, v) => total + v, 0) / a.length },
  ln: { arity: 1, apply: ([a]) => Math.log(a) },
  log: { arity: null, apply: (a) => (a.length === 2 ? Math.log(a[0]) / Math.log(a[1]) : Math.log10(a[0])) },
  log2: { arity: 1, apply: ([a]) => Math.log2(a) },
  exp: { arity: 1, apply: ([a]) => Math.exp(a) },
  pow: { arity: 2, apply: ([a, b]) => a ** b },
  hypot: { arity: null, apply: (a) => Math.hypot(...a) },
  gcd: { arity: null, apply: (a) => a.reduce(gcd2) },
  lcm: { arity: null, apply: (a) => a.reduce(lcm2) },
  sin: { arity: 1, apply: ([a], angle) => Math.sin(toRad(a, angle)) },
  cos: { arity: 1, apply: ([a], angle) => Math.cos(toRad(a, angle)) },
  tan: { arity: 1, apply: ([a], angle) => Math.tan(toRad(a, angle)) },
  asin: { arity: 1, apply: ([a], angle) => fromRad(Math.asin(a), angle) },
  acos: { arity: 1, apply: ([a], angle) => fromRad(Math.acos(a), angle) },
  atan: { arity: 1, apply: ([a], angle) => fromRad(Math.atan(a), angle) },
  atan2: { arity: 2, apply: ([a, b], angle) => fromRad(Math.atan2(a, b), angle) },
};

/** `round(x)` to the nearest whole, `round(x, 2)` to two decimal places. */
function roundTo(args: number[]): number {
  const [value, places = 0] = args;
  const factor = 10 ** Math.trunc(places);
  return Math.round(value * factor) / factor;
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

const lcm2 = (a: number, b: number): number => {
  const g = gcd2(a, b);
  return g === 0 ? 0 : Math.abs(Math.trunc(a) * Math.trunc(b)) / g;
};

/** The names a completion list or a help panel can offer. */
export const FUNCTION_NAMES: string[] = Object.keys(FUNCTIONS).sort();
export const CONSTANT_NAMES: string[] = Object.keys(CONSTANTS).sort();

/* --------------------------------- tokens --------------------------------- */

type Tok =
  | { k: "num"; n: number }
  | { k: "name"; s: string }
  | { k: "op"; s: string };

/** Thrown internally and caught at the top of {@link evaluate}. */
class CalcError extends Error {}

/**
 * A function declaration rather than an arrow, so TypeScript's control-flow
 * analysis treats a call to it as the end of a branch — which is what lets
 * `if (!t) fail(…)` narrow `t` for the lines below.
 */
function fail(message: string): never {
  throw new CalcError(message);
}

const NUMBER = /^(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?/;
const NAME = /^[A-Za-z_][A-Za-z0-9_]*/;
const OPS = ["+", "-", "*", "/", "^", "%", "!", "(", ")", ","];

/**
 * Split the source into tokens.
 *
 * Underscores are stripped from numbers rather than rejected, so `1_000_000`
 * reads the way it is written in the places people copy figures from.
 */
export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let rest = src;

  while (rest.length > 0) {
    const ws = rest.match(/^\s+/);
    if (ws) {
      rest = rest.slice(ws[0].length);
      continue;
    }

    // Radix prefixes first: `0x1f` would otherwise read as `0` followed by the
    // name `x1f`, which is a confusing error for a legitimate literal.
    const radix = rest.match(/^0([xbo])([0-9a-fA-F_]+)/);
    if (radix) {
      const base = radix[1] === "x" ? 16 : radix[1] === "b" ? 2 : 8;
      const digits = radix[2].replace(/_/g, "");
      const value = parseInt(digits, base);
      if (Number.isNaN(value) || !isBaseDigits(digits, base)) {
        fail(`“${radix[0]}” is not a valid base-${base} number`);
      }
      out.push({ k: "num", n: value });
      rest = rest.slice(radix[0].length);
      continue;
    }

    const num = rest.match(NUMBER);
    if (num) {
      const value = Number(num[0].replace(/_/g, ""));
      if (Number.isNaN(value)) fail(`“${num[0]}” is not a number`);
      out.push({ k: "num", n: value });
      rest = rest.slice(num[0].length);
      continue;
    }

    const name = rest.match(NAME);
    if (name) {
      out.push({ k: "name", s: name[0] });
      rest = rest.slice(name[0].length);
      continue;
    }

    const op = OPS.find((candidate) => rest.startsWith(candidate));
    if (op) {
      out.push({ k: "op", s: op });
      rest = rest.slice(op.length);
      continue;
    }

    fail(`“${rest[0]}” is not something this calculator understands`);
  }

  return out;
}

const isBaseDigits = (digits: string, base: number): boolean =>
  digits.length > 0 && [...digits].every((d) => parseInt(d, 16) < base && /[0-9a-fA-F]/.test(d));

/* --------------------------------- parsing -------------------------------- */

/**
 * A recursive-descent parser that evaluates as it goes.
 *
 * There is no syntax tree: nothing here needs to inspect or transform an
 * expression, only answer it, and a tree would be a layer to keep correct for
 * no reader's benefit.
 */
class Parser {
  private pos = 0;

  constructor(
    private readonly toks: Tok[],
    private readonly vars: Record<string, number>,
    private readonly angle: Angle,
  ) {}

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private isOp(s: string): boolean {
    const t = this.peek();
    return t !== undefined && t.k === "op" && t.s === s;
  }

  private isKeyword(word: string): boolean {
    const t = this.peek();
    return t !== undefined && t.k === "name" && t.s.toLowerCase() === word;
  }

  private take(): Tok {
    const t = this.toks[this.pos];
    if (!t) fail("the expression ends before it is finished");
    this.pos += 1;
    return t;
  }

  private expect(s: string): void {
    if (!this.isOp(s)) fail(`expected “${s}”`);
    this.pos += 1;
  }

  /** Parse and evaluate the whole token stream, rejecting anything left over. */
  run(): number {
    const value = this.addsub();
    const extra = this.peek();
    if (extra) {
      fail(
        extra.k === "op"
          ? `“${extra.s}” has nothing to work on here`
          : `“${extra.k === "num" ? extra.n : extra.s}” is unexpected here`,
      );
    }
    return value.n;
  }

  private addsub(): Val {
    let left = this.muldiv();
    for (;;) {
      const plusMinus = this.isOp("+") ? 1 : this.isOp("-") ? -1 : 0;
      if (plusMinus === 0) return left;
      this.pos += 1;
      const right = this.muldiv();
      // The contextual half of the percent rule: a percent on the right of an
      // addition is a percent *of the left side*.
      left = plain(left.n + plusMinus * (right.pct ? left.n * right.n : right.n));
    }
  }

  private muldiv(): Val {
    let left = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isKeyword("of")) {
        this.pos += 1;
        left = plain(left.n * this.unary().n);
        continue;
      }
      if (this.isOp("/")) {
        this.pos += 1;
        const divisor = this.unary().n;
        if (divisor === 0) fail("division by zero");
        left = plain(left.n / divisor);
        continue;
      }
      if (this.isKeyword("mod")) {
        this.pos += 1;
        const divisor = this.unary().n;
        if (divisor === 0) fail("cannot take a remainder modulo zero");
        left = plain(left.n % divisor);
        continue;
      }
      // Implicit multiplication, but only where it cannot be mistaken for
      // something else: `2(3+4)`, `(a)(b)`. Two bare names in a row are left
      // alone — `x y` is far more likely a typo than a product. Nor does it
      // apply after a percent: `17 % 5` is someone reaching for a remainder,
      // and answering 0.85 would be the exact silent wrong answer that spelling
      // modulo as a word exists to avoid.
      if (!left.pct && (this.isOp("(") || this.peek()?.k === "num")) {
        left = plain(left.n * this.unary().n);
        continue;
      }
      return left;
    }
  }

  private unary(): Val {
    if (this.isOp("-")) {
      this.pos += 1;
      const value = this.unary();
      return { n: -value.n, pct: value.pct };
    }
    if (this.isOp("+")) {
      this.pos += 1;
      return this.unary();
    }
    return this.power();
  }

  /** Right-associative, and its exponent may itself be signed (`2^-1`). */
  private power(): Val {
    const base = this.postfix();
    if (!this.isOp("^")) return base;
    this.pos += 1;
    return plain(base.n ** this.unary().n);
  }

  private postfix(): Val {
    let value = this.primary();
    for (;;) {
      if (this.isOp("%")) {
        this.pos += 1;
        value = { n: value.n / 100, pct: true };
        continue;
      }
      if (this.isOp("!")) {
        this.pos += 1;
        value = plain(factorial(value.n));
        continue;
      }
      return value;
    }
  }

  private primary(): Val {
    if (this.isOp("(")) {
      this.pos += 1;
      const inner = this.addsub();
      this.expect(")");
      // A parenthesised percent keeps being one, so `(10%) + 50` and `50 + 10%`
      // agree — but only in the direction addition already reads.
      return inner;
    }

    const t = this.take();

    if (t.k === "num") return plain(t.n);

    if (t.k === "name") {
      const name = t.s.toLowerCase();
      if (KEYWORDS.has(name)) fail(`“${t.s}” needs a value on each side of it`);

      const fn = FUNCTIONS[name];
      if (fn) {
        this.expect("(");
        const args = this.args();
        if (args.length === 0) fail(`${name}() needs at least one value`);
        if (fn.arity !== null && args.length !== fn.arity) {
          fail(`${name}() takes ${fn.arity} value${fn.arity === 1 ? "" : "s"}, not ${args.length}`);
        }
        return plain(fn.apply(args, this.angle));
      }

      if (name in this.vars) return plain(this.vars[name]);
      if (name in CONSTANTS) return plain(CONSTANTS[name]);

      // The commonest cause by far is a function typed without brackets, so the
      // message says which of the two mistakes it is.
      fail(
        this.isOp("(")
          ? `there is no function called “${t.s}”`
          : `“${t.s}” has no value — assign it on an earlier line, as “${t.s} = 12”`,
      );
    }

    return fail(`“${t.k === "op" ? t.s : ""}” cannot start a value`);
  }

  private args(): number[] {
    const out: number[] = [];
    if (this.isOp(")")) {
      this.pos += 1;
      return out;
    }
    for (;;) {
      out.push(this.addsub().n);
      if (this.isOp(",")) {
        this.pos += 1;
        continue;
      }
      this.expect(")");
      return out;
    }
  }
}

/** 170! is the largest that fits a double; beyond it every answer is Infinity. */
function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) fail("a factorial needs a whole number that is not negative");
  if (n > 170) fail("that factorial is larger than this calculator can hold");
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

/* -------------------------------- evaluate -------------------------------- */

/**
 * Evaluate one expression.
 *
 * Never throws: a malformed line is an ordinary outcome in a calculator you are
 * still typing into, so the failure comes back as a message to show beside the
 * line rather than as an exception to guard every call site with.
 */
export function evaluate(
  src: string,
  vars: Record<string, number> = {},
  angle: Angle = "deg",
): EvalResult {
  if (src.trim() === "") return { ok: false, error: "nothing to work out" };
  try {
    const toks = tokenize(src);
    if (toks.length === 0) return { ok: false, error: "nothing to work out" };
    const value = new Parser(toks, vars, angle).run();
    if (Number.isNaN(value)) return { ok: false, error: "that does not have a numeric answer" };
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err instanceof CalcError ? err.message : "that expression cannot be read" };
  }
}

/* --------------------------------- display -------------------------------- */

const MAX_DIGITS = 12;

/**
 * A number as a calculator should show it: grouped thousands, no floating-point
 * dust, and an exponent only where the plain form would be unreadable.
 *
 * The dust matters more than it sounds. `0.1 + 0.2` is 0.30000000000000004 in
 * every language with doubles, and a calculator that shows that is telling the
 * truth in a way nobody wants — rounding to twelve significant digits keeps
 * every figure a person actually typed while hiding the representation.
 */
export function formatNumber(value: number, group = true): string {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "—" : value > 0 ? "∞" : "-∞";
  if (value === 0) return "0";

  const magnitude = Math.abs(value);
  if (magnitude >= 1e15 || magnitude < 1e-9) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }

  const rounded = Number(value.toPrecision(MAX_DIGITS));
  const [whole, decimals] = Math.abs(rounded).toFixed(guessDecimals(rounded)).split(".");
  // `toFixed` pads to a fixed width, so 2.5 comes back as "2.500" whenever
  // another figure on the same line needed three places. Only the digits that
  // carry information are kept.
  const fraction = (decimals ?? "").replace(/0+$/, "");
  const sign = rounded < 0 ? "-" : "";
  const lead = group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
  return fraction ? `${sign}${lead}.${fraction}` : `${sign}${lead}`;
}

/**
 * How many decimal places the rounded value genuinely needs — enough to show it
 * exactly, and never more, so `1/3` keeps its digits while `2.5` stays `2.5`.
 */
function guessDecimals(value: number): number {
  const text = Math.abs(value).toString();
  if (text.includes("e")) return MAX_DIGITS;
  const decimals = text.split(".")[1]?.length ?? 0;
  const whole = Math.trunc(Math.abs(value)).toString().length;
  return Math.min(decimals, Math.max(0, MAX_DIGITS - whole));
}
