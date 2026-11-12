// All "business dates" are calendar dates in India (Asia/Kolkata), as YYYY-MM-DD strings.
//
// These helpers never depend on the timezone of the machine running them (Vercel runs in
// UTC, phones may be set to anything): todayIST() formats with timeZone "Asia/Kolkata",
// and addDays() does pure calendar maths on the date string.
//
// Example: 2026-11-11T19:00:00Z is 00:30 IST on 12 Nov, so
//   todayIST(new Date("2026-11-11T19:00:00Z"))     === "2026-11-12"  (UTC would say the 11th)
//   yesterdayIST(new Date("2026-11-11T19:00:00Z")) === "2026-11-11"
// Checked by: npm run check:dates  (scripts/check-dates.ts)

const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayIST(now: Date = new Date()): string {
  return IST_DATE.format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function yesterdayIST(now: Date = new Date()): string {
  return addDays(todayIST(now), -1);
}

/** "Tue, 10 Nov 2026" */
export function formatDate(date: string, locale = "en-IN"): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "10:42 am" in IST */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}
