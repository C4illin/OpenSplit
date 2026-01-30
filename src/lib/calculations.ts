import type { Expense, Person, Settlement } from "../types";

interface PersonBalance {
  personId: string;
  name: string;
  balance: number; // positive = owed money, negative = owes money
}

export function calculateBalances(
  expenses: Expense[],
  people: Map<string, Person>,
): PersonBalance[] {
  const balances = new Map<string, { name: string; balance: number }>();

  // Initialize all people with zero balance
  people.forEach((person) => {
    balances.set(person.id, { name: person.name, balance: 0 });
  });

  // Process expenses
  expenses.forEach((expense) => {
    const paidByPerson = balances.get(expense.paidBy);
    if (paidByPerson) {
      paidByPerson.balance += expense.amount;
    }

    const splitAmount = expense.amount / expense.splitAmong.length;
    expense.splitAmong.forEach((personId) => {
      const person = balances.get(personId);
      if (person) {
        person.balance -= splitAmount;
      }
    });
  });

  return Array.from(balances.entries()).map(([personId, data]) => ({
    personId,
    name: data.name,
    balance: data.balance,
  }));
}

export function calculateSettlements(balances: PersonBalance[]): Settlement[] {
  const settlements: Settlement[] = [];
  const debtors = balances
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.balance - b.balance);
  const creditors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

    settlements.push({
      from: debtor.personId,
      to: creditor.personId,
      amount: parseFloat(amount.toFixed(2)),
    });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) debtorIdx++;
    if (creditor.balance < 0.01) creditorIdx++;
  }

  return settlements;
}
