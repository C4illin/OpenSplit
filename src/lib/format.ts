export function formatAmount(amount: number, currency: string) {
  // Currency ids are stored lowercase (they double as PocketBase record ids);
  // Intl expects an ISO 4217 code, so normalize to uppercase.
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      trailingZeroDisplay: "stripIfInteger",
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}
