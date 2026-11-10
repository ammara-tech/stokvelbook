import { dueDate, monthOf, monthRange, monthName, addMonths } from "@/lib/months";
import { formatRand } from "@/lib/money";
import type { Entry, Group } from "@/lib/types";

/*
  The money book: everything StokvelBook works out from the group's entries.

  The entries are a history that's only ever added to. A mistake isn't edited or deleted: the
  treasurer adds a "reversal" that cancels it, with a reason, and both stay visible to everyone.
  So the rules on Google's servers can simply refuse every change and every delete, and no one,
  not even the chairperson, can quietly change what was paid.

  Tested in tests/ledger.test.ts.
*/

type GroupMoney = Pick<Group, "amount" | "dueDay" | "startMonth" | "yearEnd" | "members" | "payoutOrder" | "type">;

/** The entries that count: everything except reversals and the entries they cancel */
export function effectiveEntries(entries: Entry[]) {
  const cancelled = new Set(entries.filter((e) => e.kind === "reversal").map((e) => e.refId));
  return entries.filter((e) => e.kind !== "reversal" && !cancelled.has(e.id));
}

/** Has this entry been cancelled by a reversal? */
export const isReversed = (entries: Entry[], id: string) => entries.some((e) => e.kind === "reversal" && e.refId === id);

const sum = (list: Entry[]) => list.reduce((total, e) => total + e.amount, 0);

/** What a member paid towards one month */
export function paidFor(entries: Entry[], memberId: string, month: string) {
  return sum(effectiveEntries(entries).filter((e) => e.kind === "payment" && e.memberId === memberId && e.month === month));
}

/** The members still in the group (not those who left), by name */
export function activeMembers(group: Pick<Group, "members">) {
  return Object.entries(group.members)
    .filter(([, m]) => !m.left)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A member's name, even if they've left */
export const memberName = (group: Pick<Group, "members">, id: string) => group.members[id]?.name || "Someone";

/** The month the group is in now: today's month, kept inside the cycle */
export function currentMonth(group: Pick<Group, "startMonth" | "yearEnd">, today: string) {
  const m = monthOf(today);
  if (m < group.startMonth) return group.startMonth;
  if (m > group.yearEnd) return group.yearEnd;
  return m;
}

/** Every month in the cycle */
export const cycleMonths = (group: Pick<Group, "startMonth" | "yearEnd">) => monthRange(group.startMonth, group.yearEnd);

/** The months whose due date has passed (or is today) */
export function dueMonths(group: Pick<Group, "startMonth" | "yearEnd" | "dueDay">, today: string) {
  return cycleMonths(group).filter((m) => dueDate(m, group.dueDay) <= today);
}

export type MonthStatus = "paid" | "part" | "late" | "due" | "upcoming";

/**
 * One member, one month:
 *   paid      the full amount is in
 *   part      some of it is in
 *   late      nothing yet, and the due date has passed
 *   due       nothing yet, due later this month
 *   upcoming  a later month
 */
export function monthStatus(group: GroupMoney, entries: Entry[], memberId: string, month: string, today: string): MonthStatus {
  const paid = paidFor(entries, memberId, month);
  if (paid >= group.amount) return "paid";
  if (paid > 0) return "part";
  if (dueDate(month, group.dueDay) <= today) return "late";
  return month <= monthOf(today) ? "due" : "upcoming";
}

export const STATUS_LABEL: Record<MonthStatus, string> = {
  paid: "Paid",
  part: "Part paid",
  late: "Late",
  due: "Due",
  upcoming: "Not yet",
};

/**
 * Where a member stands: what they've paid, what was due so far, fines, payouts they've
 * received, and how far behind (or ahead) they are. Fines are added to what they owe.
 */
export function memberBalance(group: GroupMoney, entries: Entry[], memberId: string, today: string) {
  const mine = effectiveEntries(entries).filter((e) => e.memberId === memberId);
  const paid = sum(mine.filter((e) => e.kind === "payment"));
  const fines = sum(mine.filter((e) => e.kind === "fine"));
  const received = sum(mine.filter((e) => e.kind === "payout"));
  const expected = dueMonths(group, today).length * group.amount;
  const behind = Math.max(0, expected + fines - paid);
  const ahead = Math.max(0, paid - expected - fines);
  return { paid, fines, received, expected, behind, ahead };
}

/** The whole group: money collected, paid out, in hand, and how this month is going */
export function groupTotals(group: GroupMoney, entries: Entry[], today: string) {
  const live = effectiveEntries(entries);
  const collected = sum(live.filter((e) => e.kind === "payment"));
  const paidOut = sum(live.filter((e) => e.kind === "payout"));
  const month = currentMonth(group, today);
  const members = activeMembers(group);
  const paidThisMonth = members.filter((m) => paidFor(entries, m.id, month) >= group.amount).length;
  return {
    collected,
    paidOut,
    inHand: collected - paidOut,
    month,
    members: members.length,
    paidThisMonth,
    collectedThisMonth: sum(live.filter((e) => e.kind === "payment" && e.month === month)),
    expectedThisMonth: members.length * group.amount,
  };
}

/** Members behind on their payments, the most behind first */
export function behindMembers(group: GroupMoney, entries: Entry[], today: string) {
  return activeMembers(group)
    .map((m) => ({ ...m, behind: memberBalance(group, entries, m.id, today).behind }))
    .filter((m) => m.behind > 0)
    .sort((a, b) => b.behind - a.behind || a.name.localeCompare(b.name));
}

/**
 * A rotating stokvel's turns: each month one member gets the pot, in the payout order.
 * The pot is everyone's contribution for that month. A turn is done when a payout was recorded
 * for that member in that month.
 */
export function rotation(group: GroupMoney, entries: Entry[]) {
  const live = effectiveEntries(entries).filter((e) => e.kind === "payout");
  const order = group.payoutOrder.filter((id) => group.members[id] && !group.members[id].left);
  const pot = group.amount * activeMembers(group).length;
  return order.map((memberId, i) => {
    const month = addMonths(group.startMonth, i);
    const paidOut = sum(live.filter((e) => e.memberId === memberId && e.month === month));
    return { memberId, month, pot, paidOut, done: paidOut > 0 };
  });
}

/** The next turn still to be paid out, or null when everyone has had theirs */
export const nextTurn = (group: GroupMoney, entries: Entry[]) => rotation(group, entries).find((t) => !t.done) ?? null;

/** Active members who aren't in the payout order yet (people added after it was set) */
export const notInOrder = (group: GroupMoney) => activeMembers(group).filter((m) => !group.payoutOrder.includes(m.id));

/** Moves a member one place up (-1) or down (+1) in the payout order */
export function moveInOrder(order: string[], id: string, by: -1 | 1) {
  const i = order.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * Savings and grocery stokvels share out at year end. Each member gets back what they paid in,
 * less anything already paid out to them. Fines stay in the pot and are shared equally.
 */
export function yearEndShares(group: GroupMoney, entries: Entry[], today: string) {
  const members = activeMembers(group);
  const live = effectiveEntries(entries);
  const finesPaidIn = sum(live.filter((e) => e.kind === "fine"));
  const each = members.length ? Math.floor(finesPaidIn / members.length) : 0;
  return members.map((m) => {
    const b = memberBalance(group, entries, m.id, today);
    const own = Math.max(0, b.paid - b.fines);
    return { ...m, own, fineShare: each, share: Math.max(0, own + each - b.received) };
  });
}

// ---------- What an entry says ----------

export const KIND_LABEL: Record<Entry["kind"], string> = { payment: "Payment", payout: "Payout", fine: "Fine", reversal: "Correction" };

/** "R 500,00 from Thabo for November 2026" */
export function entryText(group: Pick<Group, "members" | "type">, entry: Entry, all: Entry[] = []): string {
  const who = memberName(group, entry.memberId);
  const money = formatRand(entry.amount);
  switch (entry.kind) {
    case "payment":
      return `${money} from ${who} for ${monthName(entry.month)}`;
    case "payout":
      return group.type === "burial" ? `${money} claim paid to ${who}` : `${money} paid out to ${who} (${monthName(entry.month)})`;
    case "fine":
      return `${money} fine for ${who} (${monthName(entry.month)})`;
    case "reversal": {
      const original = all.find((e) => e.id === entry.refId);
      return original ? `Cancelled: ${entryText(group, original)}` : `Cancelled an entry`;
    }
  }
}

/**
 * Messages for entries someone else just recorded that concern you:
 * "Thabo recorded your R 500,00 for November 2026".
 */
export function entryChanges(before: Entry[], after: Entry[], group: Pick<Group, "members" | "type">, me: string) {
  const known = new Set(before.map((e) => e.id));
  return after
    .filter((e) => !known.has(e.id) && e.by !== me)
    .flatMap((e) => {
      const by = memberName(group, e.by);
      if (e.kind === "payment" && e.memberId === me) return [`${by} recorded your ${formatRand(e.amount)} for ${monthName(e.month)}`];
      if (e.kind === "payout" && e.memberId === me) return [`${by} recorded a payout of ${formatRand(e.amount)} to you`];
      if (e.kind === "fine" && e.memberId === me) return [`${by} added a ${formatRand(e.amount)} fine`];
      if (e.kind === "reversal") {
        const original = after.find((x) => x.id === e.refId);
        if (original?.memberId === me) return [`${by} cancelled an entry for you: ${e.note || "no reason given"}`];
      }
      return [];
    });
}
