"use client";

import { useState, type FormEvent } from "react";
import Dialog from "@/components/Dialog";
import Icon from "@/components/Icon";
import { castVote, closeVote, deleteMeeting, deleteVote, saveMeeting, startVote } from "@/lib/actions";
import { dayName, todayIso } from "@/lib/months";
import { isChair, isOfficer } from "@/lib/group";
import { cleanOptions, MAX_QUESTION, resultText, tally } from "@/lib/votes";
import { memberName } from "@/lib/ledger";
import { useApp } from "@/lib/store";
import type { Meeting, Vote } from "@/lib/types";

/*
  /meetings: decisions and what was said.
  - Votes: officers ask a question with 2 to 4 answers; every member with the app votes once
    and can change their vote until it's closed. Everyone sees the count as it happens.
  - Meeting notes: officers write them (who came, what was agreed); everyone can read them.
*/
export default function MeetingsPage() {
  const { group, votes, meetings, uid } = useApp();
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState<Meeting | "new" | null>(null);
  if (!group || !uid) return null;
  const officer = isOfficer(group, uid);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Meetings and votes</h1>
      <p className="mt-1 text-ink-soft">Decide things together, and keep a record of what was agreed.</p>

      <section aria-labelledby="votes" className="mt-6">
        <div className="flex items-center gap-3">
          <h2 id="votes" className="mr-auto text-xl font-extrabold">
            Votes
          </h2>
          {officer && (
            <button type="button" onClick={() => setAsking(true)} className="btn-quiet text-sm">
              <Icon name="plus" className="h-4 w-4" />
              Start a vote
            </button>
          )}
        </div>
        {votes.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">No votes yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {votes.map((v) => (
              <VoteCard key={v.id} vote={v} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="notes" className="mt-10">
        <div className="flex items-center gap-3">
          <h2 id="notes" className="mr-auto text-xl font-extrabold">
            Meeting notes
          </h2>
          {officer && (
            <button type="button" onClick={() => setEditing("new")} className="btn-quiet text-sm">
              <Icon name="plus" className="h-4 w-4" />
              Add notes
            </button>
          )}
        </div>
        {meetings.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">No meeting notes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {meetings.map((m) => (
              <li key={m.id} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="mr-auto">
                    <h3 className="text-lg font-extrabold">{m.title}</h3>
                    <p className="text-sm text-ink-soft">
                      {dayName(m.date)} · written by {m.by === uid ? "you" : memberName(group, m.by)}
                    </p>
                  </div>
                  {officer && (
                    <button type="button" onClick={() => setEditing(m)} className="tool" aria-label={`Edit the notes for ${m.title}`}>
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                  )}
                  {isChair(group, uid) && (
                    <button type="button" onClick={() => confirm(`Delete the notes for "${m.title}"?`) && deleteMeeting(m)} className="tool hover:!text-alert" aria-label={`Delete the notes for ${m.title}`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-line">{m.notes || "No notes written."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AskForm open={asking} onClose={() => setAsking(false)} />
      <MeetingForm meeting={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function VoteCard({ vote }: { vote: Vote }) {
  const { group, uid } = useApp();
  if (!group || !uid) return null;
  const t = tally(vote, group.memberIds);
  const mine = vote.ballots[uid];
  const officer = isOfficer(group, uid);
  return (
    <li className={`rounded-2xl border bg-card p-5 ${vote.closed ? "border-line" : "border-marker/50"}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{vote.closed ? "Closed" : "Open"}</p>
      <h3 className="mt-1 text-lg font-extrabold">{vote.question}</h3>
      <ul className="mt-4 space-y-2">
        {vote.options.map((o, i) => {
          const share = t.votes ? Math.round((t.counts[i] / t.votes) * 100) : 0;
          return (
            <li key={o}>
              <button
                type="button"
                disabled={vote.closed}
                aria-pressed={mine === i}
                onClick={() => castVote(vote, i)}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-sm ${mine === i ? "border-marker" : "border-line"} ${vote.closed ? "" : "hover:border-marker"}`}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-marker-soft" style={{ width: `${share}%` }} />
                <span className="relative flex gap-2">
                  <span className="flex-1 font-semibold">
                    {o}
                    {mine === i && <span className="ml-2 text-xs text-marker">your vote</span>}
                  </span>
                  <span className="tabular-nums text-ink-soft">
                    {t.counts[i]} vote{t.counts[i] === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm font-semibold" aria-live="polite">
        {resultText(vote, group.memberIds)}
        <span className="font-normal text-ink-soft"> · {group.memberIds.length - t.votes} still to vote</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!vote.closed && mine !== undefined && (
          <button type="button" onClick={() => castVote(vote, null)} className="btn-quiet px-3 py-1.5 text-sm">
            Take back my vote
          </button>
        )}
        {!vote.closed && officer && (
          <button type="button" onClick={() => closeVote(vote)} className="btn-quiet px-3 py-1.5 text-sm">
            Close the vote
          </button>
        )}
        {isChair(group, uid) && (
          <button type="button" onClick={() => confirm("Delete this vote?") && deleteVote(vote)} className="btn-quiet px-3 py-1.5 text-sm hover:!border-alert hover:!text-alert">
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

function AskForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Yes", "No", "", ""]);
  const [error, setError] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return setError("Type the question.");
    if (cleanOptions(options).length < 2) return setError("Give at least two different answers.");
    startVote(question, options);
    setQuestion("");
    setOptions(["Yes", "No", "", ""]);
    onClose();
  }
  return (
    <Dialog open={open} title="Start a vote" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Question
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={MAX_QUESTION} required placeholder="e.g. Move the year-end party to 12 December?" className="field mt-1 font-normal" />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Answers (2 to 4)</legend>
          {options.map((o, i) => (
            <input
              key={i}
              value={o}
              aria-label={`Answer ${i + 1}`}
              onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
              maxLength={40}
              placeholder={i < 2 ? "" : "Optional"}
              className="field"
            />
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn w-full">
          Start the vote
        </button>
      </form>
    </Dialog>
  );
}

function MeetingForm({ meeting, onClose }: { meeting: Meeting | "new" | null; onClose: () => void }) {
  return (
    <Dialog open={meeting !== null} title={meeting === "new" ? "Add meeting notes" : "Edit meeting notes"} onClose={onClose}>
      {meeting !== null && <MeetingFields key={meeting === "new" ? "new" : meeting.id} meeting={meeting === "new" ? undefined : meeting} onDone={onClose} />}
    </Dialog>
  );
}

function MeetingFields({ meeting, onDone }: { meeting?: Meeting; onDone: () => void }) {
  const [date, setDate] = useState(meeting?.date ?? todayIso());
  const [title, setTitle] = useState(meeting?.title ?? "Monthly meeting");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMeeting({ date, title, notes }, meeting);
        onDone();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required className="field mt-1 font-normal" />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} rows={8} placeholder={"Who came\nWhat was agreed\nThe next meeting"} className="field mt-1 font-normal" />
      </label>
      <button type="submit" className="btn w-full">
        Save the notes
      </button>
    </form>
  );
}
