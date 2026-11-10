import { ALPHABET } from "@/lib/invite";
import { isMonth, monthsBetween } from "@/lib/months";
import { MAX_AMOUNT, parseRand } from "@/lib/money";
import type { Group, GroupType } from "@/lib/types";

/*
  Who can do what in a group, and the group's settings.
  - The chairperson runs the group: settings, members, roles, the payout order, deleting it.
  - The treasurer keeps the money book: records payments, payouts, fines and corrections.
    (A chairperson can do that too. Small groups often have one person doing both.)
  - Members see everything: every payment, payout and change, and vote on decisions.
  firestore.rules checks the same things on Google's servers.
  Tested in tests/group.test.ts.
*/

export const MAX_MEMBERS = 60;
export const MAX_GROUP_NAME = 40;
export const MAX_CYCLE = 36; // months in one cycle

export const TYPES: Record<GroupType, { label: string; about: string; payoutPage: string }> = {
  rotating: { label: "Rotating", about: "Each month, one member gets everyone's contributions, in turn.", payoutPage: "Turns" },
  savings: { label: "Savings", about: "Everyone saves every month, and it's shared out at the end of the year.", payoutPage: "Year end" },
  grocery: { label: "Grocery", about: "Everyone saves every month, and it's spent on a big grocery shop at the end of the year.", payoutPage: "Year end" },
  burial: { label: "Burial society", about: "Everyone pays every month, and the group pays out when a member's family has a funeral.", payoutPage: "Claims" },
};

export const isChair = (group: Pick<Group, "chairIds"> | null, uid: string | null) => Boolean(group && uid && group.chairIds.includes(uid));
export const isTreasurer = (group: Pick<Group, "treasurerIds"> | null, uid: string | null) => Boolean(group && uid && group.treasurerIds.includes(uid));
/** Chairpersons and treasurers keep the money book */
export const isOfficer = (group: Pick<Group, "chairIds" | "treasurerIds"> | null, uid: string | null) => isChair(group, uid) || isTreasurer(group, uid);

/** "Chairperson", "Treasurer", "Chairperson and treasurer", "Member", "Added by name", "Left" */
export function roleOf(group: Pick<Group, "chairIds" | "treasurerIds" | "members">, id: string) {
  const m = group.members[id];
  if (!m || m.left) return "Left";
  if (!m.account) return "Added by name";
  const chair = group.chairIds.includes(id);
  const treasurer = group.treasurerIds.includes(id);
  if (chair && treasurer) return "Chairperson and treasurer";
  if (chair) return "Chairperson";
  if (treasurer) return "Treasurer";
  return "Member";
}

/** A chairperson can leave only if someone else is a chairperson too, or they're the last one in the group */
export function canLeave(group: Pick<Group, "chairIds" | "memberIds">, uid: string) {
  if (!group.chairIds.includes(uid)) return true;
  return group.memberIds.length === 1 || group.chairIds.some((id) => id !== uid);
}

/** A group always keeps at least one chairperson */
export const canStepDown = (group: Pick<Group, "chairIds">, uid: string) => group.chairIds.includes(uid) && group.chairIds.length > 1;

/** An id for someone added by name. It starts with "x-", so it can never be mistaken for an account. */
export function makeExtraId(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return "x-" + [...random(10)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type SettingsInput = { name: string; type: GroupType; amount: string; dueDay: string; fine: string; startMonth: string; yearEnd: string };
export type Settings = Pick<Group, "name" | "type" | "amount" | "dueDay" | "fine" | "startMonth" | "yearEnd">;

/** Checks the settings form. Returns the clean settings, or a message saying what to fix. */
export function checkSettings(input: SettingsInput): { ok: true; settings: Settings } | { ok: false; error: string } {
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, MAX_GROUP_NAME);
  if (!name) return { ok: false, error: "Give the group a name." };
  if (!(input.type in TYPES)) return { ok: false, error: "Choose the type of stokvel." };
  const amount = parseRand(input.amount);
  if (amount === null || amount < 10_00) return { ok: false, error: "The contribution should be an amount of at least R10, like 500." };
  const dueDay = Number(input.dueDay);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) return { ok: false, error: "The due day should be a day from 1 to 28." };
  const fine = input.fine.trim() === "" || input.fine.trim() === "0" ? 0 : parseRand(input.fine, 10_000_00);
  if (fine === null) return { ok: false, error: "The late fine should be an amount like 50, or 0 for none." };
  if (!isMonth(input.startMonth) || !isMonth(input.yearEnd)) return { ok: false, error: "Choose the first and last month." };
  const months = monthsBetween(input.startMonth, input.yearEnd);
  if (months < 0) return { ok: false, error: "The last month must be after the first month." };
  if (months >= MAX_CYCLE) return { ok: false, error: `A cycle can be up to ${MAX_CYCLE} months long.` };
  return { ok: true, settings: { name, type: input.type, amount: Math.min(amount, MAX_AMOUNT), dueDay, fine, startMonth: input.startMonth, yearEnd: input.yearEnd } };
}

/**
 * Messages for changes to the group that someone else made, shown as they happen:
 * "Thabo joined the group", "You're now the treasurer".
 */
export function groupChanges(before: Pick<Group, "memberIds" | "members" | "chairIds" | "treasurerIds"> | null, after: Pick<Group, "memberIds" | "members" | "chairIds" | "treasurerIds">, me: string) {
  if (!before) return [];
  const out: string[] = [];
  for (const id of after.memberIds) {
    if (id !== me && !before.memberIds.includes(id)) out.push(`${after.members[id]?.name || "Someone"} joined the group`);
  }
  if (after.chairIds.includes(me) && !before.chairIds.includes(me)) out.push("You're now a chairperson");
  if (!after.chairIds.includes(me) && before.chairIds.includes(me)) out.push("You're no longer a chairperson");
  if (after.treasurerIds.includes(me) && !before.treasurerIds.includes(me)) out.push("You're now a treasurer");
  if (!after.treasurerIds.includes(me) && before.treasurerIds.includes(me)) out.push("You're no longer a treasurer");
  return out;
}
