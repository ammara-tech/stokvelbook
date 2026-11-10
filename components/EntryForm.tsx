"use client";

import { useState, type FormEvent } from "react";
import Dialog from "@/components/Dialog";
import { recordEntry, reverseEntry, type NewEntry } from "@/lib/actions";
import { activeMembers, entryText } from "@/lib/ledger";
import { isMonth, todayIso } from "@/lib/months";
import { formatRand, parseRand, randInput } from "@/lib/money";
import { useApp } from "@/lib/store";
import type { Entry } from "@/lib/types";

/*
  Recording money (officers only: the chairperson and treasurer). Once saved, an entry can't be
  changed or deleted, so the form says so; a mistake is cancelled with a correction instead.
  It works offline: the entry is saved on the phone and sent when there's signal.
*/

export type EntryStart = Partial<Pick<NewEntry, "kind" | "memberId" | "month" | "amount" | "note">>;

export function EntryForm({ start, onClose }: { start: EntryStart | null; onClose: () => void }) {
  const { group } = useApp();
  return (
    <Dialog open={Boolean(start)} title="Record money" onClose={onClose}>
      {start && group && <EntryFields key={JSON.stringify(start)} start={start} onDone={onClose} />}
    </Dialog>
  );
}

function EntryFields({ start, onDone }: { start: EntryStart; onDone: () => void }) {
  const { group } = useApp();
  const today = todayIso();
  const [kind, setKind] = useState<NewEntry["kind"]>(start.kind ?? "payment");
  const [memberId, setMemberId] = useState(start.memberId ?? "");
  const [month, setMonth] = useState(start.month ?? today.slice(0, 7));
  const [amount, setAmount] = useState(start.amount ? randInput(start.amount) : group ? randInput(group.amount) : "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState(start.note ?? "");
  const [error, setError] = useState<string | null>(null);
  if (!group) return null;
  const members = activeMembers(group);
  const payoutWord = group.type === "burial" ? "Claim paid" : "Payout";

  function save(e: FormEvent) {
    e.preventDefault();
    const cents = parseRand(amount);
    if (!memberId) return setError("Choose the member.");
    if (cents === null) return setError("Type the amount, like 500 or 250,50.");
    if (!isMonth(month)) return setError("Choose the month it's for.");
    if (!date) return setError("Choose the date.");
    recordEntry({ kind, memberId, month, amount: cents, date, note });
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold">What is it?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["payment", "Payment in"],
              ["payout", payoutWord],
              ["fine", "Fine"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-bold ${kind === k ? "border-marker bg-marker-soft text-marker" : "border-line"}`}>
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => {
                  setKind(k);
                  if (k === "fine" && group.fine) setAmount(randInput(group.fine));
                  if (k === "payment") setAmount(randInput(group.amount));
                }}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Member
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required className="field mt-1 font-normal">
          <option value="">Choose…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Amount (R)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          For the month
          <input value={month} onChange={(e) => setMonth(e.target.value)} type="month" required className="field mt-1 font-normal" />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Date it happened
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" max={today} required className="field mt-1 font-normal" />
      </label>
      <label className="block text-sm font-semibold">
        Note <span className="font-normal text-ink-soft">(optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="e.g. Paid by EFT" className="field mt-1 font-normal" />
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      <p className="text-sm text-ink-soft">Everyone in the group will see this. It can&apos;t be changed or deleted later, only cancelled with a reason.</p>
      <button type="submit" className="btn w-full">
        Save
      </button>
    </form>
  );
}

/** Cancelling a mistake: the entry and the correction both stay in the book */
export function ReverseForm({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { group, entries } = useApp();
  const [reason, setReason] = useState("");
  return (
    <Dialog open={Boolean(entry)} title="Cancel this entry?" onClose={onClose}>
      {entry && group && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return;
            reverseEntry(entry, reason);
            setReason("");
            onClose();
          }}
          className="space-y-4"
        >
          <p className="rounded-xl bg-page p-3 font-semibold">{entryText(group, entry, entries)}</p>
          <p className="text-sm text-ink-soft">
            It stays in the history, crossed out, with your reason next to it, so everyone can see what changed. It will no longer count towards {formatRand(entry.amount)} in the totals.
          </p>
          <label className="block text-sm font-semibold">
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={140} required placeholder="e.g. Recorded twice by mistake" className="field mt-1 font-normal" />
          </label>
          <button type="submit" className="btn w-full bg-alert">
            Cancel the entry
          </button>
        </form>
      )}
    </Dialog>
  );
}
