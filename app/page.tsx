"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import StatusChip from "@/components/StatusChip";
import { EntryForm, type EntryStart } from "@/components/EntryForm";
import { activeMembers, effectiveEntries, entryText, groupTotals, isReversed, memberBalance, monthStatus, nextTurn, paidFor, rotation, yearEndShares } from "@/lib/ledger";
import { dayName, dueDate, monthName, todayIso } from "@/lib/months";
import { formatRand, shortRand } from "@/lib/money";
import { isOfficer, TYPES } from "@/lib/group";
import { reminderText, whatsappLink } from "@/lib/reminders";
import { useApp } from "@/lib/store";

/*
  Home: how the stokvel is doing this month.
  - Your own month: paid or not, how far behind or ahead you are, and your payout turn or share
  - The group: money in hand, how many have paid this month, and the next payout
  - Everyone's status for this month. Officers can record a payment, add a late fine, or open
    WhatsApp with a polite reminder already written.
  - The latest entries in the money book
*/
export default function Home() {
  const { group, entries, uid, profile } = useApp();
  const [recording, setRecording] = useState<EntryStart | null>(null);
  if (!group || !uid) return null;
  const today = todayIso();
  const totals = groupTotals(group, entries, today);
  const month = totals.month;
  const officer = isOfficer(group, uid);
  const mine = memberBalance(group, entries, uid, today);
  const myStatus = monthStatus(group, entries, uid, month, today);
  const due = dueDate(month, group.dueDay);
  const members = activeMembers(group);
  const next = group.type === "rotating" ? nextTurn(group, entries) : null;
  const myTurn = group.type === "rotating" ? rotation(group, entries).find((t) => t.memberId === uid) : null;
  const myShare = group.type === "savings" || group.type === "grocery" ? yearEndShares(group, entries, today).find((s) => s.id === uid) : null;
  const latest = entries.slice(0, 5);
  const claims = effectiveEntries(entries).filter((e) => e.kind === "payout");

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-bold uppercase tracking-wider text-ink-soft">
            {TYPES[group.type].label} stokvel · {shortRand(group.amount)} a month
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{monthName(month)}</h1>
          <p className="mt-1 text-ink-soft">
            Contributions {due < today ? "were" : "are"} due on {dayName(due)}
            {group.fine > 0 && `, with a ${shortRand(group.fine)} fine if late`}.
          </p>
        </div>
        {officer && (
          <button type="button" onClick={() => setRecording({ month })} className="btn">
            <Icon name="plus" className="h-4 w-4" />
            Record money
          </button>
        )}
      </div>

      <section aria-labelledby="you" className="mt-6 rounded-2xl border border-line bg-card p-5">
        <h2 id="you" className="sr-only">
          You
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <Avatar uid={uid} name={profile.name || "Me"} size="h-11 w-11 text-sm" />
            <div>
              <p className="font-bold">Your {monthName(month)}</p>
              <StatusChip status={myStatus} />
            </div>
          </div>
          <p className="text-sm">
            <span className="block text-ink-soft">Paid in so far</span>
            <span className="text-xl font-extrabold tabular-nums">{formatRand(mine.paid)}</span>
          </p>
          <p className="text-sm">
            <span className="block text-ink-soft">{mine.behind ? "Behind" : mine.ahead ? "Paid ahead" : "Up to date"}</span>
            <span className={`text-xl font-extrabold tabular-nums ${mine.behind ? "text-alert" : "text-marker"}`}>{formatRand(mine.behind || mine.ahead)}</span>
          </p>
          {myTurn && (
            <p className="text-sm">
              <span className="block text-ink-soft">Your payout</span>
              <span className="text-xl font-extrabold">{myTurn.done ? "Paid to you" : monthName(myTurn.month)}</span>
            </p>
          )}
          {myShare && (
            <p className="text-sm">
              <span className="block text-ink-soft">Your share at year end</span>
              <span className="text-xl font-extrabold tabular-nums">{formatRand(myShare.share)}</span>
            </p>
          )}
          <Link href={`/statement?member=${uid}`} className="btn-quiet ml-auto text-sm">
            My statement
          </Link>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="In hand" value={formatRand(totals.inHand)} note={`${formatRand(totals.collected)} in, ${formatRand(totals.paidOut)} out`} />
        <Tile label="Paid this month" value={`${totals.paidThisMonth} of ${totals.members}`} note={`${formatRand(totals.collectedThisMonth)} of ${formatRand(totals.expectedThisMonth)}`} />
        {group.type === "rotating" && (
          <Tile label="Next payout" value={next ? (next.memberId === uid ? "You" : group.members[next.memberId]?.name.split(" ")[0] ?? "—") : "Everyone's had a turn"} note={next ? `${monthName(next.month)} · ${formatRand(next.pot)}` : "This cycle is done"} />
        )}
        {(group.type === "savings" || group.type === "grocery") && <Tile label="Shared out after" value={monthName(group.yearEnd)} note={group.type === "grocery" ? "for the year-end shop" : "everyone gets their share"} />}
        {group.type === "burial" && <Tile label="Claims paid" value={String(claims.length)} note={formatRand(claims.reduce((s, e) => s + e.amount, 0))} />}
        <Tile label="Members" value={String(members.length)} note={`${group.memberIds.length} with the app`} />
      </div>

      <section aria-labelledby="this-month" className="mt-8">
        <div className="flex items-center gap-3">
          <h2 id="this-month" className="mr-auto text-xl font-extrabold">
            Everyone this month
          </h2>
          <Link href="/money" className="text-sm font-semibold text-marker hover:underline">
            All months
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {members.map((m) => {
            const status = monthStatus(group, entries, m.id, month, today);
            const paid = paidFor(entries, m.id, month);
            const balance = memberBalance(group, entries, m.id, today);
            const hasFine = effectiveEntries(entries).some((e) => e.kind === "fine" && e.memberId === m.id && e.month === month);
            const remind = status !== "paid" && status !== "upcoming";
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <Avatar uid={m.id} name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.id === uid ? "You" : m.name}
                    {!m.account && <span className="ml-2 text-xs font-normal text-ink-soft">added by name</span>}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {paid > 0 ? `${formatRand(paid)} paid` : "Nothing yet"}
                    {balance.behind > 0 && <span className="text-alert"> · {formatRand(balance.behind)} behind in total</span>}
                  </p>
                </div>
                <StatusChip status={status} />
                {officer && (
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {status !== "paid" && (
                      <button type="button" onClick={() => setRecording({ kind: "payment", memberId: m.id, month, amount: Math.max(group.amount - paid, 1) })} className="btn-quiet px-3 py-1.5 text-sm">
                        Record payment
                      </button>
                    )}
                    {status === "late" && group.fine > 0 && !hasFine && (
                      <button type="button" onClick={() => setRecording({ kind: "fine", memberId: m.id, month, amount: group.fine, note: "Late payment" })} className="btn-quiet px-3 py-1.5 text-sm">
                        Add fine
                      </button>
                    )}
                    {remind && m.id !== uid && (
                      <a
                        href={whatsappLink(m.phone, reminderText({ name: m.name, group: group.name, behind: Math.max(balance.behind, group.amount - paid), month, dueDay: group.dueDay, today, from: profile.name }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-quiet px-3 py-1.5 text-sm"
                      >
                        <Icon name="whatsapp" className="h-4 w-4" />
                        Remind<span className="sr-only"> {m.name} on WhatsApp (opens WhatsApp)</span>
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="latest" className="mt-8">
        <div className="flex items-center gap-3">
          <h2 id="latest" className="mr-auto text-xl font-extrabold">
            Latest in the book
          </h2>
          <Link href="/history" className="text-sm font-semibold text-marker hover:underline">
            Full history
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">
            Nothing recorded yet. {officer ? "Press Record money when the first payments come in." : "The treasurer's entries will show here."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {latest.map((e) => (
              <li key={e.id} className={`rounded-xl border border-line bg-card px-4 py-3 text-sm ${e.kind !== "reversal" && isReversed(entries, e.id) ? "line-through opacity-70" : ""}`}>
                <span className="font-semibold">{entryText(group, e, entries)}</span>
                <span className="block text-ink-soft">
                  {dayName(e.date)}
                  {e.note && ` · ${e.note}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EntryForm start={recording} onClose={() => setRecording(null)} />
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <p className="rounded-2xl border border-line bg-card p-4">
      <span className="block text-sm font-semibold text-ink-soft">{label}</span>
      <span className="mt-1 block truncate text-2xl font-extrabold tabular-nums">{value}</span>
      <span className="block text-xs text-ink-soft">{note}</span>
    </p>
  );
}
