"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import SettingsForm from "@/components/SettingsForm";
import { createGroup } from "@/lib/actions";
import { codeFromInput } from "@/lib/invite";
import { addMonths, monthOf, todayIso } from "@/lib/months";
import { useApp } from "@/lib/store";

/*
  The first screen for someone who isn't in a group yet:
  start a new stokvel (you become its chairperson and treasurer), or join one with the invite
  link your chairperson sent you.
*/
export default function Welcome() {
  const { profile } = useApp();
  const router = useRouter();
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const thisMonth = monthOf(todayIso());

  function join(e: FormEvent) {
    e.preventDefault();
    const code = codeFromInput(link);
    if (!code) {
      setLinkError("That doesn't look like a StokvelBook invite link. Paste the whole link, or the 12-letter code.");
      return;
    }
    router.push(`/join?code=${code}`);
  }

  return (
    <div className="py-6">
      <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Hi {profile.name || "there"}! Let&apos;s open your stokvel&apos;s book.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Chairpersons: start your group and invite the members with a link. Members: open the link your chairperson sent you, or paste it here.
      </p>

      <div className="mt-10 grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-line bg-card p-6" aria-labelledby="start">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marker-soft text-marker">
            <Icon name="book" className="h-6 w-6" />
          </span>
          <h2 id="start" className="mt-4 text-xl font-extrabold">
            Start a stokvel
          </h2>
          <p className="mt-1 mb-5 text-sm text-ink-soft">You&apos;ll be its chairperson and treasurer. You can hand those roles to other members later.</p>
          <SettingsForm
            start={{ name: "", type: "rotating", amount: 0, dueDay: 7, fine: 0, startMonth: thisMonth, yearEnd: addMonths(thisMonth, 11) }}
            submitLabel="Start the stokvel"
            busyLabel="Starting…"
            onSave={async (s) => {
              await createGroup(s);
            }}
          />
        </section>

        <form onSubmit={join} className="rounded-2xl border border-line bg-card p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-soft text-amber">
            <Icon name="link" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold">Join with a link</h2>
          <label className="mt-4 block text-sm font-semibold">
            Invite link or code
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkError(null);
              }}
              placeholder="Paste it here"
              required
              className="field mt-1 font-normal"
            />
          </label>
          {linkError && (
            <p role="alert" className="mt-3 text-sm font-semibold text-alert">
              {linkError}
            </p>
          )}
          <button type="submit" className="btn-quiet mt-5 w-full">
            Join the stokvel
          </button>
        </form>
      </div>
    </div>
  );
}
