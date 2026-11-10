/*
  The shapes of StokvelBook's data in Firestore.

  users/{uid}                       your profile: name, which groups you're in, the one you're looking at
  invites/{code}                    an invite link: which group it's for
  groups/{id}                       a stokvel: its settings, members and roles
  groups/{id}/entries/{id}          the money book: payments, payouts, fines and corrections (never changed or deleted)
  groups/{id}/log/{id}              the group's other history: settings, members and roles changing
  groups/{id}/meetings/{id}         meeting notes
  groups/{id}/votes/{id}            votes on decisions

  Money is always in cents (whole numbers), months are "2026-11" and days are "2026-11-10".
*/

export type GroupType = "rotating" | "savings" | "grocery" | "burial";

export type Member = {
  name: string;
  phone: string; // for WhatsApp reminders; "" if not given
  joinedAt: number;
  account: boolean; // false: added by name by the chairperson (someone without the app)
  left: boolean; // they've left or were removed; kept so the history still shows their name
};

export type Group = {
  id: string;
  name: string;
  type: GroupType;
  amount: number; // each member's contribution a month, in cents
  dueDay: number; // the day of the month it's due (1 to 28)
  fine: number; // the late fine in cents, 0 for none
  startMonth: string; // the first month contributions are due
  yearEnd: string; // the last month of this cycle (savings and grocery stokvels share out after it)
  createdBy: string;
  chairIds: string[];
  treasurerIds: string[];
  memberIds: string[]; // people with an account who can open the group
  members: Record<string, Member>; // everyone, including people added by name and people who left
  payoutOrder: string[]; // rotating stokvels: whose turn is first, second, …
  inviteCode: string;
  createdAt: number;
  deleting?: boolean; // the chairperson is deleting the group for everyone
};

export type EntryKind = "payment" | "payout" | "fine" | "reversal";

export type Entry = {
  id: string;
  kind: EntryKind;
  memberId: string;
  month: string; // the month it's for
  amount: number; // cents, always positive
  date: string; // the day it happened
  note: string;
  by: string; // who recorded it
  createdAt: number;
  refId: string; // a reversal: the entry it cancels
};

export type LogItem = { id: string; text: string; by: string; at: number };

export type Meeting = { id: string; date: string; title: string; notes: string; by: string; createdAt: number; updatedAt: number };

export type Vote = {
  id: string;
  question: string;
  options: string[];
  ballots: Record<string, number>; // who voted for which option
  by: string;
  createdAt: number;
  closed: boolean;
};

export type Profile = { name: string; groups: string[]; current: string | null };

export type Invite = { groupId: string; groupName: string; createdBy: string };
