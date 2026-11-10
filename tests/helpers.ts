import type { Entry, Group } from "@/lib/types";

/* Made-up groups and entries for the tests */

export function makeGroup(over: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Ubuntu Savings Club",
    type: "rotating",
    amount: 500_00,
    dueDay: 5,
    fine: 50_00,
    startMonth: "2026-08",
    yearEnd: "2027-01",
    createdBy: "me",
    chairIds: ["me"],
    treasurerIds: ["me"],
    memberIds: ["me", "thabo"],
    members: {
      me: { name: "Ammara", phone: "", joinedAt: 1, account: true, left: false },
      thabo: { name: "Thabo Nkosi", phone: "082 123 4567", joinedAt: 2, account: true, left: false },
      "x-GOGO": { name: "Gogo Dlamini", phone: "", joinedAt: 3, account: false, left: false },
    },
    payoutOrder: ["thabo", "me", "x-GOGO"],
    inviteCode: "K7QXM2PA9WRT",
    createdAt: 1,
    ...over,
  };
}

let n = 0;
export function entry(over: Partial<Entry>): Entry {
  n += 1;
  return { id: `e${n}`, kind: "payment", memberId: "me", month: "2026-08", amount: 500_00, date: "2026-08-03", note: "", by: "me", createdAt: n, refId: "", ...over };
}
