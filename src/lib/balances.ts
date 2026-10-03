import type {
  ExpensesResponse,
  SettlementsResponse,
  SplitsResponse,
  UsersResponse,
} from "@/types/pocketbase-types.gen";

export type Balance = {
  member: UsersResponse;
  balance: number;
};

export type Settlement = {
  from: UsersResponse;
  to: UsersResponse;
  amount: number;
};

const EPSILON = 0.005;

export function computeBalances(
  members: UsersResponse[],
  expenses: ExpensesResponse[],
  splits: SplitsResponse[],
  settlements: SettlementsResponse[] = [],
): Balance[] {
  const net: Record<string, number> = {};
  for (const m of members) net[m.id] = 0;

  for (const expense of expenses) {
    // Balances are tracked in the group's base currency: every expense stores a
    // baseAmount locked at the rate when it was added. Fall back to amount for
    // any legacy row that predates the conversion field.
    const total = expense.baseAmount || expense.amount;
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + total;
    const expenseSplits = splits.filter((s) => s.expense === expense.id);
    // Normalize by the actual percentage total so the expense is always fully
    // allocated, even when stored percentages don't sum to exactly 100 (a 3-way
    // split stores 33.33 x3 = 99.99, which would otherwise leave a sliver
    // permanently owed to the payer).
    const totalPct = expenseSplits.reduce((sum, s) => sum + s.percentage, 0);
    if (totalPct === 0) continue;
    const divisor = Math.abs(totalPct - 100) < 1e-6 ? 100 : totalPct;
    for (const split of expenseSplits) {
      const owed = (split.percentage / divisor) * total;
      net[split.user] = (net[split.user] ?? 0) - owed;
    }
  }

  for (const s of settlements) {
    if (!s.from || !s.to) continue;
    net[s.from] = (net[s.from] ?? 0) + s.amount;
    net[s.to] = (net[s.to] ?? 0) - s.amount;
  }

  return roundToZeroSum(members, net);
}

// Round each member's balance to whole öre while preserving the invariant that
// all balances sum to exactly zero. Rounding each balance independently breaks
// that invariant and leaves an unpayable remainder in computeSettlements, so we
// distribute the rounding drift via the largest-remainder method.
function roundToZeroSum(members: UsersResponse[], net: Record<string, number>): Balance[] {
  const entries = members.map((m) => {
    const exactOre = Math.round((net[m.id] ?? 0) * 100 * 1e8) / 1e8;
    const floorOre = Math.floor(exactOre);
    return { member: m, ore: floorOre, frac: exactOre - floorOre };
  });

  const totalExactOre = members.reduce((sum, m) => sum + (net[m.id] ?? 0) * 100, 0);
  const sumFloorOre = entries.reduce((sum, e) => sum + e.ore, 0);
  const remainder = Math.round(totalExactOre) - sumFloorOre;

  // Hand the leftover öre to the balances with the largest fractional parts.
  const order = entries.map((_, i) => i).sort((a, b) => entries[b].frac - entries[a].frac);
  for (let k = 0; k < remainder; k++) {
    entries[order[k % order.length]].ore += 1;
  }

  return entries.map((e) => ({ member: e.member, balance: e.ore / 100 }));
}

export function computeSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.balance > EPSILON)
    .map((b) => ({ member: b.member, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balances
    .filter((b) => b.balance < -EPSILON)
    .map((b) => ({ member: b.member, remaining: -b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].remaining, creditors[j].remaining);
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0) {
      result.push({
        from: debtors[i].member,
        to: creditors[j].member,
        amount: rounded,
      });
    }
    debtors[i].remaining -= amount;
    creditors[j].remaining -= amount;
    if (debtors[i].remaining < EPSILON) i++;
    if (creditors[j].remaining < EPSILON) j++;
  }
  return result;
}
