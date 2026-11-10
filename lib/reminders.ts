import { dueDate, dayName, monthName } from "@/lib/months";
import { formatRand } from "@/lib/money";

/*
  WhatsApp reminders. StokvelBook never sends anything itself: "Remind on WhatsApp" opens
  WhatsApp with a polite message already written, and the treasurer presses send. It's free,
  needs no paid messaging service, and the message comes from someone the member knows.
  Tested in tests/reminders.test.ts.
*/

/** A South African number in the international form WhatsApp wants: "082 123 4567" → "27821234567" */
export function waNumber(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (/^0\d{9}$/.test(digits)) return "27" + digits.slice(1);
  if (/^27\d{9}$/.test(digits)) return digits;
  if (/^\d{10,15}$/.test(digits)) return digits; // another country, already in international form
  return null;
}

/** A phone number someone typed is fine if it's empty or WhatsApp could use it */
export const isPhone = (phone: string) => phone.trim() === "" || waNumber(phone) !== null;

/** A wa.me link with the message. Without a number, WhatsApp asks who to send it to. */
export function whatsappLink(phone: string, text: string) {
  const number = waNumber(phone);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** The reminder for a member who is behind */
export function reminderText(o: { name: string; group: string; behind: number; month: string; dueDay: number; today: string; from: string }) {
  const due = dueDate(o.month, o.dueDay);
  const when = due < o.today ? `was due on ${dayName(due)}` : `is due on ${dayName(due)}`;
  return (
    `Hi ${firstName(o.name)}, a friendly reminder from ${o.group}: your contribution for ${monthName(o.month)} ${when}. ` +
    `You're ${formatRand(o.behind)} behind at the moment. Please let me know once you've paid. Thank you! ${firstName(o.from)}`
  );
}

/** The message for sharing an invite link */
export function inviteMessage(groupName: string, link: string) {
  return `Join "${groupName}" on StokvelBook to see our contributions, payouts and meetings: ${link}`;
}
