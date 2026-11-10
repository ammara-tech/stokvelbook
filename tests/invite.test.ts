import { describe, expect, it } from "vitest";
import { ALPHABET, CODE_LENGTH, codeFromInput, inviteLink, isInviteCode, makeInviteCode } from "@/lib/invite";

describe("invite links", () => {
  it("makes 12-character codes from letters that can't be confused", () => {
    for (let i = 0; i < 50; i++) {
      const code = makeInviteCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isInviteCode(code)).toBe(true);
    }
    expect(ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("skips random values that would make some letters more likely", () => {
    // 255 is above the cut-off, so it's thrown away; 0 becomes "A", 1 becomes "B"
    const bytes = new Uint8Array([255, ...Array.from({ length: 23 }, (_, i) => i % 2)]);
    expect(makeInviteCode(() => bytes)).toBe("ABABABABABAB");
  });

  it("makes different codes each time", () => {
    const codes = new Set(Array.from({ length: 200 }, () => makeInviteCode()));
    expect(codes.size).toBe(200);
  });

  it("builds the link, and reads a code back from a pasted link or code", () => {
    const link = inviteLink("https://stokvelbook.example/", "K7QXM2PA9WRT");
    expect(link).toBe("https://stokvelbook.example/join?code=K7QXM2PA9WRT");
    expect(codeFromInput(link)).toBe("K7QXM2PA9WRT");
    expect(codeFromInput(" k7qx-m2pa-9wrt ")).toBe("K7QXM2PA9WRT");
    expect(codeFromInput("hello")).toBe(null);
    expect(codeFromInput("https://stokvelbook.example/join?code=SHORT")).toBe(null);
  });

});
