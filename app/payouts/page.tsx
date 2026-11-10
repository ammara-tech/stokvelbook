"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { EntryForm, type EntryStart } from "@/components/EntryForm";
import { setPayoutOrder } from "@/lib/actions";
import { effectiveEntries, groupTotals, memberName, moveInOrder, notInOrder, rotation, yearEndShares } from "@/lib/ledger";
import { dayName, monthName, monthOf, todayIso } from "@/lib/months";
import { formatRand } from "@/lib/money";
import { isChair, isOfficer, TYPES } from "@/lib/group";
import { useApp } from "@/lib/store";

/*
  /payouts: where the money goes, depending on the type of stokvel.
  - Rotating: the turns, one member a month in the payout order. The chairperson moves people
    up and down; officers record each payout when it's made.
  - Savings and grocery: each member's share at year end (what they paid in, plus an equal
    share of the fines, less anything already paid to them).
  - Burial society: the claims paid to members' families, and what's in hand for the next one.
*/
export default function PayoutsPage() {
  const { group, entries, uid } = useApp();
  const [recording, setRecording] = useState<EntryStart | null>(null);
  if (!group || !uid) return null;
  const today = todayIso();
  const officer = isOfficer(group, uid);
  const chair = isChair(group, uid);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold tracking-tight">{TYPES[group.type].payoutPage}</h1>
          <p className="mt-1 max-w-xl text-ink-soft">{TYPES[group.type].about}</p>
        </div>
        {officer && (
          <button type="button" onClick={() => setRecording({ kind: "payout", month: monthOf(today), amount: 0 })} className="btn">
            <Icon name="plus" className="h-4 w-4" />
            {group.type === "burial" ? "Record a claim" : "Record a payout"}
          </button>
        )}
      </div>

      {group.type === "rotating" && <Turns chair={chair} officer={officer} onRecord={setRecording} />}
      {(group.type === "savings" || group.type === "grocery") && (
        <section aria-labelledby="shares" className="mt-6">
          <h2 id="shares" className="text-xl font-extrabold">
            Shares after {monthName(group.yearEnd)}
          </h2>
          <div role="region" aria-label="Year-end shares" tabIndex={0} className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Each member&apos;s share at year end, so far</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="px-4 py-3">
                    Member
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Paid in
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Share of fines
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Share so far
                  </th>
                  {officer && <th scope="col" className="px-4 py-3"><span className="sr-only">Pay out</span></th>}
                </tr>
              </thead>
              <tbody>
                {yearEndShares(group, entries, today).map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      {s.id === uid ? "You" : s.name}
                    </th>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRand(s.own)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRand(s.fineShare)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatRand(s.share)}</td>
                    {officer && (
                      <td className="px-4 py-3 text-right">
                        {s.share > 0 && (
                          <button type="button" onClick={() => setRecording({ kind: "payout", memberId: s.id, month: group.yearEnd, amount: s.share, note: "Year-end share" })} className="btn-quiet px-3 py-1.5 text-sm">
                            Pay out
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-ink-soft">Shares grow as payments come in. Fines are shared equally between everyone still in the group.</p>
        </section>
      )}
      {group.type === "burial" && <Claims />}

      <EntryForm start={recording} onClose={() => setRecording(null)} />
    </div>
  );
}

function Turns({ chair, officer, onRecord }: { chair: boolean; officer: boolean; onRecord: (s: EntryStart) => void }) {
  const { group, entries, uid } = useApp();
  if (!group) return null;
  const turns = rotation(group, entries);
  const missing = notInOrder(group);
  const thisMonth = monthOf(todayIso());

  function move(id: string, by: -1 | 1) {
    if (!group) return;
    const next = moveInOrder(group.payoutOrder, id, by);
    setPayoutOrder(next, `Moved ${memberName(group, id)} ${by < 0 ? "up" : "down"} the payout order`);
  }

  return (
    <section aria-labelledby="turns" className="mt-6">
      <h2 id="turns" className="text-xl font-extrabold">
        The payout order
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Each month&apos;s pot is everyone&apos;s contribution: {turns[0] ? formatRand(turns[0].pot) : "R 0"}.</p>
      <ol className="mt-3 space-y-2">
        {turns.map((t, i) => {
          const now = t.month === thisMonth;
          return (
            <li key={t.memberId} className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 ${now && !t.done ? "border-amber" : "border-line"}`}>
              <span className="w-6 text-center font-extrabold tabular-nums text-ink-soft">{i + 1}</span>
              <Avatar uid={t.memberId} name={memberName(group, t.memberId)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.memberId === uid ? "You" : memberName(group, t.memberId)}</p>
                <p className="text-sm text-ink-soft">{monthName(t.month)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.done ? "bg-marker-soft text-marker" : now ? "bg-amber-soft text-amber" : "border border-line text-ink-soft"}`}>
                {t.done ? `Paid ${formatRand(t.paidOut)}` : now ? "This month" : t.month < thisMonth ? "Not paid out yet" : "Coming"}
              </span>
              {(officer || chair) && (
                <div className="flex gap-1">
                  {officer && !t.done && t.month <= thisMonth && (
                    <button type="button" onClick={() => onRecord({ kind: "payout", memberId: t.memberId, month: t.month, amount: t.pot })} className="btn-quiet px-3 py-1.5 text-sm">
                      Record payout
                    </button>
                  )}
                  {chair && (
                    <>
                      <button type="button" onClick={() => move(t.memberId, -1)} disabled={i === 0} className="tool disabled:opacity-30" aria-label={`Move ${memberName(group, t.memberId)} up`}>
                        <Icon name="up" className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => move(t.memberId, 1)} disabled={i === turns.length - 1} className="tool disabled:opacity-30" aria-label={`Move ${memberName(group, t.memberId)} down`}>
                        <Icon name="down" className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {missing.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm">
          <p className="font-semibold">Not in the payout order yet: {missing.map((m) => m.name).join(", ")}</p>
          {chair && (
            <button type="button" onClick={() => setPayoutOrder([...group.payoutOrder, ...missing.map((m) => m.id)], `Added ${missing.map((m) => m.name).join(", ")} to the payout order`)} className="btn-quiet mt-3 text-sm">
              Add them at the end
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Claims() {
  const { group, entries, uid } = useApp();
  if (!group) return null;
  const claims = effectiveEntries(entries).filter((e) => e.kind === "payout");
  const totals = groupTotals(group, entries, todayIso());
  return (
    <section aria-labelledby="claims" className="mt-6">
      <p className="rounded-2xl border border-line bg-card p-4">
        <span className="block text-sm font-semibold text-ink-soft">In hand for the next claim</span>
        <span className="text-2xl font-extrabold tabular-nums">{formatRand(totals.inHand)}</span>
      </p>
      <h2 id="claims" className="mt-6 text-xl font-extrabold">
        Claims paid
      </h2>
      {claims.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">No claims yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {claims.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
              <span className="font-semibold">
                {formatRand(c.amount)} to {c.memberId === uid ? "you" : memberName(group, c.memberId)}
              </span>
              <span className="block text-ink-soft">
                {dayName(c.date)}
                {c.note && ` · ${c.note}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
