/// <reference path="../pb_data/types.d.ts" />

// Turns due `recurring_expenses` templates into regular expenses (plus splits
// and notifications). The logic lives in ./recurring.js — see there for the
// data model — and is require()'d inside each handler because handlers run in
// isolated contexts that cannot see top-level functions of this file.
//
// Runs hourly: templates are compared against "now", so the exact hour does
// not matter, and hourly keeps the delay after a restart or an outage short.
// The scheduler timezone is pinned to Europe/Berlin in exchangeRates.pb.js.
cronAdd("recurring-expenses", "5 * * * *", () => {
  const { materializeDueRecurringExpenses } = require(`${__hooks}/recurring.js`);
  try {
    const result = materializeDueRecurringExpenses($app);
    if (result.due > 0) {
      $app
        .logger()
        .info(
          "Processed recurring expenses",
          "due",
          result.due,
          "created",
          result.created,
          "failed",
          result.failed,
        );
    }
  } catch (err) {
    $app.logger().error("Failed to process recurring expenses", "error", String(err));
  }
});

// Manual trigger (superuser only) — useful to test a schedule without waiting
// for the next tick, or to catch up right after an outage.
routerAdd(
  "POST",
  "/api/recurring/run",
  (e) => {
    const { materializeDueRecurringExpenses } = require(`${__hooks}/recurring.js`);
    try {
      return e.json(200, materializeDueRecurringExpenses(e.app));
    } catch (err) {
      return e.json(500, { error: String(err) });
    }
  },
  $apis.requireSuperuserAuth(),
);
