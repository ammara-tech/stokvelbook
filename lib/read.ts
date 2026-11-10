import type { Entry, Group, GroupType, LogItem, Meeting, Member, Vote } from "@/lib/types";
import { isDay, isMonth } from "@/lib/months";

/*
  Reading documents from Firestore safely. The rules only let good data in, but an old version of
  the app, or a half-synced change, could still send something odd. These turn anything into the
  right shape with sensible defaults, so one broken document can never crash a page.
  Tested in tests/read.test.ts.
*/

type Data = Record<string, unknown>;

const text = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const int = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback);
const bool = (v: unknown) => v === true;
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const TYPES: GroupType[] = ["rotating", "savings", "grocery", "burial"];
const KINDS: Entry["kind"][] = ["payment", "payout", "fine", "reversal"];

function readMember(v: unknown): Member {
  const m = (v && typeof v === "object" ? v : {}) as Data;
  return { name: text(m.name, "Someone") || "Someone", phone: text(m.phone), joinedAt: int(m.joinedAt), account: m.account !== false, left: bool(m.left) };
}

export function readGroup(id: string, d: Data): Group {
  const membersRaw = d.members && typeof d.members === "object" ? (d.members as Data) : {};
  const members = Object.fromEntries(Object.entries(membersRaw).map(([k, v]) => [k, readMember(v)]));
  const startMonth = isMonth(text(d.startMonth)) ? text(d.startMonth) : "2026-01";
  const yearEnd = isMonth(text(d.yearEnd)) && text(d.yearEnd) >= startMonth ? text(d.yearEnd) : startMonth;
  const createdBy = text(d.createdBy);
  return {
    id,
    name: text(d.name, "My stokvel") || "My stokvel",
    type: TYPES.includes(d.type as GroupType) ? (d.type as GroupType) : "rotating",
    amount: Math.max(0, int(d.amount)),
    dueDay: Math.min(28, Math.max(1, int(d.dueDay, 1))),
    fine: Math.max(0, int(d.fine)),
    startMonth,
    yearEnd,
    createdBy,
    chairIds: strings(d.chairIds).length ? strings(d.chairIds) : createdBy ? [createdBy] : [],
    treasurerIds: strings(d.treasurerIds),
    memberIds: strings(d.memberIds),
    members,
    payoutOrder: strings(d.payoutOrder),
    inviteCode: text(d.inviteCode),
    createdAt: int(d.createdAt),
    deleting: bool(d.deleting),
  };
}

export function readEntry(id: string, d: Data): Entry {
  const date = isDay(text(d.date)) ? text(d.date) : "2026-01-01";
  return {
    id,
    kind: KINDS.includes(d.kind as Entry["kind"]) ? (d.kind as Entry["kind"]) : "payment",
    memberId: text(d.memberId),
    month: isMonth(text(d.month)) ? text(d.month) : date.slice(0, 7),
    amount: Math.max(0, int(d.amount)),
    date,
    note: text(d.note),
    by: text(d.by),
    createdAt: int(d.createdAt),
    refId: text(d.refId),
  };
}

export const readLog = (id: string, d: Data): LogItem => ({ id, text: text(d.text), by: text(d.by), at: int(d.at) });

export const readMeeting = (id: string, d: Data): Meeting => ({
  id,
  date: isDay(text(d.date)) ? text(d.date) : "2026-01-01",
  title: text(d.title, "Meeting") || "Meeting",
  notes: text(d.notes),
  by: text(d.by),
  createdAt: int(d.createdAt),
  updatedAt: int(d.updatedAt),
});

export function readVote(id: string, d: Data): Vote {
  const ballotsRaw = d.ballots && typeof d.ballots === "object" ? (d.ballots as Data) : {};
  return {
    id,
    question: text(d.question, "A vote") || "A vote",
    options: strings(d.options),
    ballots: Object.fromEntries(Object.entries(ballotsRaw).filter(([, v]) => typeof v === "number")) as Record<string, number>,
    by: text(d.by),
    createdAt: int(d.createdAt),
    closed: bool(d.closed),
  };
}
