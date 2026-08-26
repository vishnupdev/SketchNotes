import { describe, expect, it } from "vitest";
import { splitBill, type Payer } from "./split";
import { dayKey, formatAmount, groupByDay, parseAmount, shiftMonth, summarizeMonth, type Expense } from "./types";

/**
 * Wallet.
 *
 * Money code fails silently, which is why it is tested here and the UI is not. A
 * lost minor unit does not throw — it produces a total that is slightly wrong and
 * indistinguishable from a mis-remembered purchase. The cases below are the three
 * places that happens: parsing a typed amount, rounding a split, and rolling up a
 * month.
 */

const expense = (over: Partial<Expense>): Expense => ({
  id: Math.random().toString(36).slice(2),
  amount: 1000,
  categoryId: "food",
  note: "",
  day: "2026-08-10",
  createdAt: 1,
  income: false,
  ...over,
});

describe("parseAmount", () => {
  it("reads plain and decimal amounts as minor units", () => {
    expect(parseAmount("12")).toBe(1200);
    expect(parseAmount("12.5")).toBe(1250);
    expect(parseAmount("12.50")).toBe(1250);
    expect(parseAmount("0.99")).toBe(99);
  });

  it("tolerates separators from a paste", () => {
    expect(parseAmount("1,250.75")).toBe(125075);
    expect(parseAmount(" 40 ")).toBe(4000);
  });

  it("rounds a third decimal rather than truncating it away", () => {
    expect(parseAmount("12.999")).toBe(1300);
    expect(parseAmount("12.994")).toBe(1299);
  });

  it("rejects zero, negatives and nonsense", () => {
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(".")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("formatAmount", () => {
  it("drops the decimals on a whole amount and keeps them otherwise", () => {
    // Locale decides the symbol and separators; the decimal count is ours.
    expect(formatAmount(1000, "USD")).not.toMatch(/\.00/);
    expect(formatAmount(1250, "USD")).toMatch(/\.5/);
  });
});

describe("splitBill", () => {
  it("splits evenly when it divides evenly", () => {
    const payers: Payer[] = [
      { id: "a", name: "A", paid: 9000, shares: 1 },
      { id: "b", name: "B", paid: 0, shares: 1 },
      { id: "c", name: "C", paid: 0, shares: 1 },
    ];
    const r = splitBill(payers);
    expect(r.total).toBe(9000);
    expect(r.owed).toEqual({ a: 3000, b: 3000, c: 3000 });
    expect(r.roundedUp).toEqual([]);
  });

  it("assigns every leftover unit, so the shares sum to the total exactly", () => {
    // 10000 three ways is 3333.33 each — one unit has to go somewhere.
    const payers: Payer[] = [
      { id: "a", name: "A", paid: 10000, shares: 1 },
      { id: "b", name: "B", paid: 0, shares: 1 },
      { id: "c", name: "C", paid: 0, shares: 1 },
    ];
    const r = splitBill(payers);
    const sum = Object.values(r.owed).reduce((n, v) => n + v, 0);
    expect(sum).toBe(10000);
    expect(r.roundedUp).toHaveLength(1);
  });

  it("weights unequal shares", () => {
    const payers: Payer[] = [
      { id: "a", name: "A", paid: 12000, shares: 2 },
      { id: "b", name: "B", paid: 0, shares: 1 },
    ];
    const r = splitBill(payers);
    expect(r.owed).toEqual({ a: 8000, b: 4000 });
    expect(r.balance).toEqual({ a: 4000, b: -4000 });
  });

  it("settles in the fewest transfers, and they balance out", () => {
    const payers: Payer[] = [
      { id: "a", name: "A", paid: 6000, shares: 1 },
      { id: "b", name: "B", paid: 3000, shares: 1 },
      { id: "c", name: "C", paid: 0, shares: 1 },
    ];
    const r = splitBill(payers);
    // Three people, so at most two transfers.
    expect(r.settlements.length).toBeLessThanOrEqual(2);
    for (const p of payers) {
      const out = r.settlements.filter((s) => s.from === p.id).reduce((n, s) => n + s.amount, 0);
      const inward = r.settlements.filter((s) => s.to === p.id).reduce((n, s) => n + s.amount, 0);
      // Everyone ends square: transfers cancel their balance exactly.
      expect(inward - out).toBe(r.balance[p.id]);
    }
  });

  it("needs no transfers when everyone already paid their share", () => {
    const payers: Payer[] = [
      { id: "a", name: "A", paid: 2500, shares: 1 },
      { id: "b", name: "B", paid: 2500, shares: 1 },
    ];
    expect(splitBill(payers).settlements).toEqual([]);
  });

  it("accepts a total that differs from what was paid so far", () => {
    const payers: Payer[] = [
      { id: "a", name: "A", paid: 0, shares: 1 },
      { id: "b", name: "B", paid: 0, shares: 1 },
    ];
    const r = splitBill(payers, 5000);
    expect(r.total).toBe(5000);
    expect(r.owed).toEqual({ a: 2500, b: 2500 });
  });

  it("does not divide by zero when nobody has a share", () => {
    const r = splitBill([{ id: "a", name: "A", paid: 100, shares: 0 }]);
    expect(r.owed.a).toBe(0);
  });
});

describe("summarizeMonth", () => {
  const expenses: Expense[] = [
    expense({ amount: 2000, categoryId: "food", day: "2026-08-01" }),
    expense({ amount: 3000, categoryId: "food", day: "2026-08-02" }),
    expense({ amount: 5000, categoryId: "bills", day: "2026-08-03" }),
    expense({ amount: 90000, categoryId: "income", day: "2026-08-01", income: true }),
    // A different month, which must not leak in.
    expense({ amount: 7000, categoryId: "food", day: "2026-07-30" }),
  ];

  it("totals spending and income separately", () => {
    const s = summarizeMonth(expenses, "2026-08");
    expect(s.spent).toBe(10000);
    expect(s.earned).toBe(90000);
    expect(s.net).toBe(80000);
    expect(s.count).toBe(4);
  });

  it("ranks categories by spend and gives each a share", () => {
    const s = summarizeMonth(expenses, "2026-08");
    expect(s.byCategory[0].category.id).toBe("food");
    expect(s.byCategory[0].total).toBe(5000);
    expect(s.byCategory[0].share).toBeCloseTo(0.5);
    // Income is not a spending category and must not appear in the breakdown.
    expect(s.byCategory.some((c) => c.category.id === "income")).toBe(false);
  });

  it("keeps other months out", () => {
    expect(summarizeMonth(expenses, "2026-07").spent).toBe(7000);
  });

  it("divides a past month by its real length", () => {
    // July 2026 has 31 days; 7000 over 31 is 225.8, rounded to 226.
    expect(summarizeMonth(expenses, "2026-07").perDay).toBe(226);
  });
});

describe("groupByDay", () => {
  it("groups newest day first and nets income against spending", () => {
    const groups = groupByDay([
      expense({ amount: 1000, day: "2026-08-01" }),
      expense({ amount: 2000, day: "2026-08-02" }),
      expense({ amount: 500, day: "2026-08-02", income: true }),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-08-02", "2026-08-01"]);
    expect(groups[0].total).toBe(1500);
    expect(groups[0].items).toHaveLength(2);
  });
});

describe("date keys", () => {
  it("writes a local day key, not a UTC one", () => {
    expect(dayKey(new Date(2026, 7, 5))).toBe("2026-08-05");
  });

  it("steps months across a year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
