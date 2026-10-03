/// <reference path="../pb_data/types.d.ts" />

// Shared logic for recurring expenses. Kept in a plain (non-".pb.js") module so
// PocketBase does not auto-register it as a hook; it is require()'d from the
// cron/route handlers in recurringExpenses.pb.js because each handler runs in
// an isolated context and cannot see top-level functions of a hook file.
//
// A `recurring_expenses` record is a template: title, amount, currency, payer,
// category and a schedule (`frequency` stepped every `interval` units,
// `nextDate`, optional `endDate`, `active`; a missing/zero `interval` means 1).
// Its shares are `recurring_splits` rows (`recurring`, `user`, `percentage`),
// mirroring how `splits` rows belong to an expense. Whenever `nextDate`
// is due, materialize() turns it into a regular `expenses` row (plus `splits`
// rows) that behaves exactly like a manually added expense, then advances
// `nextDate`. Balances only ever look at `expenses`, so the template itself
// never affects them.

const DAY_MS = 24 * 60 * 60 * 1000;

// Upper bound on occurrences created per template per run. Bounds the work
// after long downtime; anything left is picked up on the next tick.
const MAX_CATCH_UP = 24;

// Parse a PocketBase date string ("2026-09-06 00:00:00.000Z") or an ISO string.
function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return isNaN(date.getTime()) ? null : date;
}

// Format a Date in PocketBase's default date layout.
function formatDate(date) {
  return date.toISOString().replace("T", " ");
}

// Calendar day (UTC) as "yyyy-mm-dd". Schedules are compared by day, not instant.
function dayOf(date) {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * The occurrence `interval` units (weeks/months/years) after `current`.
 * `anchor` is the day the schedule was created on and supplies the
 * day-of-month: a monthly expense anchored on the 31st lands on the 30th/28th
 * in short months but returns to the 31st afterwards, instead of drifting
 * earlier for good. All math is in UTC calendar days.
 * Returns null for an unknown frequency.
 */
function nextOccurrence(current, anchor, frequency, interval) {
  const step = Number.isInteger(interval) && interval >= 1 ? interval : 1;
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const time = [current.getUTCHours(), current.getUTCMinutes(), current.getUTCSeconds()];
  const anchorDay = anchor.getUTCDate();

  switch (frequency) {
    case "weekly":
      return new Date(current.getTime() + 7 * step * DAY_MS);
    case "monthly": {
      const total = month + step;
      const nextYear = year + Math.floor(total / 12);
      const nextMonth = total % 12;
      const day = Math.min(anchorDay, daysInMonth(nextYear, nextMonth));
      return new Date(Date.UTC(nextYear, nextMonth, day, ...time));
    }
    case "yearly": {
      const nextYear = year + step;
      const day = Math.min(anchorDay, daysInMonth(nextYear, month));
      return new Date(Date.UTC(nextYear, month, day, ...time));
    }
    default:
      return null;
  }
}

function roundTo(amount, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

function currencyDecimals(app, currencyId) {
  try {
    return app.findRecordById("currencies", currencyId).getInt("decimals");
  } catch {
    return 2;
  }
}

// Mirrors convert()/ratesForDate() in src/lib/rates.ts: convert via the newest
// ECB snapshot published on or before `date`. Returns null when no rate is
// available so the caller can wait instead of storing a wrong base amount.
function convertToBase(app, amount, from, to, date) {
  if (from === to) return roundTo(amount, currencyDecimals(app, to));

  const rows = app.findRecordsByFilter("rates", "date <= {:date}", "-date", 1, 0, {
    date: formatDate(date),
  });
  if (rows.length === 0) return null;

  const rates = JSON.parse(rows[0].getString("rates") || "{}");
  const rateFrom = from === "eur" ? 1 : rates[from];
  const rateTo = to === "eur" ? 1 : rates[to];
  if (!rateFrom || !rateTo) return null;

  return roundTo((amount * rateTo) / rateFrom, currencyDecimals(app, to));
}

// The template's split rows, restricted to current members with a positive share.
function loadSplits(app, template, members) {
  const rows = app.findRecordsByFilter("recurring_splits", "recurring = {:id}", "", 0, 0, {
    id: template.id,
  });
  return rows
    .map((row) => ({ user: row.get("user"), percentage: row.getFloat("percentage") }))
    .filter((split) => members.includes(split.user) && split.percentage > 0);
}

function createExpense(app, template, group, splits, dueDate, baseAmount) {
  const expense = new Record(app.findCollectionByNameOrId("expenses"));
  expense.set("group", group.id);
  expense.set("title", template.get("title"));
  expense.set("amount", template.get("amount"));
  expense.set("currency", template.get("currency"));
  expense.set("baseAmount", baseAmount);
  expense.set("paidBy", template.get("paidBy"));
  expense.set("category", template.get("category"));
  expense.set("project", template.get("project"));
  expense.set("recurring", template.id);
  // Noon UTC on the due day, so the date reads as that day in every timezone
  // the app is realistically used from.
  expense.set("date", formatDate(new Date(dueDate.getTime() - (dueDate.getTime() % DAY_MS) + DAY_MS / 2)));
  app.save(expense);

  const splitsCollection = app.findCollectionByNameOrId("splits");
  for (const split of splits) {
    const record = new Record(splitsCollection);
    record.set("expense", expense.id);
    record.set("user", split.user);
    record.set("percentage", split.percentage);
    app.save(record);
  }

  return expense;
}

/**
 * Create every occurrence of one template that is due at `now`, advancing
 * `nextDate` past them and deactivating the template once `endDate` is
 * passed. Runs in a transaction so a failure (e.g. no exchange rate yet)
 * leaves the template untouched to be retried on the next tick.
 * Returns the number of expenses created.
 */
function materializeTemplate(app, template, now) {
  const group = app.findRecordById("groups", template.get("group"));
  const members = group.get("members") || [];
  const base = group.get("currency") || "sek";
  const currency = template.get("currency") || base;
  const amount = template.getFloat("amount");
  const frequency = template.get("frequency");
  // getInt() is 0 when the field is empty or does not exist yet.
  const interval = template.getInt("interval") || 1;

  if (!members.includes(template.get("paidBy"))) {
    throw new Error("payer is no longer a member of the group");
  }
  const splits = loadSplits(app, template, members);
  if (splits.length === 0) {
    throw new Error("no valid splits among current group members");
  }

  let nextDate = parseDate(template.getString("nextDate"));
  if (!nextDate) throw new Error("invalid nextDate");
  const anchor = parseDate(template.getString("startDate")) || nextDate;
  const endDate = parseDate(template.getString("endDate"));
  const ended = (date) => endDate != null && dayOf(date) > dayOf(endDate);

  let created = 0;
  app.runInTransaction((tx) => {
    while (nextDate <= now && !ended(nextDate) && created < MAX_CATCH_UP) {
      const baseAmount = convertToBase(tx, amount, currency, base, nextDate);
      if (baseAmount == null) {
        throw new Error(`no exchange rate for ${currency}->${base} on ${dayOf(nextDate)}`);
      }
      const expense = createExpense(tx, template, group, splits, nextDate, baseAmount);
      created++;

      const following = nextOccurrence(nextDate, anchor, frequency, interval);
      if (!following) throw new Error(`unknown frequency "${frequency}"`);
      nextDate = following;
    }

    template.set("nextDate", formatDate(nextDate));
    if (ended(nextDate)) template.set("active", false);
    tx.save(template);
  });

  return created;
}

/**
 * Materialize every active template whose `nextDate` is at or before `now`.
 * Failures are isolated per template and logged. Returns a summary.
 */
function materializeDueRecurringExpenses(app, now) {
  now = now || new Date();
  const due = app.findRecordsByFilter(
    "recurring_expenses",
    "active = true && nextDate <= {:now}",
    "nextDate",
    0,
    0,
    { now: formatDate(now) },
  );

  const summary = { due: due.length, created: 0, failed: 0 };
  for (const template of due) {
    try {
      summary.created += materializeTemplate(app, template, now);
    } catch (err) {
      summary.failed++;
      app
        .logger()
        .error("Failed to materialize recurring expense", "id", template.id, "error", String(err));
    }
  }
  return summary;
}

module.exports = {
  nextOccurrence,
  materializeTemplate,
  materializeDueRecurringExpenses,
};
