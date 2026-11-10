import { describe, expect, it } from "vitest";
import { inviteMessage, isPhone, reminderText, waNumber, whatsappLink } from "@/lib/reminders";

describe("WhatsApp reminders", () => {
  it("turns South African numbers into the international form", () => {
    expect(waNumber("082 123 4567")).toBe("27821234567");
    expect(waNumber("+27 82 123 4567")).toBe("27821234567");
    expect(waNumber("27821234567")).toBe("27821234567");
    expect(waNumber("12345")).toBe(null);
    expect(isPhone("")).toBe(true);
    expect(isPhone("abc")).toBe(false);
  });

  it("builds a wa.me link, or lets WhatsApp ask who to send it to", () => {
    expect(whatsappLink("082 123 4567", "Hi & bye")).toBe("https://wa.me/27821234567?text=Hi%20%26%20bye");
    expect(whatsappLink("", "Hi")).toBe("https://wa.me/?text=Hi");
  });

  it("writes a polite reminder", () => {
    const text = reminderText({ name: "Thabo Nkosi", group: "Ubuntu Club", behind: 550_00, month: "2026-11", dueDay: 5, today: "2026-11-10", from: "Ammara Badat" });
    expect(text).toBe(
      "Hi Thabo, a friendly reminder from Ubuntu Club: your contribution for November 2026 was due on 5 Nov 2026. You're R 550,00 behind at the moment. Please let me know once you've paid. Thank you! Ammara",
    );
    expect(reminderText({ name: "Thabo", group: "U", behind: 1, month: "2026-11", dueDay: 15, today: "2026-11-10", from: "A" })).toContain("is due on 15 Nov 2026");
    expect(inviteMessage("Ubuntu Club", "https://x/join?code=A")).toContain("https://x/join?code=A");
  });
});
