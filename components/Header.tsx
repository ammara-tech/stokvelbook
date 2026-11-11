"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import Icon, { type IconName } from "@/components/Icon";
import Logo from "@/components/Logo";
import SyncBadge from "@/components/SyncBadge";
import ThemeToggle from "@/components/ThemeToggle";
import { TYPES } from "@/lib/group";
import { shortRand } from "@/lib/money";
import { useApp } from "@/lib/store";

/*
  The top of every page, like the front of a passbook:
  - a slim bar with the logo, whether it's live, the theme and you
  - the group's card: green with the gold shweshwe-style pattern, with the group's name, what
    kind of stokvel it is, the monthly amount and how many members it has. It opens the group page.
  - the pages: tabs under the card on a laptop or tablet, and a bar along the bottom of the screen
    on a phone, like a banking app, so they're always under your thumb.
  Meetings shows a number when there's a vote you haven't voted in.
*/
export default function Header() {
  const { group, profile, uid, votes } = useApp();
  const path = usePathname();
  if (!group) return null;
  const toVote = uid ? votes.filter((v) => !v.closed && !(uid in v.ballots)).length : 0;
  const members = Object.values(group.members).filter((m) => !m.left).length;
  const pages: { href: string; label: string; short: string; icon: IconName }[] = [
    { href: "/", label: "Home", short: "Home", icon: "home" },
    { href: "/money", label: "Contributions", short: "Money", icon: "coins" },
    { href: "/payouts", label: TYPES[group.type].payoutPage, short: TYPES[group.type].payoutPage, icon: "turns" },
    { href: "/history", label: "History", short: "History", icon: "history" },
    { href: "/meetings", label: "Meetings", short: "Meetings", icon: "vote" },
  ];
  const isCurrent = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const badge = toVote > 0 && (
    <span className="rounded-full bg-amber px-1.5 text-xs font-bold text-white dark:text-[#0c1510]">
      {toVote}
      <span className="sr-only"> to vote on</span>
    </span>
  );

  return (
    <>
      <header className="no-print">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="font-display flex items-center gap-2 text-xl" aria-label="StokvelBook: home">
            <Logo />
            <span>StokvelBook</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <SyncBadge />
            <ThemeToggle />
            {uid && (
              <Link href="/group" className="tool" aria-label="You and your group">
                <Avatar uid={uid} name={profile.name || "Me"} />
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4">
          <Link
            href="/group"
            className="shweshwe-soft group flex items-center gap-4 rounded-2xl p-4 text-cover-ink shadow-[0_18px_40px_-24px_rgba(14,59,40,0.9)] ring-1 ring-gold/40 sm:p-5"
            title="Group: members, roles, invite link and settings"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-[0.25em] text-gold">
                {TYPES[group.type].label} stokvel
              </span>
              <span className="font-display mt-1 block truncate text-2xl leading-tight sm:text-3xl">{group.name}</span>
              <span className="mt-1 block text-sm text-cover-soft">
                {shortRand(group.amount)} a month · {members} member{members === 1 ? "" : "s"}
              </span>
            </span>
            <span className="hidden shrink-0 items-center gap-1 rounded-full border border-gold/50 px-3 py-1.5 text-sm font-semibold text-gold group-hover:bg-white/10 sm:flex">
              Group
              <Icon name="chevron" className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Tablets and laptops: tabs under the card */}
        <nav aria-label="Pages" className="mx-auto mt-4 hidden max-w-5xl px-4 sm:block">
          <ul className="flex gap-1 border-b border-line">
            {pages.map((p) => {
              const current = isCurrent(p.href);
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={current ? "page" : undefined}
                    className={`-mb-px flex items-center gap-1.5 rounded-t-xl border px-3 py-2 text-sm font-bold md:px-4 ${
                      current ? "border-line border-b-card bg-card text-marker" : "border-transparent text-ink-soft hover:text-ink"
                    }`}
                  >
                    <Icon name={p.icon} className="h-4 w-4" />
                    {p.label}
                    {p.href === "/meetings" && badge}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Phones: a bar along the bottom */}
      <nav aria-label="Pages" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <ul className="flex">
          {pages.map((p) => {
            const current = isCurrent(p.href);
            return (
              <li key={p.href} className="flex-1">
                <Link
                  href={p.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-1 pb-2 pt-1.5 text-[11px] font-bold ${current ? "text-marker" : "text-ink-soft"}`}
                >
                  <span className={`relative flex h-7 w-12 items-center justify-center rounded-full ${current ? "bg-marker-soft" : ""}`}>
                    <Icon name={p.icon} className="h-5 w-5" />
                    {p.href === "/meetings" && toVote > 0 && <span className="absolute -right-1 -top-1">{badge}</span>}
                  </span>
                  <span className="max-w-full truncate">{p.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
