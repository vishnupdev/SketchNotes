import { describe, expect, it } from "vitest";
import { evaluate, formatNumber, type Angle } from "./expression";
import { evaluateTape } from "./tape";
import {
  applyBitOp,
  bitsOf,
  formatInBase,
  overflows,
  parseInBase,
  popCount,
  toWidth,
} from "./bases";
import { answerPercent } from "./percent";

/** The value of an expression, or the error message, whichever came back. */
const value = (src: string, vars: Record<string, number> = {}, angle: Angle = "deg") => {
  const result = evaluate(src, vars, angle);
  return result.ok ? result.value : `error: ${result.error}`;
};

describe("expression — arithmetic", () => {
  it("applies the usual precedence", () => {
    expect(value("2 + 3 * 4")).toBe(14);
    expect(value("(2 + 3) * 4")).toBe(20);
    expect(value("10 / 4")).toBe(2.5);
  });

  it("binds exponentiation tighter than unary minus, so -2^2 is -4", () => {
    expect(value("-2^2")).toBe(-4);
    expect(value("(-2)^2")).toBe(4);
  });

  it("treats exponentiation as right-associative", () => {
    expect(value("2^3^2")).toBe(512);
    expect(value("2^-1")).toBe(0.5);
  });

  it("reads radix prefixes and digit separators", () => {
    expect(value("0xff")).toBe(255);
    expect(value("0b1010")).toBe(10);
    expect(value("0o17")).toBe(15);
    expect(value("1_000_000 / 1_000")).toBe(1000);
  });

  it("multiplies implicitly where it cannot be mistaken", () => {
    expect(value("2(3 + 4)")).toBe(14);
    expect(value("(2)(3)")).toBe(6);
  });

  it("leaves two bare names alone rather than guessing a product", () => {
    expect(value("x y", { x: 2, y: 3 })).toContain("error:");
  });
});

describe("expression — the percent rule", () => {
  it("reads a percent added or subtracted as a percent of the other side", () => {
    expect(value("50 + 10%")).toBe(55);
    expect(value("200 - 10%")).toBe(180);
    // The commonest real use: a bill plus a tip, and a price less a discount.
    expect(value("2400 + 18%")).toBe(2832);
  });

  it("reads a percent anywhere else as its plain fraction", () => {
    expect(value("10%")).toBeCloseTo(0.1);
    expect(value("10% * 200")).toBe(20);
    expect(value("20% of 80")).toBe(16);
    expect(value("sqrt(25%)")).toBe(0.5);
  });

  it("keeps a parenthesised percent contextual, so both orders agree", () => {
    expect(value("50 + (10%)")).toBe(55);
  });

  it("spells modulo as a word, because % is already taken", () => {
    expect(value("17 mod 5")).toBe(2);
    expect(value("17 % 5")).toContain("error:");
  });
});

describe("expression — functions and names", () => {
  it("evaluates the function table", () => {
    expect(value("sqrt(144)")).toBe(12);
    expect(value("max(3, 9, 4)")).toBe(9);
    expect(value("sum(1, 2, 3, 4)")).toBe(10);
    expect(value("round(2.567, 2)")).toBe(2.57);
    expect(value("gcd(24, 36)")).toBe(12);
    expect(value("log(1000)")).toBe(3);
    expect(value("log(8, 2)")).toBe(3);
  });

  it("reads angles in the mode it is given", () => {
    expect(value("sin(90)", {}, "deg")).toBeCloseTo(1);
    expect(value("sin(pi / 2)", {}, "rad")).toBeCloseTo(1);
    expect(value("asin(1)", {}, "deg")).toBeCloseTo(90);
  });

  it("resolves variables and constants, case-insensitively", () => {
    expect(value("rate * 2", { rate: 21 })).toBe(42);
    expect(value("RATE * 2", { rate: 21 })).toBe(42);
    expect(value("pi > 3 ? 1 : 0")).toContain("error:");
  });

  it("checks arity, and says which mistake was made", () => {
    expect(value("sqrt(1, 2)")).toContain("takes 1 value");
    expect(value("nope(2)")).toContain("no function called");
    expect(value("nope")).toContain("has no value");
  });

  it("reports rather than throws for the arithmetic that has no answer", () => {
    expect(value("1 / 0")).toContain("division by zero");
    expect(value("5!")).toBe(120);
    expect(value("(-1)!")).toContain("whole number");
    expect(value("200!")).toContain("larger than");
    expect(value("sqrt(-1)")).toContain("numeric answer");
  });

  it("never throws on an unfinished line", () => {
    for (const partial of ["2 +", "(", "sqrt(", "*", "", "   ", "2 + + "]) {
      expect(() => evaluate(partial)).not.toThrow();
      expect(evaluate(partial).ok).toBe(false);
    }
  });
});

describe("formatNumber", () => {
  it("hides floating-point dust without hiding real digits", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(1 / 3)).toBe("0.33333333333");
    expect(formatNumber(2.5)).toBe("2.5");
  });

  it("groups thousands, and can be asked not to", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(1234567, false)).toBe("1234567");
    expect(formatNumber(-4200)).toBe("-4,200");
  });

  it("falls back to an exponent only where the plain form is unreadable", () => {
    expect(formatNumber(1e20)).toBe("1e+20");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(Infinity)).toBe("∞");
    expect(formatNumber(NaN)).toBe("—");
  });
});

describe("tape", () => {
  it("adds up the plain lines and leaves assignments out of the total", () => {
    const tape = evaluateTape(["rate = 100", "40", "2 * 30"].join("\n"));
    expect(tape.total).toBe(100);
    expect(tape.counted).toBe(2);
    expect(tape.vars.rate).toBe(100);
  });

  it("lets a line use the names and the answer above it", () => {
    const tape = evaluateTape(["rate = 4200", "hours = 3", "rate * hours", "ans / 2"].join("\n"));
    expect(tape.lines[2].value).toBe(12600);
    expect(tape.lines[3].value).toBe(6300);
    expect(tape.last).toBe(6300);
  });

  it("cannot see a name defined below it", () => {
    const tape = evaluateTape(["total * 2", "total = 10"].join("\n"));
    expect(tape.lines[0].kind).toBe("error");
    expect(tape.lines[1].value).toBe(10);
  });

  it("keeps every other line when one is wrong — the whole point", () => {
    const tape = evaluateTape(["10", "2 +", "30"].join("\n"));
    expect(tape.lines.map((l) => l.kind)).toEqual(["value", "error", "value"]);
    expect(tape.total).toBe(40);
  });

  it("classifies blanks, whole-line comments and trailing comments", () => {
    const tape = evaluateTape(["# a heading", "", "12 * 2   // two of them", "// aside"].join("\n"));
    expect(tape.lines.map((l) => l.kind)).toEqual(["comment", "blank", "value", "comment"]);
    expect(tape.total).toBe(24);
  });

  it("does not mistake an assignment for a comparison", () => {
    const tape = evaluateTape("x == 2");
    expect(tape.lines[0].kind).toBe("error");
    expect(tape.vars.x).toBeUndefined();
  });
});

describe("bases — parsing and formatting", () => {
  it("reads a value in the selected base", () => {
    expect(parseInBase("1010", 2)).toBe(10n);
    expect(parseInBase("ff", 16)).toBe(255n);
    expect(parseInBase("777", 8)).toBe(511n);
    expect(parseInBase("42", 10)).toBe(42n);
  });

  it("lets an explicit prefix override the selected base", () => {
    expect(parseInBase("0xdead", 10)).toBe(57005n);
    expect(parseInBase("0b11", 16)).toBe(3n);
  });

  it("rejects digits the base does not have", () => {
    expect(parseInBase("12", 2)).toBeNull();
    expect(parseInBase("8", 8)).toBeNull();
    expect(parseInBase("g", 16)).toBeNull();
    expect(parseInBase("", 10)).toBeNull();
  });

  it("holds values a 32-bit signed integer could not", () => {
    const big = parseInBase("ffffffffffffffff", 16);
    expect(big).toBe(18446744073709551615n);
    expect(formatInBase(big!, 10)).toBe("18,446,744,073,709,551,615");
  });

  it("groups each base the way that base is read", () => {
    expect(formatInBase(255n, 2)).toBe("1111 1111");
    expect(formatInBase(0xdeadn, 16)).toBe("dead");
    expect(formatInBase(0xdeadbeefn, 16)).toBe("dead beef");
    expect(formatInBase(1234567n, 10)).toBe("1,234,567");
    expect(formatInBase(511n, 8)).toBe("777");
    expect(formatInBase(-255n, 16)).toBe("-ff");
  });
});

describe("bases — widths and two's complement", () => {
  it("reads the same bits as signed or unsigned", () => {
    expect(toWidth(255n, 8, false)).toBe(255n);
    expect(toWidth(255n, 8, true)).toBe(-1n);
    expect(toWidth(-1n, 8, false)).toBe(255n);
    expect(toWidth(128n, 8, true)).toBe(-128n);
    expect(toWidth(127n, 8, true)).toBe(127n);
  });

  it("wraps rather than rejects, as the hardware does", () => {
    expect(toWidth(256n, 8, false)).toBe(0n);
    expect(toWidth(300n, 8, false)).toBe(44n);
    expect(overflows(256n, 8, false)).toBe(true);
    expect(overflows(255n, 8, false)).toBe(false);
  });

  it("lays the bits out most significant first, always the full width", () => {
    expect(bitsOf(5n, 8)).toEqual([0, 0, 0, 0, 0, 1, 0, 1]);
    expect(bitsOf(-1n, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(bitsOf(1n, 32)).toHaveLength(32);
    expect(popCount(0xffn, 16)).toBe(8);
  });
});

describe("bases — bitwise, at the chosen width rather than 32-bit signed", () => {
  it("keeps NOT inside the width", () => {
    expect(applyBitOp("not", 0n, 0n, 8)).toBe(255n);
    expect(applyBitOp("not", 0n, 0n, 16)).toBe(65535n);
  });

  it("gets right what JavaScript's own operators get wrong", () => {
    // `0xffffffff | 0` is -1 in JavaScript: the operands are coerced to 32-bit
    // signed. Above 32 bits it is worse — the value is simply truncated.
    expect(applyBitOp("or", 0xffffffffn, 0n, 64)).toBe(4294967295n);
    expect(applyBitOp("and", 0xff00ff00ff00n, 0xffff0000ffffn, 64)).toBe(0xff000000ff00n);
    expect(applyBitOp("shl", 1n, 40n, 64)).toBe(1099511627776n);
  });

  it("loses bits shifted off the top, and clamps an absurd distance", () => {
    expect(applyBitOp("shl", 0x81n, 1n, 8)).toBe(2n);
    expect(applyBitOp("shr", 1n, 1n, 8)).toBe(0n);
    expect(applyBitOp("shl", 1n, 999n, 8)).toBe(0n);
    expect(applyBitOp("shl", 1n, -4n, 8)).toBe(1n);
  });
});

describe("percent", () => {
  it("takes a percentage of a value", () => {
    expect(answerPercent("of", 18, 2400)?.value).toBe(432);
  });

  it("finds what percentage one value is of another", () => {
    expect(answerPercent("share", 30, 120)?.value).toBe(25);
    expect(answerPercent("share", 1, 0)).toBeNull();
  });

  it("measures a change against where it started", () => {
    expect(answerPercent("change", 200, 100)?.value).toBe(-50);
    expect(answerPercent("change", 100, 200)?.value).toBe(100);
    expect(answerPercent("change", 0, 5)).toBeNull();
  });

  it("reverses an inclusive figure by dividing, not by subtracting", () => {
    // 118 including 18% was 100 — not 118 − 18% of 118, which is 96.76 and is
    // the mistake this question exists to prevent.
    expect(answerPercent("reverse", 118, 18)?.value).toBeCloseTo(100);
    expect(answerPercent("reverse", 118, 18)?.value).not.toBeCloseTo(96.76);
    expect(answerPercent("reverse", 90, -10)?.value).toBeCloseTo(100);
    expect(answerPercent("reverse", 50, -100)).toBeNull();
  });

  it("has no answer where the inputs are not numbers", () => {
    expect(answerPercent("of", NaN, 10)).toBeNull();
    expect(answerPercent("of", 10, Infinity)).toBeNull();
  });
});
