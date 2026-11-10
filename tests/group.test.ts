import { describe, expect, it } from "vitest";
import { canLeave, canStepDown, checkSettings, groupChanges, isOfficer, makeExtraId, roleOf } from "@/lib/group";
import { makeGroup } from "./helpers";

const ok = { name: "  Ubuntu   Club ", type: "rotating" as const, amount: "500", dueDay: "5", fine: "50", startMonth: "2026-11", yearEnd: "2027-10" };

describe("group settings", () => {
  it("cleans good settings into cents", () => {
    expect(checkSettings(ok)).toEqual({ ok: true, settings: { name: "Ubuntu Club", type: "rotating", amount: 500_00, dueDay: 5, fine: 50_00, startMonth: "2026-11", yearEnd: "2027-10" } });
    const noFine = checkSettings({ ...ok, fine: "" });
    expect(noFine.ok && noFine.settings.fine).toBe(0);
  });

  it("explains what to fix", () => {
    expect(checkSettings({ ...ok, name: " " })).toMatchObject({ ok: false });
    expect(checkSettings({ ...ok, amount: "5" })).toMatchObject({ ok: false });
    expect(checkSettings({ ...ok, dueDay: "30" })).toMatchObject({ ok: false });
    expect(checkSettings({ ...ok, fine: "abc" })).toMatchObject({ ok: false });
    expect(checkSettings({ ...ok, yearEnd: "2026-10" })).toMatchObject({ ok: false });
    expect(checkSettings({ ...ok, yearEnd: "2029-12" })).toMatchObject({ ok: false });
  });
});

describe("roles", () => {
  const g = makeGroup({ chairIds: ["me"], treasurerIds: ["thabo"] });

  it("names each person's role", () => {
    expect(roleOf(g, "me")).toBe("Chairperson");
    expect(roleOf(g, "thabo")).toBe("Treasurer");
    expect(roleOf(g, "x-GOGO")).toBe("Added by name");
    expect(roleOf(makeGroup(), "me")).toBe("Chairperson and treasurer");
    expect(isOfficer(g, "thabo")).toBe(true);
    expect(isOfficer(g, "x-GOGO")).toBe(false);
  });

  it("always keeps a chairperson", () => {
    expect(canLeave(g, "me")).toBe(false);
    expect(canLeave(g, "thabo")).toBe(true);
    expect(canLeave(makeGroup({ memberIds: ["me"] }), "me")).toBe(true);
    expect(canStepDown(g, "me")).toBe(false);
    expect(canStepDown(makeGroup({ chairIds: ["me", "thabo"] }), "me")).toBe(true);
  });

  it("makes ids for people added by name that can't be an account", () => {
    expect(makeExtraId()).toMatch(/^x-[A-Z2-9]{10}$/);
  });

  it("tells you about people joining and your roles changing", () => {
    const before = makeGroup({ memberIds: ["me"], chairIds: ["thabo"], treasurerIds: [] });
    const after = makeGroup({ memberIds: ["me", "thabo"], chairIds: ["thabo", "me"], treasurerIds: [] });
    expect(groupChanges(before, after, "me")).toEqual(["Thabo Nkosi joined the group", "You're now a chairperson"]);
    expect(groupChanges(null, after, "me")).toEqual([]);
  });
});
