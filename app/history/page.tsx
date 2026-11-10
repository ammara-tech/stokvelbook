"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { ReverseForm } from "@/components/EntryForm";
import { activeMembers, entryText, isReversed, KIND_LABEL, memberName } from "@/lib/ledger";
import { dayName, todayIso } from "@/lib/months";
import { isOfficer } from "@/lib/group";
import { useApp } from "@/lib/store";
import type { Entry } from "@/lib/types";

/*
  /history: everything that has happened in the group, newest first: every payment, payout,
  fine and correction, and every change to the settings, members and roles, each with who did
  it and when. Nothing here can be changed or deleted (firestore.rules refuses it), so this is
  what members can trust. Officers can cancel a mistake, which adds a correction with a reason.
*/

// Sorted by the day it happened (a payment can be recorded a few days later), then by when it was recorded
type Item = { day: string; at: number; key: string; kind: "entry"; entry: Entry } | { day: string; at: number; key: string; kind: "log"; text: string; by: string };

const when = (ms: number) => new Date(ms).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function HistoryPage() {
  const { group, entries, log, uid } = useApp();
  const [show, setShow] = useState<"all" | "money" | "group">("all");
  const [member, setMember] = useState("");
  const [cancelling, setCancelling] = useState<Entry | null>(null);
  if (!group || !uid) return null;
  const officer = isOfficer(group, uid);

  const items: Item[] = [
    ...(show === "group" ? [] : entries.filter((e) => !member || e.memberId === member).map((e) => ({ day: e.date, at: e.createdAt, key: e.id, kind: "entry" as const, entry: e }))),
    ...(show === "money" || member ? [] : log.map((l) => ({ day: todayIso(new Date(l.at)), at: l.at, key: l.id, kind: "log" as const, text: l.text, by: l.by }))),
  ].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at);

  const reversalOf = (id: string) => entries.find((e) => e.kind === "reversal" && e.refId === id);
  const by = (id: string) => (id === uid ? "you" : memberName(group, id));

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">History</h1>
      <p className="mt-1 max-w-2xl text-ink-soft">
        Every payment, payout and change, with who made it and when. Nothing here can be edited or deleted, not even by the chairperson. A mistake is cancelled with a reason, and both stay here.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Show" className="flex rounded-xl border border-line bg-card p-1">
          {(
            [
              ["all", "Everything"],
              ["money", "Money"],
              ["group", "Group changes"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${show === k ? "bg-marker text-on-marker" : "text-ink-soft hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
        {show !== "group" && (
          <label className="text-sm font-semibold">
            Member
            <select value={member} onChange={(e) => setMember(e.target.value)} className="field mt-1 py-2 font-normal">
              <option value="">Everyone</option>
              {activeMembers(group).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">Nothing to show yet.</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {items.map((item) => {
            if (item.kind === "log")
              return (
                <li key={item.key} className="flex gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm">
                  <Icon name="settings" className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
                  <span>
                    <span className="font-semibold">{item.text}</span>
                    <span className="block text-ink-soft">
                      By {by(item.by)} · {when(item.at)}
                    </span>
                  </span>
                </li>
              );
            const e = item.entry;
            const cancelled = e.kind !== "reversal" && isReversed(entries, e.id);
            const fix = cancelled ? reversalOf(e.id) : undefined;
            const tone = e.kind === "payment" ? "text-marker" : e.kind === "payout" ? "text-amber" : e.kind === "fine" ? "text-alert" : "text-ink-soft";
            return (
              <li key={item.key} className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`w-20 shrink-0 text-xs font-bold uppercase tracking-wider ${tone}`}>{KIND_LABEL[e.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`font-semibold ${cancelled ? "line-through opacity-70" : ""}`}>{entryText(group, e, entries)}</span>
                    <span className="block text-ink-soft">
                      {dayName(e.date)}
                      {e.note && ` · ${e.kind === "reversal" ? "Reason: " : ""}${e.note}`}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      Recorded by {by(e.by)} · {when(e.createdAt)}
                    </span>
                    {fix && (
                      <span className="mt-1 block text-xs font-semibold text-alert">
                        Cancelled by {by(fix.by)}: {fix.note}
                      </span>
                    )}
                  </span>
                  {officer && !cancelled && e.kind !== "reversal" && (
                    <button type="button" onClick={() => setCancelling(e)} className="btn-quiet px-3 py-1 text-xs">
                      <Icon name="undo" className="h-3.5 w-3.5" />
                      Cancel<span className="sr-only"> {entryText(group, e, entries)}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <ReverseForm entry={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}
