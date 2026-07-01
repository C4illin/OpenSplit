// Seed the `currencies` collection with the EUR + ECB currency set, using the
// lowercase ISO code as each record id. Idempotent: updates existing rows.
//
// Usage:
//   PB_ADMIN_EMAIL=you@example.com PB_ADMIN_PASSWORD=secret \
//     node scripts/seed-currencies.mjs
//
// Optional: PB_URL (defaults to http://localhost:8090).

import PocketBase from "pocketbase";
import { CURRENCIES } from "../src/lib/currencies.ts";

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

let created = 0;
let updated = 0;

for (const c of CURRENCIES) {
  const data = { name: c.name, symbol: c.symbol, decimals: c.decimals };
  try {
    await pb.collection("currencies").getOne(c.id);
    await pb.collection("currencies").update(c.id, data);
    updated++;
  } catch (err) {
    if (err?.status === 404) {
      await pb.collection("currencies").create({ id: c.id, ...data });
      created++;
    } else {
      throw err;
    }
  }
}

console.log(`Seeded currencies: ${created} created, ${updated} updated.`);
