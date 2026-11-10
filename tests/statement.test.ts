import { describe, expect, it } from "vitest";
import { bookCsv, csvCell, fileName, statementCsv, statementRows, statementTotals } from "@/lib/statement";
import { entry, makeGroup } from "./helpers";

describe("statements", () => {
  const paid = entry({ memberId: "thabo", month: "2026-08", date: "2026-08-03" });
  const twice = entry({ memberId: "thabo", month: "2026-08", date: "2026-08-04" });
  const fix = entry({ memberId: "thabo", kind: "reversal", refId: twice.id, note: "Recorded twice", date: "2026-08-05" });
  const fine = entry({ memberId: "thabo", kind: "fine", amount: 50_00, note: "Late", date: "2026-09-06", month: "2026-09" });
  const all = [fine, fix, twice, paid];

  it("lists a member's entries oldest first, with cancelled ones marked", () => {
    const rows = statementRows(all, "thabo");
    expect(rows.map((r) => [r.date, r.text, r.cancelled])).toEqual([
      ["2026-08-03", "Contribution for August 2026", false],
      ["2026-08-04", "Contribution for August 2026", true],
      ["2026-09-06", "Fine: Late", false],
    ]);
    expect(statementTotals(all, "thabo")).toEqual({ paidIn: 500_00, received: 0, fines: 50_00 });
  });

  it("makes spreadsheets, safe from formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell('Say "hi"')).toBe(`"Say ""hi"""`);
    const book = bookCsv(makeGroup(), all);
    expect(book.split("\r\n")[0]).toBe('"Date","Type","Member","For month","Amount (R)","Note","Recorded by","Cancelled"');
    expect(book).toContain('"2026-08-04","Payment","Thabo Nkosi","2026-08","500.00","","Ammara","Yes"');
    expect(statementCsv(all, "thabo")).toContain('"2026-09-06","Fine: Late","","","50.00",""');
    expect(fileName("Thabo Nkosi!", "statement", "2026-11-10")).toBe("thabo-nkosi-statement-2026-11-10.csv");
  });
});
