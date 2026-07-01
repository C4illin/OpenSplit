/// <reference path="../pb_data/types.d.ts" />

// Seeds the `currencies` collection with the EUR + ECB currency set. Every
// group/expense/settlement relates to a currency record, so a fresh install is
// unusable until these exist. Idempotent: skips ids that are already present,
// so it's safe on existing databases and safe to re-run.
//
// Generated from src/lib/currencies.ts — keep the two in sync if the set changes.

const CURRENCIES = [
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

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("currencies");
    for (const c of CURRENCIES) {
      try {
        app.findRecordById("currencies", c.id);
        continue; // already seeded — leave it untouched
      } catch {
        // not found — create it below
      }
      const record = new Record(collection);
      record.setId(c.id);
      record.set("name", c.name);
      record.set("symbol", c.symbol);
      record.set("decimals", c.decimals);
      app.save(record);
    }
  },
  (app) => {
    for (const c of CURRENCIES) {
      try {
        app.delete(app.findRecordById("currencies", c.id));
      } catch {
        // already gone
      }
    }
  },
);
