/*
  Months and days as plain text: "2026-11" and "2026-11-10". Text like this sorts in date order,
  means the same on every phone whatever its time zone, and is what the security rules check.
  Tested in tests/months.test.ts.
*/

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date where the person is, e.g. "2026-11-10" */
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const monthOf = (day: string) => day.slice(0, 7);

export const isMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
export const isDay = (s: string) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);

/** "2026-11" + 3 → "2027-02" (and backwards with a negative number) */
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** How many months from one to the other: "2026-11" to "2027-02" is 3 */
export function monthsBetween(from: string, to: string) {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** Every month from the first to the last, both included */
export function monthRange(first: string, last: string) {
  const n = monthsBetween(first, last);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addMonths(first, i));
}

/** The day a month's contribution is due: "2026-11" with day 7 → "2026-11-07" */
export const dueDate = (month: string, dueDay: number) => `${month}-${pad(Math.min(Math.max(dueDay, 1), 28))}`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11" → "November 2026" */
export function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-11" → "Nov 2026"; with short=true "Nov" */
export function monthShort(month: string, short = false) {
  const [y, m] = month.split("-").map(Number);
  return short ? MONTHS[m - 1].slice(0, 3) : `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "2026-11-07" → "7 Nov 2026" */
export function dayName(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "2026-11" → the 1 Nov day, for date inputs */
export const firstDay = (month: string) => `${month}-01`;
