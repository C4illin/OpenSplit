/// <reference path="../pb_data/types.d.ts" />

// Caches the ECB euro reference rates in the `rates` collection as one snapshot
// row per publish date. The frontend reads the newest snapshot on or before an
// expense's date to lock in a conversion.
//
// ECB publishes ~16:00 CET on TARGET business days (no weekends/holidays), so
// the cron runs a few times in that window on weekdays; upserts are idempotent.
//
// The fetch logic lives in ./ecbRates.js and is require()'d inside each handler
// because handlers run in an isolated context and cannot see top-level
// functions defined in this file.

// On a fresh install the `rates` table is empty until the next cron tick, which
// blocks cross-currency expenses. Pull one snapshot on startup if none exists.
// Guarded so restarts are cheap and a network hiccup never blocks boot.
onBootstrap((e) => {
  e.next(); // let core startup finish before touching the DB
  try {
    if ($app.countRecords("rates") === 0) {
      const { fetchAndStoreRates } = require(`${__hooks}/ecbRates.js`);
      const result = fetchAndStoreRates($app);
      $app.logger().info("Fetched initial ECB rates", "date", result.date, "count", result.count);
    }
  } catch (err) {
    $app.logger().error("Failed to fetch initial ECB rates", "error", String(err));
  }
});

cronAdd("ecb-rates", "0 15,16,17 * * 1-5", () => {
  const { fetchAndStoreRates } = require(`${__hooks}/ecbRates.js`);
  try {
    const result = fetchAndStoreRates($app);
    $app.logger().info("Stored ECB rates", "date", result.date, "currencies", result.count);
  } catch (err) {
    $app.logger().error("Failed to fetch ECB rates", "error", String(err));
  }
});

// Manual trigger (superuser only) — useful for the initial fill before the
// first cron tick, or to backfill after an outage.
routerAdd(
  "POST",
  "/api/rates/refresh",
  (e) => {
    const { fetchAndStoreRates } = require(`${__hooks}/ecbRates.js`);
    try {
      const result = fetchAndStoreRates(e.app);
      return e.json(200, result);
    } catch (err) {
      // Surface the real reason instead of PocketBase's generic 400.
      return e.json(500, { error: String(err) });
    }
  },
  $apis.requireSuperuserAuth(),
);
