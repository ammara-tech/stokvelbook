import { effectiveEntries, isReversed, KIND_LABEL, memberName } from "@/lib/ledger";
import { dayName, monthName } from "@/lib/months";
import type { Entry, Group } from "@/lib/types";

/*
  Statements: a member's own record, and the whole money book as a spreadsheet (CSV).
  The statement page can be printed or saved as a PDF from the browser's Print button.
  Tested in tests/statement.test.ts.
*/

export type StatementRow = { id: string; date: string; text: string; paidIn: number; out: number; fine: number; cancelled: boolean };

/** A member's entries, oldest first. Cancelled entries are listed (crossed out) but don't count. */
export function statementRows(entries: Entry[], memberId: string): StatementRow[] {
  return entries
    .filter((e) => e.memberId === memberId && e.kind !== "reversal")
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((e) => ({
      id: e.id,
      date: e.date,
      text:
        e.kind === "payment"
          ? `Contribution for ${monthName(e.month)}`
          : e.kind === "payout"
            ? `Payout received`
            : `Fine${e.note ? `: ${e.note}` : ""}`,
      paidIn: e.kind === "payment" ? e.amount : 0,
      out: e.kind === "payout" ? e.amount : 0,
      fine: e.kind === "fine" ? e.amount : 0,
      cancelled: isReversed(entries, e.id),
    }));
}

/**
 * Makes a value safe in a spreadsheet: quoted, and with a ' in front of anything a spreadsheet
 * would run as a formula (= + - @), so a name like "=HYPERLINK(…)" stays plain text.
 */
export function csvCell(value: string | number) {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const rands = (cents: number) => (cents / 100).toFixed(2);

/** The whole money book as CSV, oldest first, including corrections */
export function bookCsv(group: Pick<Group, "members" | "type">, entries: Entry[]) {
  const rows = [["Date", "Type", "Member", "For month", "Amount (R)", "Note", "Recorded by", "Cancelled"]];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  for (const e of sorted) {
    rows.push([
      e.date,
      KIND_LABEL[e.kind],
      memberName(group, e.memberId),
      e.month,
      rands(e.amount),
      e.note,
      memberName(group, e.by),
      e.kind !== "reversal" && isReversed(entries, e.id) ? "Yes" : "",
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** One member's statement as CSV */
export function statementCsv(entries: Entry[], memberId: string) {
  const rows = [["Date", "What", "Paid in (R)", "Received (R)", "Fine (R)", "Cancelled"]];
  for (const r of statementRows(entries, memberId)) {
    rows.push([r.date, r.text, r.paidIn ? rands(r.paidIn) : "", r.out ? rands(r.out) : "", r.fine ? rands(r.fine) : "", r.cancelled ? "Yes" : ""]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** A file name like "thabo-statement-2026-11-10.csv" */
export function fileName(name: string, what: string, today: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stokvel";
  return `${slug}-${what}-${today}.csv`;
}

/** Totals for the top of a statement (cancelled entries left out) */
export function statementTotals(entries: Entry[], memberId: string) {
  const mine = effectiveEntries(entries).filter((e) => e.memberId === memberId);
  const total = (kind: Entry["kind"]) => mine.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0);
  return { paidIn: total("payment"), received: total("payout"), fines: total("fine") };
}

export const printedOn = (today: string) => `Printed on ${dayName(today)}`;
