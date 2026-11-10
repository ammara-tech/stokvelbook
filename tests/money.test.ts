import { describe, expect, it } from "vitest";
import { formatRand, parseRand, randInput, shortRand } from "@/lib/money";

describe("rand amounts", () => {
  it("shows amounts the South African way", () => {
    expect(formatRand(125050)).toBe("R 1 250,50");
    expect(formatRand(-500)).toBe("-R 5,00");
    expect(shortRand(50000)).toBe("R 500");
    expect(shortRand(12550)).toBe("R 125,50");
  });

  it("reads what people type", () => {
    expect(parseRand("500")).toBe(50000);
    expect(parseRand("R 1 250,50")).toBe(125050);
    expect(parseRand("32.9")).toBe(3290);
    expect(parseRand("0")).toBe(null);
    expect(parseRand("abc")).toBe(null);
    expect(parseRand("200 000")).toBe(null);
    expect(randInput(50000)).toBe("500");
    expect(randInput(12550)).toBe("125,50");
  });
});
