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
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.amount;
    const expenseSplits = splits.filter((s) => s.expense === expense.id);
    for (const split of expenseSplits) {
      const owed = (split.percentage / 100) * expense.amount;
      net[split.user] = (net[split.user] ?? 0) - owed;
    }
  }

  for (const s of settlements) {
    if (!s.from || !s.to) continue;
    net[s.from] = (net[s.from] ?? 0) + s.amount;
    net[s.to] = (net[s.to] ?? 0) - s.amount;
  }

  return members.map((m) => ({
    member: m,
    balance: Math.round((net[m.id] ?? 0) * 100) / 100,
  }));
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
