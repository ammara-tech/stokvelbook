"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import SettingsForm from "@/components/SettingsForm";
import {
  addMember,
  deleteGroupForEveryone,
  editMember,
  leaveGroup,
  newInviteLink,
  readGroupName,
  removeMember,
  saveSettings,
  setMyDetails,
  setRole,
  switchGroup,
} from "@/lib/actions";
import { signOutUser } from "@/lib/auth";
import { endDemo } from "@/lib/demo";
import { activeMembers } from "@/lib/ledger";
import { inviteLink } from "@/lib/invite";
import { monthName } from "@/lib/months";
import { formatRand, shortRand } from "@/lib/money";
import { canLeave, canStepDown, isChair, roleOf, TYPES, type Settings } from "@/lib/group";
import { inviteMessage, isPhone } from "@/lib/reminders";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import type { Group } from "@/lib/types";

/*
  /group: everything about the group and you.
  - Your name and WhatsApp number in this group
  - The invite link: copy it, share it on WhatsApp, or (chairperson) make a new one
  - Members and roles: the chairperson adds people without the app by name, makes people
    chairpersons or treasurers, and removes people
  - The settings (the chairperson can change them; everyone can see them)
  - Statements for each member
  - Your other groups, leaving, deleting the group (chairperson) and signing out
*/
export default function GroupPage() {
  const { group, uid } = useApp();
  if (!group || !uid) return null;
  const chair = isChair(group, uid);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-ink-soft">
          {TYPES[group.type].label} stokvel · {shortRand(group.amount)} a month · {roleOf(group, uid)}
        </p>
      </div>
      <MyDetails />
      <Invite />
      <Members chair={chair} />
      <section aria-labelledby="settings" className="rounded-2xl border border-line bg-card p-5">
        <h2 id="settings" className="text-xl font-extrabold">
          Settings
        </h2>
        {chair ? (
          <div className="mt-4">
            <SettingsForm start={group} submitLabel="Save the settings" busyLabel="Saving…" onSave={(s) => saveSettings(s, describeChanges(group, s))} />
          </div>
        ) : (
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Type" value={TYPES[group.type].label} />
            <Row label="Each member pays" value={`${formatRand(group.amount)} a month`} />
            <Row label="Due on" value={`Day ${group.dueDay} of each month`} />
            <Row label="Late fine" value={group.fine ? formatRand(group.fine) : "None"} />
            <Row label="This cycle" value={`${monthName(group.startMonth)} to ${monthName(group.yearEnd)}`} />
            <p className="text-ink-soft sm:col-span-2">Only a chairperson can change these, and every change shows in the History.</p>
          </dl>
        )}
      </section>
      <Statements />
      <YouAndGroups chair={chair} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

/** "the contribution from R 500 to R 600, the due day from 5 to 7" for the history */
function describeChanges(before: Group, after: Settings) {
  const parts: string[] = [];
  if (after.name !== before.name) parts.push(`the name to "${after.name}"`);
  if (after.type !== before.type) parts.push(`the type to ${TYPES[after.type].label}`);
  if (after.amount !== before.amount) parts.push(`the contribution from ${shortRand(before.amount)} to ${shortRand(after.amount)}`);
  if (after.dueDay !== before.dueDay) parts.push(`the due day from ${before.dueDay} to ${after.dueDay}`);
  if (after.fine !== before.fine) parts.push(`the late fine from ${shortRand(before.fine)} to ${shortRand(after.fine)}`);
  if (after.startMonth !== before.startMonth || after.yearEnd !== before.yearEnd) parts.push(`the cycle to ${monthName(after.startMonth)} – ${monthName(after.yearEnd)}`);
  return parts.join(", ") || "no changes";
}

function MyDetails() {
  const { group, uid } = useApp();
  const me = group && uid ? group.members[uid] : null;
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Type your name.");
    if (!isPhone(phone)) return setError("That doesn't look like a phone number. Try one like 082 123 4567.");
    setMyDetails(name, phone);
    setSaved(true);
    setError(null);
  }
  return (
    <section aria-labelledby="me" className="rounded-2xl border border-line bg-card p-5">
      <h2 id="me" className="text-xl font-extrabold">
        You
      </h2>
      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm font-semibold">
          Your name
          <input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} maxLength={30} required className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          WhatsApp number <span className="font-normal text-ink-soft">(for reminders)</span>
          <input value={phone} onChange={(e) => (setPhone(e.target.value), setSaved(false))} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="082 123 4567" className="field mt-1 font-normal" />
        </label>
        <button type="submit" className="btn">
          {saved ? "Saved" : "Save"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      <p className="mt-2 text-sm text-ink-soft">Everyone in the group can see your number, so the treasurer can remind you on WhatsApp.</p>
    </section>
  );
}

function Invite() {
  const { group, uid } = useApp();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!group || !uid) return null;
  const link = inviteLink(origin, group.inviteCode);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is on screen to copy by hand */
    }
  }

  return (
    <section aria-labelledby="invite" className="rounded-2xl border border-line bg-card p-5">
      <h2 id="invite" className="text-xl font-extrabold">
        Invite members
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Anyone with this link can join as a member. Send it in your group&apos;s WhatsApp chat.</p>
      <p className="mt-3 break-all rounded-xl bg-page px-3 py-2 font-mono text-sm">{link}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-quiet text-sm">
          <Icon name="copy" className="h-4 w-4" />
          <span aria-live="polite">{copied ? "Copied!" : "Copy the link"}</span>
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(inviteMessage(group.name, link))}`} target="_blank" rel="noopener noreferrer" className="btn-quiet text-sm">
          <Icon name="whatsapp" className="h-4 w-4" />
          Share on WhatsApp
        </a>
        {isChair(group, uid) && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Make a new link? The old one stops working, so nobody can join with it any more.")) return;
              setBusy(true);
              await newInviteLink().catch(() => alert("Couldn't make a new link. Check your connection."));
              setBusy(false);
            }}
            className="btn-quiet text-sm"
          >
            <Icon name="refresh" className="h-4 w-4" />
            New link
          </button>
        )}
      </div>
    </section>
  );
}

function Members({ chair }: { chair: boolean }) {
  const { group, uid } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  if (!group || !uid) return null;
  const members = activeMembers(group);
  const left = Object.entries(group.members).filter(([, m]) => m.left);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Type their name.");
    if (!isPhone(phone)) return setError("That doesn't look like a phone number. Try one like 082 123 4567.");
    addMember(name, phone);
    setName("");
    setPhone("");
    setError(null);
  }

  return (
    <section aria-labelledby="members" className="rounded-2xl border border-line bg-card p-5">
      <h2 id="members" className="text-xl font-extrabold">
        Members ({members.length})
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {members.map((m) => {
          const isMe = m.id === uid;
          return (
            <li key={m.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar uid={m.id} name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.name}
                    {isMe && " (you)"}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {roleOf(group, m.id)}
                    {m.phone && ` · ${m.phone}`}
                  </p>
                </div>
                {chair && m.account && (
                  <div className="flex flex-wrap gap-2">
                    <RoleToggle id={m.id} role="chair" on={group.chairIds.includes(m.id)} disabled={group.chairIds.includes(m.id) && !canStepDown(group, m.id)} />
                    <RoleToggle id={m.id} role="treasurer" on={group.treasurerIds.includes(m.id)} />
                  </div>
                )}
                {chair && !m.account && (
                  <button type="button" onClick={() => setEditing(editing === m.id ? null : m.id)} className="tool" aria-label={`Change ${m.name}'s name or number`} aria-expanded={editing === m.id}>
                    <Icon name="pencil" className="h-4 w-4" />
                  </button>
                )}
                {chair && !isMe && (
                  <button
                    type="button"
                    onClick={() => confirm(`Remove ${m.name} from the group? Their payments stay in the history.`) && removeMember(m.id)}
                    className="tool hover:!text-alert"
                    aria-label={`Remove ${m.name}`}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                )}
              </div>
              {editing === m.id && <EditExtra id={m.id} name={m.name} phone={m.phone} onDone={() => setEditing(null)} />}
            </li>
          );
        })}
      </ul>
      {left.length > 0 && <p className="mt-2 text-sm text-ink-soft">Left the group: {left.map(([, m]) => m.name).join(", ")}. Their payments stay in the history.</p>}

      {chair && (
        <form onSubmit={add} className="mt-5 rounded-xl border border-dashed border-line p-4">
          <h3 className="font-bold">Add someone without the app</h3>
          <p className="mt-1 text-sm text-ink-soft">For members without a smartphone. The treasurer records their payments, and they appear in every list.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="field mt-1 font-normal" />
            </label>
            <label className="block text-sm font-semibold">
              Phone <span className="font-normal text-ink-soft">(optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="082 123 4567" className="field mt-1 font-normal" />
            </label>
            <button type="submit" className="btn">
              <Icon name="userPlus" className="h-4 w-4" />
              Add
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

function RoleToggle({ id, role, on, disabled }: { id: string; role: "chair" | "treasurer"; on: boolean; disabled?: boolean }) {
  const label = role === "chair" ? "Chairperson" : "Treasurer";
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      title={disabled ? "A group always needs a chairperson. Make someone else one first." : undefined}
      onClick={() => setRole(id, role, !on)}
      className={`rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-60 ${on ? "border-marker bg-marker-soft text-marker" : "border-line text-ink-soft hover:border-marker"}`}
    >
      {on && <span aria-hidden="true">✓ </span>}
      {label}
    </button>
  );
}

function EditExtra({ id, name, phone, onDone }: { id: string; name: string; phone: string; onDone: () => void }) {
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isPhone(p)) return setError("That doesn't look like a phone number.");
        editMember(id, n, p);
        onDone();
      }}
      className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <label className="block text-sm font-semibold">
        Name
        <input value={n} onChange={(e) => setN(e.target.value)} maxLength={30} required className="field mt-1 font-normal" />
      </label>
      <label className="block text-sm font-semibold">
        Phone
        <input value={p} onChange={(e) => setP(e.target.value)} inputMode="tel" maxLength={20} className="field mt-1 font-normal" />
      </label>
      <button type="submit" className="btn-quiet">
        Save
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-alert sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}

function Statements() {
  const { group, uid } = useApp();
  if (!group || !uid) return null;
  return (
    <section aria-labelledby="statements" className="rounded-2xl border border-line bg-card p-5">
      <h2 id="statements" className="text-xl font-extrabold">
        Statements
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Each member&apos;s payments, fines and payouts, to print, save as a PDF or download as a spreadsheet.</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {activeMembers(group).map((m) => (
          <li key={m.id}>
            <Link href={`/statement?member=${m.id}`} className="btn-quiet px-3 py-1.5 text-sm">
              {m.id === uid ? "Mine" : m.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function YouAndGroups({ chair }: { chair: boolean }) {
  const { group, uid, profile } = useApp();
  const auth = useAuth();
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const others = profile.groups.filter((id) => id !== group?.id);
  const othersKey = others.join(",");
  useEffect(() => {
    let live = true;
    Promise.all(othersKey.split(",").filter(Boolean).map(async (id) => [id, (await readGroupName(id)) ?? "A stokvel"] as const)).then((list) => live && setNames(Object.fromEntries(list)));
    return () => {
      live = false;
    };
  }, [othersKey]);
  if (!group || !uid) return null;
  const guest = auth.status === "signedIn" && auth.user.isAnonymous;

  async function leave() {
    if (!group || !uid) return;
    if (!canLeave(group, uid)) return alert("Make someone else a chairperson first: a group always needs one.");
    if (!confirm(`Leave ${group.name}? Your payments stay in its history, but you won't see the group any more.`)) return;
    setBusy(true);
    try {
      if (group.memberIds.length === 1) await deleteGroupForEveryone();
      else await leaveGroup();
      router.push("/");
    } catch {
      alert("Couldn't leave. Check your connection and try again.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!group) return;
    if (prompt(`This deletes ${group.name} and its whole history for every member, and can't be undone. Type the group's name to delete it.`)?.trim() !== group.name) return;
    setBusy(true);
    try {
      await deleteGroupForEveryone();
      router.push("/");
    } catch {
      alert("Couldn't delete the group. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="groups" className="rounded-2xl border border-line bg-card p-5">
      <h2 id="groups" className="text-xl font-extrabold">
        Your stokvels
      </h2>
      {others.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => switchGroup(id)} className="btn-quiet px-3 py-1.5 text-sm">
                Switch to {names[id] ?? "…"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/new" className="btn-quiet mt-3 text-sm">
        <Icon name="plus" className="h-4 w-4" />
        Start or join another stokvel
      </Link>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
        {guest ? (
          <button type="button" onClick={() => endDemo().catch(() => alert("Couldn't end the demo. Check your connection."))} className="btn-quiet text-sm">
            <Icon name="logout" className="h-4 w-4" />
            End the demo
          </button>
        ) : (
          <button type="button" onClick={() => signOutUser()} className="btn-quiet text-sm">
            <Icon name="logout" className="h-4 w-4" />
            Sign out
          </button>
        )}
        <button type="button" disabled={busy} onClick={leave} className="btn-quiet text-sm hover:!border-alert hover:!text-alert">
          Leave this stokvel
        </button>
        {chair && (
          <button type="button" disabled={busy} onClick={remove} className="btn-quiet text-sm text-alert hover:!border-alert">
            <Icon name="trash" className="h-4 w-4" />
            Delete it for everyone
          </button>
        )}
      </div>
    </section>
  );
}
