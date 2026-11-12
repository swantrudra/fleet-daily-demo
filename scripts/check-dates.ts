/**
 * Checks that "today"/"yesterday" follow India time whatever the server timezone is.
 * Run: npm run check:dates   (also try: TZ=UTC or TZ=America/New_York npm run check:dates)
 */
import assert from "node:assert/strict";
import { addDays, todayIST, yesterdayIST } from "../src/lib/date";

const cases: [string, string, string][] = [
  // [instant (UTC), expected IST today, expected IST yesterday]
  ["2026-11-11T19:00:00Z", "2026-11-12", "2026-11-11"], // 00:30 IST — just after midnight in India
  ["2026-11-11T18:29:59Z", "2026-11-11", "2026-11-10"], // 23:59:59 IST — still the 11th
  ["2026-11-11T18:30:00Z", "2026-11-12", "2026-11-11"], // 00:00 IST exactly
  ["2026-12-31T19:00:00Z", "2027-01-01", "2026-12-31"], // 00:30 IST on New Year
  ["2028-02-29T20:00:00Z", "2028-03-01", "2028-02-29"], // leap day
];

for (const [instant, today, yesterday] of cases) {
  const now = new Date(instant);
  assert.equal(todayIST(now), today, `todayIST(${instant})`);
  assert.equal(yesterdayIST(now), yesterday, `yesterdayIST(${instant})`);
}
assert.equal(addDays("2026-03-01", -1), "2026-02-28");
assert.equal(addDays("2026-11-12", -29), "2026-10-14");

const tz = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(`✓ ${cases.length} IST date checks passed (process timezone: ${tz})`);
