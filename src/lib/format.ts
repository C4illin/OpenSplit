export function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      trailingZeroDisplay: "stripIfInteger",
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
