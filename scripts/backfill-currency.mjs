// One-off backfill: point every existing group/expense/settlement at the SEK
// currency record, and lock each expense's baseAmount to its amount (all legacy
// data is already in SEK, the default base currency). Idempotent: only touches
// records that are missing the value.
//
// Run AFTER seed-currencies.mjs (the `sek` record must exist) and after adding
// the `expenses.baseAmount` field.
//
// Usage:
//   PB_ADMIN_EMAIL=you@example.com PB_ADMIN_PASSWORD=secret \
//     node scripts/backfill-currency.mjs

import PocketBase from "pocketbase";

const BASE = "sek";
const url = process.env.PB_URL ?? "http://localhost:8090";
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD env vars.");
  process.exit(1);
}

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection("_superusers").authWithPassword(email, password);

async function backfill(collection, build) {
  const records = await pb.collection(collection).getFullList();
  let touched = 0;
  for (const r of records) {
    const patch = build(r);
    if (patch && Object.keys(patch).length > 0) {
      await pb.collection(collection).update(r.id, patch);
      touched++;
    }
  }
  console.log(`${collection}: updated ${touched}/${records.length}`);
}

await backfill("groups", (r) => (r.currency ? null : { currency: BASE }));
await backfill("settlements", (r) => (r.currency ? null : { currency: BASE }));
await backfill("expenses", (r) => {
  const patch = {};
  if (!r.currency) patch.currency = BASE;
  if (r.baseAmount == null || r.baseAmount === 0) patch.baseAmount = r.amount;
  return patch;
});

console.log("Backfill complete.");
