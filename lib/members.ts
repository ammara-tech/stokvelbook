/* Names, initials and colours for the people in a group */

export const MAX_NAME = 30;

/** A starting name from the sign-in: the Google name, or the start of the email address */
export function defaultName(user: { displayName?: string | null; email?: string | null }) {
  const fromGoogle = user.displayName?.trim().split(/\s+/)[0];
  if (fromGoogle) return fromGoogle.slice(0, MAX_NAME);
  const local = user.email?.split("@")[0]?.split(/[._+-]/)[0] ?? "";
  return local ? (local[0].toUpperCase() + local.slice(1)).slice(0, MAX_NAME) : "Me";
}

export const cleanName = (name: string, max = MAX_NAME) => name.replace(/\s+/g, " ").trim().slice(0, max);

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Each person keeps the same colour on every phone, worked out from their ID
const COLOURS = ["#17603f", "#b8473f", "#3d6fa8", "#475569", "#7a5aa6", "#b04a7c", "#2f7f8f", "#9a5b12"];

export function colourFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLOURS[h % COLOURS.length];
}
