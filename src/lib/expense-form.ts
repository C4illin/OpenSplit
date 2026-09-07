export const expenseFormDefaults = {
  title: "",
  amount: "",
  currency: "sek",
  date: "",
  paidBy: "",
  splits: [] as { user: string; percentage: number }[],
  excluded: [] as string[],
  category: "",
  project: "",
};
