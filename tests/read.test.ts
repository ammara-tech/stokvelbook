import { describe, expect, it } from "vitest";
import { readEntry, readGroup, readVote } from "@/lib/read";

describe("reading data safely", () => {
  it("fills in a broken group with safe defaults", () => {
    const g = readGroup("g1", { name: 5, type: "lottery", amount: "lots", startMonth: "2026-11", yearEnd: "2026-01", createdBy: "me", members: { me: { name: "" }, x: "odd" } });
    expect(g.name).toBe("My stokvel");
    expect(g.type).toBe("rotating");
    expect(g.amount).toBe(0);
    expect(g.yearEnd).toBe("2026-11");
    expect(g.chairIds).toEqual(["me"]);
    expect(g.members.me).toEqual({ name: "Someone", phone: "", joinedAt: 0, account: true, left: false });
    expect(g.members.x.name).toBe("Someone");
  });

  it("reads entries and votes, whatever is sent", () => {
    const e = readEntry("e1", { kind: "steal", amount: -5, date: "yesterday", memberId: "me" });
    expect(e).toEqual({ id: "e1", kind: "payment", memberId: "me", month: "2026-01", amount: 0, date: "2026-01-01", note: "", by: "", createdAt: 0, refId: "" });
    const v = readVote("v1", { question: "", options: ["Yes", 2, "No"], ballots: { me: 0, odd: "yes" }, closed: "true" });
    expect(v.question).toBe("A vote");
    expect(v.options).toEqual(["Yes", "No"]);
    expect(v.ballots).toEqual({ me: 0 });
    expect(v.closed).toBe(false);
  });
});
