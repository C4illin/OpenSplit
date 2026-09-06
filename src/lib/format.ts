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

/**
 * Format a bare `yyyy-mm-dd` day (e.g. an ECB rate date) for display. Parsed as
 * UTC by spec and formatted in UTC so it never shifts a day in western timezones.
 */
export function formatDay(isoDay: string) {
  const parsed = Date.parse(isoDay.slice(0, 10));
  if (isNaN(parsed)) return isoDay;
  return new Date(parsed).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" });
}
