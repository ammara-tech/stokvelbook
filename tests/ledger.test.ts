import { describe, expect, it } from "vitest";
import {
  activeMembers,
  behindMembers,
  currentMonth,
  dueMonths,
  effectiveEntries,
  entryChanges,
  entryText,
  groupTotals,
  memberBalance,
  monthStatus,
  moveInOrder,
  nextTurn,
  notInOrder,
  paidFor,
  rotation,
  yearEndShares,
} from "@/lib/ledger";
import { entry, makeGroup } from "./helpers";

const group = makeGroup();

describe("the money book", () => {
  it("leaves out corrections and the entries they cancel", () => {
    const wrong = entry({ amount: 500_00 });
    const fix = entry({ kind: "reversal", refId: wrong.id, note: "Recorded twice" });
    const right = entry({});
    expect(effectiveEntries([wrong, fix, right]).map((e) => e.id)).toEqual([right.id]);
    expect(paidFor([wrong, fix, right], "me", "2026-08")).toBe(500_00);
  });

  it("knows each member's status for a month", () => {
    const entries = [entry({ memberId: "me", month: "2026-11", amount: 500_00 }), entry({ memberId: "thabo", month: "2026-11", amount: 200_00 })];
    expect(monthStatus(group, entries, "me", "2026-11", "2026-11-10")).toBe("paid");
    expect(monthStatus(group, entries, "thabo", "2026-11", "2026-11-10")).toBe("part");
    expect(monthStatus(group, entries, "x-GOGO", "2026-11", "2026-11-10")).toBe("late");
    expect(monthStatus(group, entries, "x-GOGO", "2026-11", "2026-11-03")).toBe("due");
    expect(monthStatus(group, entries, "x-GOGO", "2026-12", "2026-11-10")).toBe("upcoming");
  });

  it("counts the months that are due so far, inside the cycle", () => {
    expect(dueMonths(group, "2026-11-04")).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(dueMonths(group, "2026-11-05")).toEqual(["2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(currentMonth(group, "2026-06-01")).toBe("2026-08");
    expect(currentMonth(group, "2027-05-01")).toBe("2027-01");
  });

  it("works out how far behind or ahead a member is, with fines added", () => {
    const entries = [
      entry({ memberId: "thabo", month: "2026-08" }),
      entry({ memberId: "thabo", month: "2026-09" }),
      entry({ memberId: "thabo", kind: "fine", amount: 50_00, month: "2026-10" }),
    ];
    const b = memberBalance(group, entries, "thabo", "2026-10-20");
    expect(b).toMatchObject({ paid: 1000_00, fines: 50_00, expected: 1500_00, behind: 550_00, ahead: 0 });
    const early = memberBalance(group, [entry({ month: "2026-08" }), entry({ month: "2026-09" })], "me", "2026-08-20");
    expect(early.ahead).toBe(500_00);
  });

  it("adds up the group: collected, paid out, in hand and this month", () => {
    const entries = [
      entry({ memberId: "me", month: "2026-11" }),
      entry({ memberId: "thabo", month: "2026-11" }),
      entry({ memberId: "x-GOGO", month: "2026-10" }),
      entry({ kind: "payout", memberId: "thabo", amount: 1500_00, month: "2026-08" }),
    ];
    const t = groupTotals(group, entries, "2026-11-10");
    expect(t).toMatchObject({ collected: 1500_00, paidOut: 1500_00, inHand: 0, month: "2026-11", members: 3, paidThisMonth: 2, collectedThisMonth: 1000_00, expectedThisMonth: 1500_00 });
  });

  it("lists who is behind, most behind first, and leaves out people who left", () => {
    const g = makeGroup({ members: { ...group.members, gone: { name: "Gone", phone: "", joinedAt: 4, account: true, left: true } } });
    const entries = [entry({ memberId: "me", month: "2026-08" })];
    const behind = behindMembers(g, entries, "2026-08-10");
    expect(behind.map((m) => m.id)).toEqual(["x-GOGO", "thabo"]);
    expect(activeMembers(g).map((m) => m.name)).toEqual(["Ammara", "Gogo Dlamini", "Thabo Nkosi"]);
  });
});

describe("rotating payouts", () => {
  it("gives each turn a month and the pot, and marks turns that were paid out", () => {
    const entries = [entry({ kind: "payout", memberId: "thabo", month: "2026-08", amount: 1500_00 })];
    const turns = rotation(group, entries);
    expect(turns.map((t) => [t.memberId, t.month, t.pot, t.done])).toEqual([
      ["thabo", "2026-08", 1500_00, true],
      ["me", "2026-09", 1500_00, false],
      ["x-GOGO", "2026-10", 1500_00, false],
    ]);
    expect(nextTurn(group, entries)?.memberId).toBe("me");
  });

  it("finds members missing from the order, and moves people up and down", () => {
    const g = makeGroup({ payoutOrder: ["thabo", "me"] });
    expect(notInOrder(g).map((m) => m.id)).toEqual(["x-GOGO"]);
    expect(moveInOrder(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveInOrder(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });
});

describe("year-end shares", () => {
  it("gives back what each member paid in, and shares fines equally", () => {
    const g = makeGroup({ type: "savings" });
    const entries = [
      entry({ memberId: "me", month: "2026-08" }),
      entry({ memberId: "thabo", month: "2026-08" }),
      entry({ memberId: "thabo", kind: "fine", amount: 30_00 }),
      entry({ memberId: "thabo", month: "2026-08", amount: 30_00 }),
    ];
    const shares = Object.fromEntries(yearEndShares(g, entries, "2026-08-10").map((s) => [s.id, s.share]));
    expect(shares).toEqual({ me: 510_00, "x-GOGO": 10_00, thabo: 510_00 });
  });
});

describe("what entries say", () => {
  it("describes payments, payouts, fines and corrections", () => {
    const p = entry({ memberId: "thabo", month: "2026-11" });
    expect(entryText(group, p)).toBe("R 500,00 from Thabo Nkosi for November 2026");
    expect(entryText(makeGroup({ type: "burial" }), entry({ kind: "payout", memberId: "thabo", amount: 5000_00 }))).toBe("R 5 000,00 claim paid to Thabo Nkosi");
    const fix = entry({ kind: "reversal", refId: p.id });
    expect(entryText(group, fix, [p, fix])).toBe("Cancelled: R 500,00 from Thabo Nkosi for November 2026");
  });

  it("tells you when someone else records something for you, but not your own changes", () => {
    const before = [entry({})];
    const mine = entry({ memberId: "me", by: "thabo", month: "2026-11" });
    const theirs = entry({ memberId: "thabo", by: "me" });
    expect(entryChanges(before, [...before, mine, theirs], group, "me")).toEqual(["Thabo Nkosi recorded your R 500,00 for November 2026"]);
    const fix = entry({ kind: "reversal", refId: mine.id, by: "thabo", note: "Wrong month" });
    expect(entryChanges([mine], [mine, fix], group, "me")).toEqual(["Thabo Nkosi cancelled an entry for you: Wrong month"]);
  });
});
