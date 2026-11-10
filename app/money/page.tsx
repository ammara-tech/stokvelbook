"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { EntryForm, type EntryStart } from "@/components/EntryForm";
import { activeMembers, cycleMonths, memberBalance, monthStatus, paidFor, type MonthStatus } from "@/lib/ledger";
import { monthName, monthShort, todayIso } from "@/lib/months";
import { formatRand, shortRand } from "@/lib/money";
import { isOfficer } from "@/lib/group";
import { bookCsv, fileName } from "@/lib/statement";
import { useApp } from "@/lib/store";

/*
  /money: every member, every month of the cycle, in one table, the way a treasurer's book looks.
  On a phone the table scrolls sideways, with the names kept in view. Officers can press any
  month that isn't fully paid to record a payment for it. The whole book downloads as a spreadsheet.
*/

const CELL: Record<MonthStatus, string> = {
  paid: "bg-marker-soft text-marker",
  part: "bg-amber-soft text-amber",
  late: "bg-alert-soft text-alert",
  due: "bg-teal-soft text-teal",
  upcoming: "text-ink-soft",
};
const MARK: Record<MonthStatus, string> = { paid: "✓", part: "½", late: "!", due: "•", upcoming: "–" };

export default function MoneyPage() {
  const { group, entries, uid } = useApp();
  const [recording, setRecording] = useState<EntryStart | null>(null);
  if (!group || !uid) return null;
  const today = todayIso();
  const months = cycleMonths(group);
  const members = activeMembers(group);
  const officer = isOfficer(group, uid);

  function download() {
    if (!group) return;
    const url = URL.createObjectURL(new Blob([bookCsv(group, entries)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(group.name, "book", today);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold tracking-tight">Contributions</h1>
          <p className="mt-1 text-ink-soft">
            {shortRand(group.amount)} a month from each member, {monthName(group.startMonth)} to {monthName(group.yearEnd)}.
          </p>
        </div>
        <button type="button" onClick={download} className="btn-quiet">
          <Icon name="download" className="h-4 w-4" />
          Download the book
        </button>
        {officer && (
          <button type="button" onClick={() => setRecording({})} className="btn">
            <Icon name="plus" className="h-4 w-4" />
            Record money
          </button>
        )}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="What the marks mean">
        {(Object.keys(MARK) as MonthStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-bold ${CELL[s]}`}>
              {MARK[s]}
            </span>
            {{ paid: "Paid", part: "Part paid", late: "Late", due: "Due this month", upcoming: "Not yet due" }[s]}
          </li>
        ))}
      </ul>

      <div role="region" aria-label="Contributions by member and month" tabIndex={0} className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Each member&apos;s contribution for each month. Officers can press a month to record a payment.</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-bold">
                Member
              </th>
              {months.map((m) => (
                <th key={m} scope="col" className="px-1 py-3 text-center text-xs font-bold text-ink-soft">
                  <abbr title={monthName(m)} className="no-underline">
                    {monthShort(m, true)}
                  </abbr>
                  <span className="block font-normal">{m.slice(2, 4)}</span>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-bold">
                Paid in
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold">
                Behind
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const balance = memberBalance(group, entries, member.id, today);
              return (
                <tr key={member.id} className="border-t border-line">
                  <th scope="row" className="sticky left-0 z-10 max-w-36 truncate bg-card px-4 py-2 text-left font-semibold">
                    {member.id === uid ? "You" : member.name}
                  </th>
                  {months.map((m) => {
                    const status = monthStatus(group, entries, member.id, m, today);
                    const paid = paidFor(entries, member.id, m);
                    const label = `${member.name}, ${monthName(m)}: ${{ paid: "paid", part: `${formatRand(paid)} paid`, late: "late", due: "due", upcoming: "not yet due" }[status]}`;
                    const cell = `inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold ${CELL[status]}`;
                    return (
                      <td key={m} className="px-1 py-2 text-center">
                        {officer && status !== "paid" && status !== "upcoming" ? (
                          <button
                            type="button"
                            onClick={() => setRecording({ kind: "payment", memberId: member.id, month: m, amount: group.amount - paid })}
                            className={`${cell} hover:ring-2 hover:ring-marker`}
                            aria-label={`${label}. Record a payment`}
                          >
                            {MARK[status]}
                          </button>
                        ) : (
                          <span className={cell} role="img" aria-label={label}>
                            {MARK[status]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right tabular-nums">{formatRand(balance.paid)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${balance.behind ? "font-bold text-alert" : "text-ink-soft"}`}>{balance.behind ? formatRand(balance.behind) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line">
              <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-bold">
                Collected
              </th>
              {months.map((m) => {
                const total = members.reduce((s, mem) => s + paidFor(entries, mem.id, m), 0);
                return (
                  <td key={m} className="whitespace-nowrap px-1 py-3 text-center text-xs font-semibold tabular-nums">
                    {total ? shortRand(total).replace("R ", "") : "–"}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right font-bold tabular-nums">{formatRand(members.reduce((s, mem) => s + memberBalance(group, entries, mem.id, today).paid, 0))}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-soft">The Collected row is in rand. Fines are added to what a member owes in Behind.</p>

      <EntryForm start={recording} onClose={() => setRecording(null)} />
    </div>
  );
}
