/*
  Money in rand. It's kept in cents (whole numbers), so adding up never gives answers like
  R 0,30000000004. Tested in tests/money.test.ts.
*/

export const MAX_AMOUNT = 100_000_00; // R100 000 in one entry: anything more is a typing mistake

/** 3299 → "R 32,99", 125050 → "R 1 250,50" (South African style, the same on every phone) */
export function formatRand(cents: number) {
  const abs = Math.abs(Math.round(cents));
  const rands = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${cents < 0 ? "-" : ""}R ${rands},${String(abs % 100).padStart(2, "0")}`;
}

/** Like formatRand, but leaves off ",00": "R 500", "R 1 250,50" */
export function shortRand(cents: number) {
  const full = formatRand(cents);
  return full.endsWith(",00") ? full.slice(0, -3) : full;
}

/** "32,99", "32.99", "R32", "R 1 250,50" → cents, or null if it isn't an amount */
export function parseRand(text: string, max = MAX_AMOUNT): number | null {
  const t = text.trim().replace(/^R\s*/i, "").replace(/[\s ]/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(t)) return null;
  const cents = Math.round(Number(t.replace(",", ".")) * 100);
  return cents > 0 && cents <= max ? cents : null;
}

/** Cents back to what goes in a text box: 50000 → "500", 12550 → "125,50" */
export const randInput = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ","));
