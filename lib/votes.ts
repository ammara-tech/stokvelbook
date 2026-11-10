import type { Vote } from "@/lib/types";

/*
  Votes on decisions ("Move the year-end party to 12 December?"). Each member has one vote,
  which they can change until an officer closes the vote. The rules on Google's servers only let
  you set your own vote. Tested in tests/votes.test.ts.
*/

export const MAX_QUESTION = 140;
export const MAX_OPTION = 40;

/** Cleans what was typed: trimmed, no empty or repeated options, 2 to 4 of them */
export function cleanOptions(options: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const o = raw.replace(/\s+/g, " ").trim().slice(0, MAX_OPTION);
    if (o && !seen.has(o.toLowerCase())) {
      seen.add(o.toLowerCase());
      out.push(o);
    }
  }
  return out.slice(0, 4);
}

/** How many voted for each option, who's winning, and whether it's a tie */
export function tally(vote: Pick<Vote, "options" | "ballots">, memberIds: string[]) {
  const counts = vote.options.map(() => 0);
  let votes = 0;
  for (const [uid, choice] of Object.entries(vote.ballots)) {
    if (!memberIds.includes(uid) || !Number.isInteger(choice) || choice < 0 || choice >= counts.length) continue;
    counts[choice] += 1;
    votes += 1;
  }
  const top = Math.max(0, ...counts);
  const leaders = counts.flatMap((c, i) => (c === top && top > 0 ? [i] : []));
  return { counts, votes, leader: leaders.length === 1 ? leaders[0] : null, tie: leaders.length > 1 };
}

/** "Yes won with 5 of 8 votes", "It's a tie", "No votes yet" */
export function resultText(vote: Pick<Vote, "options" | "ballots">, memberIds: string[]) {
  const t = tally(vote, memberIds);
  if (t.votes === 0) return "No votes yet";
  if (t.tie) return `It's a tie, with ${t.votes} vote${t.votes === 1 ? "" : "s"}`;
  return `${vote.options[t.leader!]}: ${t.counts[t.leader!]} of ${t.votes} vote${t.votes === 1 ? "" : "s"}`;
}
