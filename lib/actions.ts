"use client";

import { arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, type DocumentReference, type WriteBatch } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { isInviteCode, makeInviteCode } from "@/lib/invite";
import { cleanName } from "@/lib/members";
import { addMonths, monthOf, todayIso, dueDate } from "@/lib/months";
import { makeExtraId, MAX_MEMBERS, type Settings } from "@/lib/group";
import { cleanOptions, MAX_QUESTION } from "@/lib/votes";
import { getApp, reportProblem } from "@/lib/store";
import type { Entry, EntryKind, Group, Invite, Meeting, Member, Vote } from "@/lib/types";

/*
  Every change StokvelBook makes to Firestore. firestore.rules checks each one on Google's
  servers: only the chairperson changes settings, members and roles; only officers (the
  chairperson and treasurer) add to the money book; nobody can change or delete an entry.

  Money entries, meetings and votes are not awaited: Firestore shows them straight away and
  sends them when it can, so they work offline. Starting, joining and deleting a group need a
  connection, so those are awaited and can fail with a message.

  Changes to settings, members and roles also add a line to the group's history (log), so
  everyone can see who changed what.
*/

const db = () => firebase().db;
const me = () => {
  const uid = getApp().uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};
const group = () => {
  const g = getApp().group;
  if (!g) throw new Error("No group");
  return g;
};
const groupRef = (id = group().id) => doc(db(), "groups", id);

/** For writes we don't wait for: tell the person if the server refuses one */
function quietly(promise: Promise<unknown>) {
  promise.catch(() => reportProblem("A change couldn't be saved. You may not be allowed to make it any more, or the connection dropped. Refresh to see the latest."));
}

/** Adds a line to the group's history in the same batch as the change it describes */
function logIn(batch: WriteBatch, text: string, groupId = group().id) {
  batch.set(doc(collection(db(), "groups", groupId, "log")), { text: text.slice(0, 200), by: me(), at: Date.now() });
}

/** Deletes many documents, 450 at a time (Firestore allows 500 changes in one batch), then `last` in the final batch */
async function deleteAll(refs: DocumentReference[], last: (batch: WriteBatch) => void) {
  const chunks: DocumentReference[][] = [];
  for (let i = 0; i < refs.length; i += 450) chunks.push(refs.slice(i, i + 450));
  if (chunks.length === 0) chunks.push([]);
  for (let c = 0; c < chunks.length; c++) {
    const batch = writeBatch(db());
    chunks[c].forEach((ref) => batch.delete(ref));
    if (c === chunks.length - 1) last(batch);
    await batch.commit();
  }
}

const myName = () => cleanName(getApp().profile.name) || "Me";
const newMember = (name: string, phone: string, account: boolean): Member => ({ name: cleanName(name) || "Someone", phone: phone.trim().slice(0, 20), joinedAt: Date.now(), account, left: false });

// ---------- Groups ----------

export async function createGroup(settings: Settings) {
  const uid = me();
  const ref = doc(collection(db(), "groups"));
  const code = makeInviteCode();
  const g: Omit<Group, "id" | "deleting"> = {
    ...settings,
    createdBy: uid,
    chairIds: [uid],
    treasurerIds: [uid],
    memberIds: [uid],
    members: { [uid]: newMember(myName(), "", true) },
    payoutOrder: [uid],
    inviteCode: code,
    createdAt: Date.now(),
  };
  const batch = writeBatch(db());
  batch.set(ref, g);
  batch.set(doc(db(), "invites", code), { groupId: ref.id, groupName: g.name, createdBy: uid } satisfies Invite);
  batch.set(doc(db(), "users", uid), { name: myName(), groups: arrayUnion(ref.id), current: ref.id }, { merge: true });
  await batch.commit();
  // The history needs the group to exist first (the rules check you're in it)
  const log = writeBatch(db());
  logIn(log, `Started ${g.name}`, ref.id);
  await log.commit().catch(() => {});
  return ref.id;
}

/** Looks up an invite code: which group it's for, or null if it doesn't work */
export async function readInvite(code: string): Promise<Invite | null> {
  if (!isInviteCode(code)) return null;
  try {
    const snap = await getDoc(doc(db(), "invites", code));
    return snap.exists() ? (snap.data() as Invite) : null;
  } catch {
    return null;
  }
}

export async function joinGroup(code: string) {
  const uid = me();
  const invite = await readInvite(code);
  if (!invite) throw new Error("This invite link doesn't work any more. Ask your chairperson for a new one.");
  const { profile } = getApp();
  if (!profile.groups.includes(invite.groupId)) {
    // Adds only yourself, as a member, at the end of the payout order.
    // The rules check that "lastInvite" is a real invite for this group.
    await updateDoc(groupRef(invite.groupId), {
      memberIds: arrayUnion(uid),
      [`members.${uid}`]: newMember(myName(), "", true),
      payoutOrder: arrayUnion(uid),
      lastInvite: code,
    });
    const log = writeBatch(db());
    logIn(log, `${myName()} joined the group`, invite.groupId);
    await log.commit().catch(() => {});
  }
  await setDoc(doc(db(), "users", uid), { name: myName(), groups: arrayUnion(invite.groupId), current: invite.groupId }, { merge: true });
  return invite;
}

/** The name of another group you're in (for the list on the Group page) */
export async function readGroupName(id: string): Promise<string | null> {
  try {
    const snap = await getDoc(groupRef(id));
    return snap.exists() ? String(snap.data()?.name ?? "") || null : null;
  } catch {
    return null;
  }
}

export function switchGroup(id: string) {
  quietly(setDoc(doc(db(), "users", me()), { current: id }, { merge: true }));
}

/** Takes a group off your list (after leaving it, or when it's gone) */
export function forgetGroup(id: string) {
  const { profile } = getApp();
  const rest = profile.groups.filter((g) => g !== id);
  quietly(setDoc(doc(db(), "users", me()), { groups: arrayRemove(id), current: rest[0] ?? null }, { merge: true }));
}

/** The chairperson changes the settings */
export function saveSettings(settings: Settings, changes: string) {
  const g = group();
  const batch = writeBatch(db());
  batch.update(groupRef(), settings);
  if (settings.name !== g.name) batch.update(doc(db(), "invites", g.inviteCode), { groupName: settings.name });
  logIn(batch, `Changed the settings: ${changes}`);
  quietly(batch.commit());
}

/** A new invite link. The old one stops working straight away. */
export async function newInviteLink() {
  const g = group();
  const code = makeInviteCode();
  const batch = writeBatch(db());
  batch.set(doc(db(), "invites", code), { groupId: g.id, groupName: g.name, createdBy: me() } satisfies Invite);
  batch.update(groupRef(), { inviteCode: code });
  batch.delete(doc(db(), "invites", g.inviteCode));
  logIn(batch, "Made a new invite link (the old one no longer works)");
  await batch.commit();
}

// ---------- Members ----------

/** The chairperson adds someone who doesn't have the app (a gogo, a member without a smartphone) */
export function addMember(name: string, phone: string) {
  const g = group();
  if (Object.keys(g.members).length >= MAX_MEMBERS) return reportProblem(`A group can have up to ${MAX_MEMBERS} members.`);
  const id = makeExtraId();
  const batch = writeBatch(db());
  batch.update(groupRef(), { [`members.${id}`]: newMember(name, phone, false), payoutOrder: arrayUnion(id) });
  logIn(batch, `Added ${cleanName(name)}`);
  quietly(batch.commit());
}

/** The chairperson changes the name or number of someone added by name */
export function editMember(id: string, name: string, phone: string) {
  const g = group();
  const m = g.members[id];
  if (!m || m.account) return;
  const batch = writeBatch(db());
  batch.update(groupRef(), { [`members.${id}`]: { ...m, name: cleanName(name) || m.name, phone: phone.trim().slice(0, 20) } });
  if (cleanName(name) && cleanName(name) !== m.name) logIn(batch, `Renamed ${m.name} to ${cleanName(name)}`);
  quietly(batch.commit());
}

/** Your own name and phone number in this group (and your name everywhere) */
export function setMyDetails(name: string, phone: string) {
  const uid = me();
  const clean = cleanName(name) || myName();
  quietly(updateDoc(groupRef(), { [`members.${uid}.name`]: clean, [`members.${uid}.phone`]: phone.trim().slice(0, 20) }));
  quietly(setDoc(doc(db(), "users", uid), { name: clean }, { merge: true }));
}

/**
 * Someone leaves the group. They're kept in the list of members (marked as left) so the money
 * book still shows their name, but they lose access, their roles and their place in the payout order.
 */
export function removeMember(id: string) {
  const g = group();
  const m = g.members[id];
  if (!m) return;
  const batch = writeBatch(db());
  if (m.account) {
    batch.update(groupRef(), {
      memberIds: arrayRemove(id),
      [`members.${id}.left`]: true,
      chairIds: arrayRemove(id),
      treasurerIds: arrayRemove(id),
      payoutOrder: arrayRemove(id),
    });
  } else {
    batch.update(groupRef(), { [`members.${id}.left`]: true, payoutOrder: arrayRemove(id) });
  }
  logIn(batch, `Removed ${m.name} from the group`);
  quietly(batch.commit());
}

export async function leaveGroup() {
  const uid = me();
  const g = group();
  const batch = writeBatch(db());
  logIn(batch, `${myName()} left the group`);
  batch.update(groupRef(), {
    memberIds: arrayRemove(uid),
    [`members.${uid}.left`]: true,
    chairIds: arrayRemove(uid),
    treasurerIds: arrayRemove(uid),
    payoutOrder: arrayRemove(uid),
  });
  await batch.commit();
  forgetGroup(g.id);
}

/** The chairperson makes someone a chairperson or treasurer, or takes it away */
export function setRole(id: string, role: "chair" | "treasurer", on: boolean) {
  const g = group();
  const field = role === "chair" ? "chairIds" : "treasurerIds";
  const batch = writeBatch(db());
  batch.update(groupRef(), { [field]: on ? arrayUnion(id) : arrayRemove(id) });
  const label = role === "chair" ? "a chairperson" : "a treasurer";
  logIn(batch, on ? `Made ${g.members[id]?.name || "someone"} ${label}` : `${g.members[id]?.name || "Someone"} is no longer ${label}`);
  quietly(batch.commit());
}

/** The chairperson sets whose turn is when (rotating stokvels) */
export function setPayoutOrder(order: string[], text: string) {
  const batch = writeBatch(db());
  batch.update(groupRef(), { payoutOrder: order });
  logIn(batch, text);
  quietly(batch.commit());
}

// ---------- The money book ----------

export type NewEntry = { kind: Exclude<EntryKind, "reversal">; memberId: string; month: string; amount: number; date: string; note: string };

/** Records a payment, payout or fine. It can never be changed or deleted afterwards, only cancelled. */
export function recordEntry(e: NewEntry) {
  const entry: Omit<Entry, "id"> = { ...e, note: e.note.trim().slice(0, 140), by: me(), createdAt: Date.now(), refId: "" };
  quietly(setDoc(doc(collection(db(), "groups", group().id, "entries")), entry));
}

/** Cancels a mistake with a reason. Both the entry and the correction stay in the book. */
export function reverseEntry(original: Entry, reason: string) {
  const entry: Omit<Entry, "id"> = {
    kind: "reversal",
    memberId: original.memberId,
    month: original.month,
    amount: original.amount,
    date: todayIso(),
    note: reason.trim().slice(0, 140),
    by: me(),
    createdAt: Date.now(),
    refId: original.id,
  };
  quietly(setDoc(doc(collection(db(), "groups", group().id, "entries")), entry));
}

// ---------- Meetings and votes ----------

export function saveMeeting(fields: Pick<Meeting, "date" | "title" | "notes">, existing?: Meeting) {
  const now = Date.now();
  const clean = { date: fields.date, title: cleanName(fields.title, 80) || "Meeting", notes: fields.notes.trim().slice(0, 3000) };
  const ref = existing ? doc(db(), "groups", group().id, "meetings", existing.id) : doc(collection(db(), "groups", group().id, "meetings"));
  quietly(setDoc(ref, existing ? { ...clean, by: existing.by, createdAt: existing.createdAt, updatedAt: now } : { ...clean, by: me(), createdAt: now, updatedAt: now }));
}

export function deleteMeeting(meeting: Meeting) {
  const batch = writeBatch(db());
  batch.delete(doc(db(), "groups", group().id, "meetings", meeting.id));
  logIn(batch, `Deleted the notes for "${meeting.title}"`);
  quietly(batch.commit());
}

export function startVote(question: string, options: string[]) {
  const vote: Omit<Vote, "id"> = { question: question.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION), options: cleanOptions(options), ballots: {}, by: me(), createdAt: Date.now(), closed: false };
  if (!vote.question || vote.options.length < 2) return;
  quietly(setDoc(doc(collection(db(), "groups", group().id, "votes")), vote));
}

export function castVote(vote: Vote, choice: number | null) {
  const uid = me();
  quietly(updateDoc(doc(db(), "groups", group().id, "votes", vote.id), { [`ballots.${uid}`]: choice === null ? deleteField() : choice }));
}

export function closeVote(vote: Vote) {
  quietly(updateDoc(doc(db(), "groups", group().id, "votes", vote.id), { closed: true }));
}

export function deleteVote(vote: Vote) {
  quietly(writeBatch(db()).delete(doc(db(), "groups", group().id, "votes", vote.id)).commit());
}

// ---------- Deleting ----------

/**
 * The chairperson deletes the group for everyone. The money book can't be deleted entry by
 * entry, so the group is first marked as being deleted (the rules only allow deleting entries
 * then), and then everything goes.
 */
export async function deleteGroupForEveryone(id = group().id) {
  const g = getApp().group?.id === id ? getApp().group : null;
  await updateDoc(groupRef(id), { deleting: true });
  const refs: DocumentReference[] = [];
  for (const name of ["entries", "log", "meetings", "votes"]) {
    const snap = await getDocs(collection(db(), "groups", id, name));
    snap.docs.forEach((d) => refs.push(d.ref));
  }
  const code = g?.inviteCode ?? String((await getDoc(groupRef(id))).data()?.inviteCode ?? "");
  await deleteAll(refs, (batch) => {
    if (code) batch.delete(doc(db(), "invites", code));
    batch.delete(groupRef(id));
  });
  forgetGroup(id);
}

// ---------- The demo ----------

const DEMO_PEOPLE = ["Thandi Mokoena", "Sipho Dlamini", "Lerato Khumalo", "Nomsa Zulu", "Bongani Nkosi", "Zanele Mthembu", "Kagiso Molefe"];

/**
 * "Try the demo": a made-up rotating stokvel of eight, four months in. Most months are paid,
 * Sipho is behind with a fine, Lerato has paid part of this month, one payment recorded twice
 * by mistake has been cancelled, the first turns have been paid out, and there's a meeting and
 * an open vote. The guest is the chairperson and treasurer, so they can try everything.
 */
export async function seedDemo() {
  const uid = me();
  const today = todayIso();
  const thisMonth = monthOf(today);
  const start = addMonths(thisMonth, -4);
  const extras = DEMO_PEOPLE.map((name) => ({ id: makeExtraId(), name }));
  const order = [extras[0].id, extras[1].id, extras[2].id, extras[3].id, uid, extras[4].id, extras[5].id, extras[6].id];
  const amount = 500_00;
  const ref = doc(collection(db(), "groups"));
  const code = makeInviteCode();
  const now = Date.now();

  const g: Omit<Group, "id" | "deleting"> = {
    name: "Ubuntu Savings Club",
    type: "rotating",
    amount,
    dueDay: 5,
    fine: 50_00,
    startMonth: start,
    yearEnd: addMonths(start, 7),
    createdBy: uid,
    chairIds: [uid],
    treasurerIds: [uid],
    memberIds: [uid],
    members: {
      [uid]: { name: myName() === "Guest" ? "You" : myName(), phone: "", joinedAt: now, account: true, left: false },
      ...Object.fromEntries(extras.map((x) => [x.id, { name: x.name, phone: "", joinedAt: now, account: false, left: false }])),
    },
    payoutOrder: order,
    inviteCode: code,
    createdAt: now,
  };
  const first = writeBatch(db());
  first.set(ref, g);
  first.set(doc(db(), "invites", code), { groupId: ref.id, groupName: g.name, createdBy: uid } satisfies Invite);
  first.set(doc(db(), "users", uid), { name: myName(), groups: arrayUnion(ref.id), current: ref.id }, { merge: true });
  await first.commit();

  // The rules check entries against the group as it is before a batch, so the group goes first
  const batch = writeBatch(db());
  const entries = collection(db(), "groups", ref.id, "entries");
  const add = (e: Omit<Entry, "id" | "by" | "createdAt" | "refId">, refId = "") => {
    const r = doc(entries);
    batch.set(r, { ...e, by: uid, createdAt: Date.now(), refId });
    return r.id;
  };
  const people = [uid, ...extras.map((x) => x.id)];
  const sipho = extras[1].id;
  const lerato = extras[2].id;
  for (let i = 0; i <= 4; i++) {
    const month = addMonths(start, i);
    const day = dueDate(month, 3);
    const dueThisMonth = i === 4;
    for (const id of people) {
      if (id === sipho && i >= 3) continue; // Sipho missed last month and this month
      if (dueThisMonth && today < day) continue; // this month's payments aren't in yet
      if (id === lerato && dueThisMonth) {
        add({ kind: "payment", memberId: id, month, amount: 200_00, date: day, note: "Will pay the rest on Friday" });
        continue;
      }
      add({ kind: "payment", memberId: id, month, amount, date: day, note: "" });
    }
    if (i < 4) add({ kind: "payout", memberId: order[i], month, amount: amount * people.length, date: dueDate(month, 10), note: "Paid by EFT" });
  }
  const twice = add({ kind: "payment", memberId: extras[3].id, month: addMonths(start, 2), amount, date: dueDate(addMonths(start, 2), 4), note: "" });
  add({ kind: "reversal", memberId: extras[3].id, month: addMonths(start, 2), amount, date: dueDate(addMonths(start, 2), 6), note: "Recorded twice by mistake" }, twice);
  add({ kind: "fine", memberId: sipho, month: addMonths(start, 3), amount: 50_00, date: dueDate(addMonths(start, 3), 6), note: "Late payment" });

  const meetings = collection(db(), "groups", ref.id, "meetings");
  batch.set(doc(meetings), {
    date: dueDate(addMonths(start, 3), 14),
    title: "Monthly meeting",
    notes:
      "Present: 7 of 8 members.\n\n- Treasurer's report: all paid except Sipho, who will catch up next month.\n- Agreed: payouts go by EFT on the 10th of each month.\n- Next meeting: the second Saturday of next month, at Thandi's house.",
    by: uid,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(doc(collection(db(), "groups", ref.id, "votes")), {
    question: "Should we have a year-end braai with part of the fines?",
    options: ["Yes", "No", "Use the fines for something else"],
    ballots: {},
    by: uid,
    createdAt: now,
    closed: false,
  });
  logIn(batch, `Started ${g.name}`, ref.id);
  logIn(batch, `Added ${DEMO_PEOPLE.length} members and set the payout order`, ref.id);
  await batch.commit();
}

/**
 * Deletes everything the signed-in person has: groups they chair are deleted for everyone,
 * other groups they leave, and then their profile. Used to end the demo.
 */
export async function deleteEverything() {
  const uid = me();
  const { profile } = getApp();
  for (const id of profile.groups) {
    const snap = await getDoc(groupRef(id)).catch(() => null);
    const data = snap?.data();
    if (!data) continue;
    if (Array.isArray(data.chairIds) && data.chairIds.includes(uid)) await deleteGroupForEveryone(id);
    else
      await updateDoc(groupRef(id), {
        memberIds: arrayRemove(uid),
        [`members.${uid}.left`]: true,
        treasurerIds: arrayRemove(uid),
        payoutOrder: arrayRemove(uid),
      }).catch(() => {});
  }
  await writeBatch(db()).delete(doc(db(), "users", uid)).commit();
}

export { isInviteCode };
