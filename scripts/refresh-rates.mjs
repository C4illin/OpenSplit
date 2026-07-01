// Trigger an immediate ECB rate fetch via the hook's /api/rates/refresh route,
// so the cache has today's snapshot before the first scheduled cron run.
// Requires PocketBase to be running with the exchangeRates.pb.js hook loaded.
//
// Usage:
//   PB_ADMIN_EMAIL=you@example.com PB_ADMIN_PASSWORD=secret \
//     node scripts/refresh-rates.mjs

import PocketBase from "pocketbase";

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

const result = await pb.send("/api/rates/refresh", { method: "POST" });
console.log(`Stored ECB rates for ${result.date} (${result.count} currencies).`);
