"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { memberBalance, memberName } from "@/lib/ledger";
import { dayName, monthName, todayIso } from "@/lib/months";
import { formatRand } from "@/lib/money";
import { roleOf } from "@/lib/group";
import { fileName, printedOn, statementCsv, statementRows } from "@/lib/statement";
import { useApp } from "@/lib/store";

/*
  /statement?member=…: one member's statement. Print it, or choose "Save as PDF" in the print
  window, for a clean page without the app's bars and buttons; or download it as a spreadsheet.
  Any member can see anyone's statement, like the rest of the book: that openness is the point.
*/
export default function StatementPage() {
  return (
    <Suspense>
      <Statement />
    </Suspense>
  );
}

function Statement() {
  const params = useSearchParams();
  const { group, entries, uid } = useApp();
  if (!group || !uid) return null;
  const id = params.get("member") ?? uid;
  const member = group.members[id];
  if (!member)
    return (
      <div className="py-10 text-center">
        <h1 className="text-2xl font-extrabold">That member isn&apos;t in this group</h1>
        <Link href="/group" className="btn-quiet mt-6">
          Back to the group
        </Link>
      </div>
    );
  const today = todayIso();
  const rows = statementRows(entries, id);
  const b = memberBalance(group, entries, id, today);

  function download() {
    if (!member) return;
    const url = URL.createObjectURL(new Blob([statementCsv(entries, id)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(member.name, "statement", today);
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <Link href="/group" className="btn-quiet text-sm">
          <Icon name="left" className="h-4 w-4" />
          Back
        </Link>
        <button type="button" onClick={() => window.print()} className="btn text-sm">
          <Icon name="print" className="h-4 w-4" />
          Print or save as PDF
        </button>
        <button type="button" onClick={download} className="btn-quiet text-sm">
          <Icon name="download" className="h-4 w-4" />
          Download (spreadsheet)
        </button>
      </div>

      <header className="border-b border-line pb-5">
        <p className="text-sm font-bold uppercase tracking-wider text-ink-soft">{group.name} · statement</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{member.name}</h1>
        <p className="mt-1 text-ink-soft">
          {roleOf(group, id)} · {monthName(group.startMonth)} to {monthName(group.yearEnd)} · {printedOn(today)}
        </p>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Total label="Paid in" value={formatRand(b.paid)} />
        <Total label="Due so far" value={formatRand(b.expected)} />
        <Total label="Fines" value={formatRand(b.fines)} />
        <Total label={b.behind ? "Behind" : b.ahead ? "Paid ahead" : "Balance"} value={formatRand(b.behind || b.ahead)} strong={b.behind > 0} />
      </dl>
      {b.received > 0 && <p className="mt-3 text-sm">Received in payouts: <strong>{formatRand(b.received)}</strong></p>}

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">Every payment, fine and payout for {member.name}, oldest first</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="py-2 pr-3">
              Date
            </th>
            <th scope="col" className="py-2 pr-3">
              What
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-ink-soft">
                Nothing recorded yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className={`border-b border-line ${r.cancelled ? "text-ink-soft line-through" : ""}`}>
              <td className="py-2 pr-3 whitespace-nowrap">{dayName(r.date)}</td>
              <td className="py-2 pr-3">
                {r.text}
                {r.cancelled && <span className="sr-only"> (cancelled)</span>}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.paidIn ? formatRand(r.paidIn) : r.out ? `${formatRand(r.out)} received` : `${formatRand(r.fine)} fine`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-ink-soft">
        Crossed-out lines were cancelled by an officer, with a reason in the group&apos;s history. Kept with StokvelBook; recorded by {memberName(group, group.treasurerIds[0] ?? group.createdBy)} and the group&apos;s officers.
      </p>
    </article>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className={`text-lg font-extrabold tabular-nums ${strong ? "text-alert" : ""}`}>{value}</dd>
    </div>
  );
}
