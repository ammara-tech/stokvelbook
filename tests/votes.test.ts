import { describe, expect, it } from "vitest";
import { cleanOptions, resultText, tally } from "@/lib/votes";

describe("votes", () => {
  it("cleans the options: no empty or repeated ones, up to four", () => {
    expect(cleanOptions([" Yes ", "", "yes", "No", "Maybe", "Later", "Never"])).toEqual(["Yes", "No", "Maybe", "Later"]);
  });

  it("counts only current members' valid votes", () => {
    const vote = { options: ["Yes", "No"], ballots: { me: 0, thabo: 0, gone: 1, odd: 7 } };
    expect(tally(vote, ["me", "thabo", "odd"])).toEqual({ counts: [2, 0], votes: 2, leader: 0, tie: false });
    expect(resultText(vote, ["me", "thabo"])).toBe("Yes: 2 of 2 votes");
  });

  it("says when it's a tie, or nobody has voted", () => {
    expect(resultText({ options: ["Yes", "No"], ballots: { a: 0, b: 1 } }, ["a", "b"])).toBe("It's a tie, with 2 votes");
    expect(resultText({ options: ["Yes", "No"], ballots: {} }, ["a"])).toBe("No votes yet");
  });
});
