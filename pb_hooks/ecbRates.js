/// <reference path="../pb_data/types.d.ts" />

// Shared helper for the ECB rate fetch. Kept in a plain (non-".pb.js") module
// so PocketBase does not auto-register it as a hook. It is loaded with
// require() from inside the cron/route handlers in exchangeRates.pb.js, because
// each handler runs in an isolated context and cannot see functions defined at
// the top level of a hook file.

const ECB_DAILY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

// Fetches the ECB euro reference rates and upserts one snapshot row per publish
// date into the `rates` collection. Returns { date, count }; throws on failure.
function fetchAndStoreRates(app) {
  const res = $http.send({ url: ECB_DAILY_URL, method: "GET", timeout: 30 });
  if (res.statusCode !== 200) {
    throw new Error("ECB request failed with status " + res.statusCode);
  }

  const xml = toString(res.body);

  const timeMatch = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/);
  if (!timeMatch) {
    throw new Error("Could not find rate date in ECB response");
  }
  const date = timeMatch[1];

  // EUR is the base and is not listed in the feed.
  const rates = { eur: 1 };
  const re = /currency=['"]([A-Za-z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const code = m[1].toLowerCase();
    const rate = parseFloat(m[2]);
    if (rate > 0) rates[code] = rate;
  }

  const count = Object.keys(rates).length;
  if (count <= 1) {
    throw new Error("Parsed no currency rates from ECB response");
  }

  // Upsert the snapshot for this date. PocketBase stores dates as
  // "YYYY-MM-DD 00:00:00.000Z", so match by the date prefix.
  let record;
  try {
    record = app.findFirstRecordByFilter("rates", "date ~ {:day}", { day: date });
  } catch {
    const collection = app.findCollectionByNameOrId("rates");
    record = new Record(collection);
  }
  record.set("date", date);
  record.set("base", "eur");
  record.set("rates", rates);
  app.save(record);

  return { date: date, count: count };
}

module.exports = { fetchAndStoreRates };
