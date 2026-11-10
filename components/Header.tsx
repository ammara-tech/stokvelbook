"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import Icon, { type IconName } from "@/components/Icon";
import Logo from "@/components/Logo";
import SyncBadge from "@/components/SyncBadge";
import ThemeToggle from "@/components/ThemeToggle";
import { TYPES } from "@/lib/group";
import { useApp } from "@/lib/store";

/*
  The bar at the top: logo, which group you're in, whether it's live, the theme and you.
  Under it, the pages. Meetings shows a number when there's a vote you haven't voted in.
  On a phone the pages scroll sideways if they don't fit.
*/
export default function Header() {
  const { group, profile, uid, votes } = useApp();
  const path = usePathname();
  if (!group) return null;
  const toVote = uid ? votes.filter((v) => !v.closed && !(uid in v.ballots)).length : 0;
  const pages: { href: string; label: string; icon: IconName }[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/money", label: "Contributions", icon: "coins" },
    { href: "/payouts", label: TYPES[group.type].payoutPage, icon: "turns" },
    { href: "/history", label: "History", icon: "history" },
    { href: "/meetings", label: "Meetings", icon: "vote" },
  ];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight" aria-label="StokvelBook: home">
          <Logo />
          <span className="hidden min-[440px]:inline">StokvelBook</span>
        </Link>
        <Link
          href="/group"
          className="min-w-0 truncate rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-marker"
          title="Group: members, roles, invite link and settings"
        >
          {group.name}
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
      <nav aria-label="Pages" className="relative mx-auto max-w-5xl overflow-x-auto px-2">
        <ul className="flex min-w-max">
          {pages.map((p) => {
            const current = p.href === "/" ? path === "/" : path.startsWith(p.href);
            return (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-sm font-bold sm:px-4 ${current ? "border-marker text-marker" : "border-transparent text-ink-soft hover:text-ink"}`}
                >
                  <Icon name={p.icon} className="h-4 w-4" />
                  {p.label}
                  {p.href === "/meetings" && toVote > 0 && (
                    <span className="rounded-full bg-amber px-1.5 text-xs font-bold text-white dark:text-[#0f1713]">
                      {toVote}
                      <span className="sr-only"> to vote on</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
