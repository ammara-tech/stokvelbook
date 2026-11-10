import { describe, expect, it } from "vitest";
import { addMonths, dayName, dueDate, isDay, isMonth, monthName, monthRange, monthsBetween, monthShort, todayIso } from "@/lib/months";

describe("months and days", () => {
  it("adds and counts months across years", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2026-11", "2027-02")).toBe(3);
    expect(monthRange("2026-11", "2027-01")).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthRange("2027-01", "2026-11")).toEqual([]);
  });

  it("works out due dates, keeping the day between 1 and 28", () => {
    expect(dueDate("2026-11", 7)).toBe("2026-11-07");
    expect(dueDate("2026-02", 31)).toBe("2026-02-28");
  });

  it("checks months and days", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isDay("2026-11-10")).toBe(true);
    expect(isDay("2026-11-32")).toBe(false);
  });

  it("names them the South African way", () => {
    expect(monthName("2026-11")).toBe("November 2026");
    expect(monthShort("2026-11")).toBe("Nov 2026");
    expect(monthShort("2026-11", true)).toBe("Nov");
    expect(dayName("2026-11-07")).toBe("7 Nov 2026");
    expect(todayIso(new Date(2026, 10, 9))).toBe("2026-11-09");
  });
});
