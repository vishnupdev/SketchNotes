/**
 * Number bases and bitwise arithmetic.
 *
 * All of it runs on `BigInt`, never on `number`. That is the whole reason this
 * is its own module rather than a few lines in the expression evaluator:
 * JavaScript's bitwise operators coerce to **32-bit signed** integers, so
 * `0xFFFFFFFF | 0` is -1 and anything above 2^31 silently wraps. A tool whose
 * entire job is to show you the exact bits cannot be built on an operator that
 * discards them.
 *
 * Widths are honoured explicitly instead: a value is masked to the chosen width
 * after every operation, and read back as signed or unsigned on request, so
 * two's complement is something you can see rather than something you have to
 * work out.
 */

export type Base = 2 | 8 | 10 | 16;
export type Width = 8 | 16 | 32 | 64;

export const BASES: Base[] = [2, 8, 10, 16];
export const WIDTHS: Width[] = [8, 16, 32, 64];

export const BASE_LABELS: Record<Base, string> = {
  2: "Binary",
  8: "Octal",
  10: "Decimal",
  16: "Hex",
};

/** The prefix each base is written with, and the one this module accepts. */
export const BASE_PREFIX: Record<Base, string> = { 2: "0b", 8: "0o", 10: "", 16: "0x" };

const DIGITS = "0123456789abcdef";

/**
 * Read a value written in `base`, or in whatever base its prefix names.
 *
 * An explicit `0x`/`0b`/`0o` always wins over the selected base, because
 * pasting `0xdeadbeef` into a field set to decimal means "read this as hex" and
 * not "reject it". A leading `-` is accepted so a negative can be typed rather
 * than only arrived at.
 */
export function parseInBase(text: string, base: Base): bigint | null {
  const raw = text.trim().replace(/[\s_,]/g, "").toLowerCase();
  if (raw === "" || raw === "-") return null;

  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;

  let digits = body;
  let radix: number = base;
  const prefix = body.slice(0, 2);
  if (prefix === "0x") [digits, radix] = [body.slice(2), 16];
  else if (prefix === "0b") [digits, radix] = [body.slice(2), 2];
  else if (prefix === "0o") [digits, radix] = [body.slice(2), 8];

  if (digits === "") return null;

  let value = 0n;
  const big = BigInt(radix);
  for (const ch of digits) {
    const digit = DIGITS.indexOf(ch);
    if (digit === -1 || digit >= radix) return null;
    value = value * big + BigInt(digit);
  }
  return negative ? -value : value;
}

/**
 * Write a value in `base`, grouped the way that base is read: bytes of four
 * bits, hex in fours, decimal in threes. Octal is left ungrouped — nobody
 * groups octal, and inventing a convention would only make it harder to check
 * against another tool.
 */
export function formatInBase(value: bigint, base: Base, group = true): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString(base);
  const grouped = group ? groupDigits(digits, base) : digits;
  return `${negative ? "-" : ""}${grouped}`;
}

function groupDigits(digits: string, base: Base): string {
  const size = base === 2 ? 4 : base === 16 ? 4 : base === 10 ? 3 : 0;
  if (size === 0 || digits.length <= size) return digits;

  const out: string[] = [];
  for (let end = digits.length; end > 0; end -= size) {
    out.unshift(digits.slice(Math.max(0, end - size), end));
  }
  return out.join(base === 10 ? "," : " ");
}

/**
 * Mask a value into `width` bits, then read those bits as signed or unsigned.
 *
 * This is where a negative becomes its two's complement and where an
 * out-of-range value wraps rather than being rejected — which is what the
 * hardware does, and the behaviour someone checking a register against a
 * datasheet needs to see.
 */
export function toWidth(value: bigint, width: Width, signed: boolean): bigint {
  const bits = BigInt(width);
  const span = 1n << bits;
  const masked = ((value % span) + span) % span;
  if (!signed) return masked;
  return masked >= span >> 1n ? masked - span : masked;
}

/** Whether a value needs more than `width` bits, i.e. whether it will wrap. */
export const overflows = (value: bigint, width: Width, signed: boolean): boolean =>
  toWidth(value, width, signed) !== value;

/**
 * The bits of a value, most significant first, as one flat array of 0s and 1s —
 * always exactly `width` long, so a grid drawn from it lines up with the labels
 * above it.
 */
export function bitsOf(value: bigint, width: Width): number[] {
  const masked = toWidth(value, width, false);
  const out: number[] = [];
  for (let i = width - 1; i >= 0; i -= 1) out.push(Number((masked >> BigInt(i)) & 1n));
  return out;
}

/** How many bits are set — the population count, which no language exposes. */
export const popCount = (value: bigint, width: Width): number =>
  bitsOf(value, width).reduce((sum, bit) => sum + bit, 0);

export type BitOp = "and" | "or" | "xor" | "not" | "shl" | "shr";

export const BIT_OPS: { id: BitOp; label: string; symbol: string; unary?: boolean }[] = [
  { id: "and", label: "AND", symbol: "&" },
  { id: "or", label: "OR", symbol: "|" },
  { id: "xor", label: "XOR", symbol: "^" },
  { id: "shl", label: "Shift left", symbol: "<<" },
  { id: "shr", label: "Shift right", symbol: ">>" },
  { id: "not", label: "NOT", symbol: "~", unary: true },
];

/**
 * Apply a bitwise operation within `width`.
 *
 * Both operands are masked to the width first, so `NOT` and the shifts produce
 * the value the register would hold rather than an arbitrarily wide BigInt —
 * `~0` in 8 bits is 255, and shifting a bit off the top loses it, as it should.
 * A shift distance is clamped to the width: shifting by more than that is
 * undefined in C and a source of real bugs, and clamping at least reports the
 * only defensible answer, zero.
 */
export function applyBitOp(op: BitOp, a: bigint, b: bigint, width: Width): bigint {
  const left = toWidth(a, width, false);
  const right = toWidth(b, width, false);
  const distance = b < 0n ? 0n : b > BigInt(width) ? BigInt(width) : b;

  switch (op) {
    case "and":
      return toWidth(left & right, width, false);
    case "or":
      return toWidth(left | right, width, false);
    case "xor":
      return toWidth(left ^ right, width, false);
    case "not":
      return toWidth(~left, width, false);
    case "shl":
      return toWidth(left << distance, width, false);
    case "shr":
      return toWidth(left >> distance, width, false);
  }
}
