// Canonical currency metadata. The record `id` in the PocketBase `currencies`
// collection IS the lowercase ISO 4217 code (e.g. "sek"), so a currency
// relation value can be uppercased and passed straight to Intl.NumberFormat
// and used as the key into a daily `rates` snapshot.
//
// The set mirrors the ECB euro reference rates feed (eurofxref-daily.xml) plus
// EUR itself (the base, always rate 1). `decimals` follows ISO 4217 minor units
// and is used when rounding converted amounts.

export type CurrencyMeta = {
  /** Lowercase ISO 4217 code — used as the PocketBase record id. */
  id: string;
  /** Human-readable name shown in the picker. */
  name: string;
  /** Display symbol (fallback only; Intl handles formatting). */
  symbol: string;
  /** ISO 4217 minor units. */
  decimals: number;
};

export const CURRENCIES: CurrencyMeta[] = [
  { id: "eur", name: "Euro", symbol: "€", decimals: 2 },
  { id: "usd", name: "US Dollar", symbol: "$", decimals: 2 },
  { id: "jpy", name: "Japanese Yen", symbol: "¥", decimals: 0 },
  { id: "bgn", name: "Bulgarian Lev", symbol: "лв", decimals: 2 },
  { id: "czk", name: "Czech Koruna", symbol: "Kč", decimals: 2 },
  { id: "dkk", name: "Danish Krone", symbol: "kr", decimals: 2 },
  { id: "gbp", name: "Pound Sterling", symbol: "£", decimals: 2 },
  { id: "huf", name: "Hungarian Forint", symbol: "Ft", decimals: 2 },
  { id: "pln", name: "Polish Złoty", symbol: "zł", decimals: 2 },
  { id: "ron", name: "Romanian Leu", symbol: "lei", decimals: 2 },
  { id: "sek", name: "Swedish Krona", symbol: "kr", decimals: 2 },
  { id: "chf", name: "Swiss Franc", symbol: "Fr", decimals: 2 },
  { id: "isk", name: "Icelandic Króna", symbol: "kr", decimals: 0 },
  { id: "nok", name: "Norwegian Krone", symbol: "kr", decimals: 2 },
  { id: "try", name: "Turkish Lira", symbol: "₺", decimals: 2 },
  { id: "aud", name: "Australian Dollar", symbol: "$", decimals: 2 },
  { id: "brl", name: "Brazilian Real", symbol: "R$", decimals: 2 },
  { id: "cad", name: "Canadian Dollar", symbol: "$", decimals: 2 },
  { id: "cny", name: "Chinese Yuan", symbol: "¥", decimals: 2 },
  { id: "hkd", name: "Hong Kong Dollar", symbol: "$", decimals: 2 },
  { id: "idr", name: "Indonesian Rupiah", symbol: "Rp", decimals: 2 },
  { id: "ils", name: "Israeli New Shekel", symbol: "₪", decimals: 2 },
  { id: "inr", name: "Indian Rupee", symbol: "₹", decimals: 2 },
  { id: "krw", name: "South Korean Won", symbol: "₩", decimals: 0 },
  { id: "mxn", name: "Mexican Peso", symbol: "$", decimals: 2 },
  { id: "myr", name: "Malaysian Ringgit", symbol: "RM", decimals: 2 },
  { id: "nzd", name: "New Zealand Dollar", symbol: "$", decimals: 2 },
  { id: "php", name: "Philippine Peso", symbol: "₱", decimals: 2 },
  { id: "sgd", name: "Singapore Dollar", symbol: "$", decimals: 2 },
  { id: "thb", name: "Thai Baht", symbol: "฿", decimals: 2 },
  { id: "zar", name: "South African Rand", symbol: "R", decimals: 2 },
];

export const CURRENCY_BY_ID: Record<string, CurrencyMeta> = Object.fromEntries(
  CURRENCIES.map((c) => [c.id, c]),
);

/** Minor-unit count for a currency id, defaulting to 2 for unknown codes. */
export function currencyDecimals(id: string): number {
  return CURRENCY_BY_ID[id]?.decimals ?? 2;
}
