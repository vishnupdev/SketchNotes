/**
 * Splitting a bill.
 *
 * The interesting part is not the division, it is the remainder. A ₹100 bill three
 * ways is 33.33 each, which totals 99.99 — and a splitter that shows three equal
 * shares is quietly asking someone to eat the difference without saying who. This
 * module assigns every last minor unit explicitly, and reports who got the extra.
 *
 * Same integer-minor-units rule as `types.ts`, for the same reason.
 */

export interface Payer {
  id: string;
  name: string;
  /** What this person actually paid, in minor units. */
  paid: number;
  /** Relative weight of their share. 1 is an equal split. */
  shares: number;
}

export interface Settlement {
  /** Who pays. */
  from: string;
  /** Who receives. */
  to: string;
  amount: number;
}

export interface SplitResult {
  total: number;
  /** Each person's fair share, summing exactly to `total`. */
  owed: Record<string, number>;
  /** Positive = they are owed money; negative = they owe. */
  balance: Record<string, number>;
  /** The fewest transfers that settle everyone up. */
  settlements: Settlement[];
  /** Ids that absorbed a leftover minor unit, so the UI can say so. */
  roundedUp: string[];
}

/**
 * Work out who owes whom.
 *
 * Shares are distributed largest-remainder: give everyone the floor of their
 * exact share, then hand the leftover units one at a time to whoever was cut
 * hardest by the rounding. That is the method that keeps the parts summing to the
 * whole *and* spreads the unavoidable extra fairly, rather than always landing it
 * on whoever happens to be first in the list.
 *
 * Settlements are then greedy: repeatedly match the largest debtor against the
 * largest creditor. For a group bill this produces the minimum number of
 * transfers — at most one fewer than the number of people.
 */
export function splitBill(payers: Payer[], totalOverride?: number): SplitResult {
  const paidTotal = payers.reduce((n, p) => n + Math.max(0, Math.round(p.paid)), 0);
  const total = totalOverride !== undefined ? Math.max(0, Math.round(totalOverride)) : paidTotal;

  const weights = payers.map((p) => Math.max(0, p.shares));
  const weightTotal = weights.reduce((n, w) => n + w, 0);

  const owed: Record<string, number> = {};
  const roundedUp: string[] = [];

  if (weightTotal === 0 || total === 0) {
    for (const p of payers) owed[p.id] = 0;
  } else {
    // Floor everyone's exact share, remembering the fraction each lost.
    const exact = payers.map((p, i) => (total * weights[i]) / weightTotal);
    const floors = exact.map(Math.floor);
    const assigned = floors.reduce((n, f) => n + f, 0);

    payers.forEach((p, i) => {
      owed[p.id] = floors[i];
    });

    // Hand out the leftover units to the largest fractional parts first.
    const order = payers
      .map((p, i) => ({ id: p.id, fraction: exact[i] - floors[i] }))
      .sort((a, b) => b.fraction - a.fraction);

    let leftover = total - assigned;
    let cursor = 0;
    while (leftover > 0 && order.length > 0) {
      const { id } = order[cursor % order.length];
      owed[id] += 1;
      roundedUp.push(id);
      leftover -= 1;
      cursor += 1;
    }
  }

  const balance: Record<string, number> = {};
  for (const p of payers) balance[p.id] = Math.max(0, Math.round(p.paid)) - owed[p.id];

  // Greedy settlement. Copies the balances so the originals stay reportable.
  const creditors = payers
    .filter((p) => balance[p.id] > 0)
    .map((p) => ({ id: p.id, amount: balance[p.id] }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = payers
    .filter((p) => balance[p.id] < 0)
    .map((p) => ({ id: p.id, amount: -balance[p.id] }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    if (amount > 0) {
      settlements.push({ from: debtors[di].id, to: creditors[ci].id, amount });
      creditors[ci].amount -= amount;
      debtors[di].amount -= amount;
    }
    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }

  return { total, owed, balance, settlements, roundedUp };
}
