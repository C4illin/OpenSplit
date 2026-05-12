export const expenseFormDefaults = {
  title: "",
  amount: "",
  currency: "SEK",
  date: "",
  paidBy: "",
  splits: [] as { user: string; percentage: number }[],
  excluded: [] as string[],
};
