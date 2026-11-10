"use client";

import { useState, type FormEvent } from "react";
import { checkSettings, TYPES, type Settings, type SettingsInput } from "@/lib/group";
import { randInput } from "@/lib/money";
import type { GroupType } from "@/lib/types";

/*
  The group's settings: name, type, contribution, due day, late fine and the cycle's months.
  Used to start a group (Welcome) and by the chairperson to change it (Group page).
  checkSettings() in lib/group.ts checks it and explains what to fix.
*/
export default function SettingsForm({ start, submitLabel, busyLabel, onSave }: { start: Settings; submitLabel: string; busyLabel: string; onSave: (s: Settings) => Promise<void> | void }) {
  const [input, setInput] = useState<SettingsInput>({
    name: start.name,
    type: start.type,
    amount: start.amount ? randInput(start.amount) : "",
    dueDay: String(start.dueDay),
    fine: start.fine ? randInput(start.fine) : "",
    startMonth: start.startMonth,
    yearEnd: start.yearEnd,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof SettingsInput) => (e: { target: { value: string } }) => {
    setInput((s) => ({ ...s, [k]: e.target.value }));
    setError(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const checked = checkSettings(input);
    if (!checked.ok) return setError(checked.error);
    setBusy(true);
    try {
      await onSave(checked.settings);
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        The group&apos;s name
        <input value={input.name} onChange={set("name")} maxLength={40} required placeholder="e.g. Ubuntu Savings Club" className="field mt-1 font-normal" />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">Type of stokvel</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(TYPES) as GroupType[]).map((t) => (
            <label key={t} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${input.type === t ? "border-marker bg-marker-soft" : "border-line bg-card"}`}>
              <input type="radio" name="type" value={t} checked={input.type === t} onChange={set("type")} className="mt-1 accent-[var(--color-marker)]" />
              <span>
                <span className="block font-bold">{TYPES[t].label}</span>
                <span className="text-ink-soft">{TYPES[t].about}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          Each member pays a month (R)
          <input value={input.amount} onChange={set("amount")} inputMode="decimal" required placeholder="500" className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Due on day
          <input value={input.dueDay} onChange={set("dueDay")} type="number" min={1} max={28} required className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Late fine (R, 0 for none)
          <input value={input.fine} onChange={set("fine")} inputMode="decimal" placeholder="0" className="field mt-1 font-normal" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          First month
          <input value={input.startMonth} onChange={set("startMonth")} type="month" required className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Last month of this cycle
          <input value={input.yearEnd} onChange={set("yearEnd")} type="month" required className="field mt-1 font-normal" />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn w-full sm:w-auto">
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
