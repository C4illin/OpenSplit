import { currencyDecimals } from "@/lib/currencies";
import type { RatesResponse } from "@/types/pocketbase-types.gen";

// A daily snapshot of ECB euro reference rates, keyed by lowercase currency id
// (matching the `currencies` record ids). Each value is units-per-EUR, e.g.
// { eur: 1, usd: 1.08, sek: 11.2 }. EUR is always present with value 1.
export type RatesMap = Record<string, number>;

export type DatedRates = { date: string; rates: RatesMap };

function roundTo(amount: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

/**
 * Pick the newest rate snapshot on or before `date` (ISO yyyy-mm-dd). ECB does
 * not publish on weekends/holidays, so the matching row is often a day or more
 * earlier than the expense date. Returns null if no snapshot qualifies.
 */
export function ratesForDate(rows: RatesResponse[], date: string): DatedRates | null {
  const day = date.slice(0, 10);
  let best: RatesResponse | null = null;
  for (const row of rows) {
    const rowDay = row.date.slice(0, 10);
    if (rowDay <= day && (!best || rowDay > best.date.slice(0, 10))) {
      best = row;
    }
  }
  if (!best) return null;
  return { date: best.date.slice(0, 10), rates: (best.rates ?? {}) as RatesMap };
}

/**
 * Convert `amount` from one currency to another via the EUR-based snapshot.
 * Both ids are lowercase currency codes. Result is rounded to the destination
 * currency's minor units. Returns null if either rate is missing.
 */
export function convert(amount: number, from: string, to: string, map: RatesMap): number | null {
  if (from === to) return roundTo(amount, currencyDecimals(to));
  const rateFrom = from === "eur" ? 1 : map[from];
  const rateTo = to === "eur" ? 1 : map[to];
  if (!rateFrom || !rateTo) return null;
  return roundTo((amount * rateTo) / rateFrom, currencyDecimals(to));
}
